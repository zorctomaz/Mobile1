import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { Conversation, Listing, Message, SYSTEM_SENDER_ID, User } from "../types";

/**
 * Backend layer, now backed by Firebase (Firestore + Authentication) so
 * data is shared across every device instead of living only on one phone's
 * AsyncStorage. Every screen goes through this module rather than touching
 * Firestore directly — that's what made this swap possible without
 * touching a single screen.
 */

function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "Uporabnik s tem e-poštnim naslovom že obstaja.";
    case "auth/invalid-email":
      return "E-poštni naslov ni veljaven.";
    case "auth/weak-password":
      return "Geslo je prešibko (vsaj 6 znakov).";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Napačen e-poštni naslov ali geslo.";
    case "auth/network-request-failed":
      return "Ni internetne povezave — preveri omrežje in poskusi znova.";
    default:
      return "Nekaj je šlo narobe. Poskusi znova.";
  }
}

function asError(e: unknown): Error {
  const code = (e as { code?: string } | null)?.code;
  return new Error(code ? authErrorMessage(code) : "Nekaj je šlo narobe.");
}

// ---------------------------------------------------------------------------
// Users & auth
// ---------------------------------------------------------------------------

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<User> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const credential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );
    const user: User = {
      id: credential.user.uid,
      name: name.trim(),
      email: normalizedEmail,
      createdAt: Date.now(),
      radishCount: 0,
    };
    await setDoc(doc(db, "users", user.id), user);
    return user;
  } catch (e) {
    throw asError(e);
  }
}

export async function loginUser(email: string, password: string): Promise<User> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const credential = await signInWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );
    const user = await getUserById(credential.user.uid);
    if (!user) throw new Error("Profil uporabnika ni bil najden.");
    return user;
  } catch (e) {
    throw asError(e);
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

/** Resolves once Firebase Auth's initial state is known (or on any later
 * change) — this both serves "who is logged in right now" on app start and
 * doubles as a plain refresh for an already-known session. */
export function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      unsubscribe();
      if (!fbUser) {
        resolve(null);
        return;
      }
      try {
        resolve(await getUserById(fbUser.uid));
      } catch {
        resolve(null);
      }
    });
  });
}

export async function updateUser(
  id: string,
  patch: Partial<Omit<User, "id">>
): Promise<User> {
  await updateDoc(doc(db, "users", id), patch);
  const updated = await getUserById(id);
  if (!updated) throw new Error("Uporabnik ne obstaja.");
  return updated;
}

export async function getUserById(id: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null;
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

const listingsCol = collection(db, "listings");

export async function getListings(): Promise<Listing[]> {
  const snap = await getDocs(query(listingsCol, orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Listing);
}

export async function getListingById(id: string): Promise<Listing | null> {
  const snap = await getDoc(doc(db, "listings", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Listing) : null;
}

export async function getListingsByOwner(ownerId: string): Promise<Listing[]> {
  const snap = await getDocs(query(listingsCol, where("ownerId", "==", ownerId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Listing)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createListing(
  data: Omit<Listing, "id" | "createdAt" | "status">
): Promise<Listing> {
  const payload = { ...data, createdAt: Date.now(), status: "available" as const };
  const ref = await addDoc(listingsCol, payload);
  return { id: ref.id, ...payload };
}

export async function setListingStatus(
  id: string,
  status: Listing["status"]
): Promise<void> {
  await updateDoc(doc(db, "listings", id), { status });
}

export async function deleteListing(id: string): Promise<void> {
  await deleteDoc(doc(db, "listings", id));
}

// ---------------------------------------------------------------------------
// Conversations & messages
// ---------------------------------------------------------------------------

const conversationsCol = collection(db, "conversations");

export async function getOrCreateConversation(
  listingId: string,
  userAId: string,
  userBId: string
): Promise<Conversation> {
  // Firestore can't query "array contains both of these" directly, but a
  // listing only ever has a handful of conversations, so filter by listing
  // + userAId (must be the caller — see firestore.rules, which can only
  // verify a list query against fields the query itself constrains) then
  // match the other participant client-side.
  const snap = await getDocs(
    query(
      conversationsCol,
      where("listingId", "==", listingId),
      where("participantIds", "array-contains", userAId)
    )
  );
  const existing = snap.docs.find((d) => {
    const c = d.data() as Omit<Conversation, "id">;
    return c.participantIds.includes(userAId) && c.participantIds.includes(userBId);
  });
  if (existing) return { id: existing.id, ...(existing.data() as Omit<Conversation, "id">) };

  const payload: Omit<Conversation, "id"> = {
    listingId,
    participantIds: [userAId, userBId],
    createdAt: Date.now(),
    lastMessageAt: Date.now(),
    tradeConfirmedBy: [],
  };
  const ref = await addDoc(conversationsCol, payload);
  return { id: ref.id, ...payload };
}

export async function getConversationsForUser(userId: string): Promise<Conversation[]> {
  const snap = await getDocs(
    query(conversationsCol, where("participantIds", "array-contains", userId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Conversation)
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const snap = await getDoc(doc(db, "conversations", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Conversation) : null;
}

function messagesCol(conversationId: string) {
  return collection(db, "conversations", conversationId, "messages");
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const snap = await getDocs(
    query(messagesCol(conversationId), orderBy("createdAt", "asc"))
  );
  return snap.docs.map(
    (d) => ({ id: d.id, conversationId, ...d.data() }) as Message
  );
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<Message> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Sporočilo ne more biti prazno.");

  const createdAt = Date.now();
  const ref = await addDoc(messagesCol(conversationId), {
    senderId,
    text: trimmed,
    createdAt,
  });
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessageAt: createdAt,
    lastMessagePreview: trimmed,
  });
  return { id: ref.id, conversationId, senderId, text: trimmed, createdAt };
}

export type ConfirmTradeResult = {
  conversation: Conversation;
  /** True only on the call that brings the second participant's
   * confirmation in — i.e. the trade just completed right now. */
  completed: boolean;
};

/**
 * Records that `userId` confirms the trade in `conversationId`. Once both
 * participants have confirmed, the listing is marked as traded and each
 * participant is awarded one radish 🫜. Runs as a transaction so two
 * near-simultaneous confirmations can't race each other.
 */
export async function confirmTrade(
  conversationId: string,
  userId: string
): Promise<ConfirmTradeResult> {
  const conversationRef = doc(db, "conversations", conversationId);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(conversationRef);
    if (!snap.exists()) throw new Error("Pogovor ne obstaja.");
    const conversation = { id: snap.id, ...(snap.data() as Omit<Conversation, "id">) };

    if (!conversation.participantIds.includes(userId)) {
      throw new Error("Nisi udeležen/-a v tem pogovoru.");
    }

    const alreadyConfirmed = conversation.tradeConfirmedBy.includes(userId);
    const tradeConfirmedBy = alreadyConfirmed
      ? conversation.tradeConfirmedBy
      : [...conversation.tradeConfirmedBy, userId];

    if (!alreadyConfirmed) {
      tx.update(conversationRef, { tradeConfirmedBy });
    }

    const bothConfirmed = conversation.participantIds.every((id) =>
      tradeConfirmedBy.includes(id)
    );

    return {
      conversation: { ...conversation, tradeConfirmedBy },
      completed: !alreadyConfirmed && bothConfirmed,
    };
  });

  if (!result.completed) return result;

  await setListingStatus(result.conversation.listingId, "traded");
  for (const participantId of result.conversation.participantIds) {
    const participant = await getUserById(participantId);
    if (participant) {
      await updateUser(participantId, {
        radishCount: (participant.radishCount ?? 0) + 1,
      });
    }
  }
  await sendMessage(
    conversationId,
    SYSTEM_SENDER_ID,
    "🫜 Zamenjava je potrjena z obeh strani! Oba sta prejela redkvico."
  );

  return result;
}

// ---------------------------------------------------------------------------
// Demo seed data (first launch only, shared across every device) so the
// browse screen isn't empty on a fresh Firebase project.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@vrt.si";
const DEMO_PASSWORD = "demo1234";
// Local, per-device bookkeeping only — *what* gets seeded lives in Firebase
// and is shared; this flag just stops this device from repeating the
// check (and its sign-in/out side effect) on every single launch.
const SEEDED_FLAG_KEY = "@mobile1/seed-checked";

export async function seedDemoDataOnce(): Promise<void> {
  if (await AsyncStorage.getItem(SEEDED_FLAG_KEY)) return;
  await AsyncStorage.setItem(SEEDED_FLAG_KEY, "1");

  // Never touch an active session. The demo-account existence check below
  // signs in/out as a side effect, which would otherwise silently knock out
  // whoever's real session was persisted on this device.
  const initialFirebaseUser = await new Promise<FirebaseUser | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      unsubscribe();
      resolve(u);
    });
  });
  if (initialFirebaseUser) return;

  try {
    // Demo account already exists → someone (this device or another) has
    // already seeded; nothing to do. Sign back out immediately — this is
    // only a side-effect-free "does this exist" check.
    await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
    await signOut(auth);
    return;
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    if (code !== "auth/invalid-credential" && code !== "auth/user-not-found") {
      // Some other problem (e.g. offline) — don't attempt to seed now.
      return;
    }
  }

  try {
    const demoUser = await registerUser("Vrtnarija Sonček", DEMO_EMAIL, DEMO_PASSWORD);
    const ljubljana = { latitude: 46.0569, longitude: 14.5058, label: "Ljubljana" };

    await createListing({
      ownerId: demoUser.id,
      title: "Domači paradižnik",
      description: "Zrel, sočen paradižnik iz vrta, brez škropiv.",
      quantity: "~3 kg",
      category: "Zelenjava",
      wantedInExchange: "Jabolka ali jajca",
      location: ljubljana,
    });
    await createListing({
      ownerId: demoUser.id,
      title: "Sveža bučka",
      description: "Nekaj kg buč, ravno smo obrali.",
      quantity: "5 kg",
      category: "Zelenjava",
      wantedInExchange: "Karkoli sezonsko",
      location: ljubljana,
    });
    await createListing({
      ownerId: demoUser.id,
      title: "Jabolka Golden",
      description: "Presežek jabolk iz sadovnjaka.",
      quantity: "10 kg",
      category: "Sadje",
      wantedInExchange: "Zelenjava ali med",
      location: { latitude: 46.15, longitude: 14.55, label: "Kranj" },
    });
  } catch {
    // Seeding is a nice-to-have, not required for the app to function —
    // never let a failure here block startup.
  } finally {
    // registerUser signs us in as the demo account as a side effect; leave
    // the app logged out for a fresh launch, same as before seeding ran.
    await signOut(auth).catch(() => {});
  }
}

