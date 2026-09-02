import AsyncStorage from "@react-native-async-storage/async-storage";
import { Conversation, Listing, Message, User } from "../types";

/**
 * Lightweight local "backend" for the MVP, backed by AsyncStorage.
 *
 * Everything here is written behind a small async API (getListings,
 * createListing, sendMessage, ...) so that swapping this module for a real
 * network backend later doesn't require touching any screen.
 */

const KEYS = {
  users: "@mobile1/users",
  session: "@mobile1/session",
  listings: "@mobile1/listings",
  conversations: "@mobile1/conversations",
  messages: "@mobile1/messages",
  seeded: "@mobile1/seeded",
} as const;

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Users & auth
// ---------------------------------------------------------------------------

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const users = await readJson<User[]>(KEYS.users, []);
  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error("Uporabnik s tem e-poštnim naslovom že obstaja.");
  }
  const user: User = {
    id: uid("user"),
    name: name.trim(),
    email: normalizedEmail,
    password,
    createdAt: Date.now(),
  };
  users.push(user);
  await writeJson(KEYS.users, users);
  await writeJson(KEYS.session, user.id);
  return user;
}

export async function loginUser(
  email: string,
  password: string
): Promise<User> {
  const users = await readJson<User[]>(KEYS.users, []);
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user || user.password !== password) {
    throw new Error("Napačen e-poštni naslov ali geslo.");
  }
  await writeJson(KEYS.session, user.id);
  return user;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.session);
}

export async function getCurrentUser(): Promise<User | null> {
  const id = await AsyncStorage.getItem(KEYS.session);
  if (!id) return null;
  const users = await readJson<User[]>(KEYS.users, []);
  return users.find((u) => u.id === id) ?? null;
}

export async function updateUser(
  id: string,
  patch: Partial<Omit<User, "id">>
): Promise<User> {
  const users = await readJson<User[]>(KEYS.users, []);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("Uporabnik ne obstaja.");
  users[idx] = { ...users[idx], ...patch };
  await writeJson(KEYS.users, users);
  return users[idx];
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await readJson<User[]>(KEYS.users, []);
  return users.find((u) => u.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export async function getListings(): Promise<Listing[]> {
  const listings = await readJson<Listing[]>(KEYS.listings, []);
  return [...listings].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getListingById(id: string): Promise<Listing | null> {
  const listings = await readJson<Listing[]>(KEYS.listings, []);
  return listings.find((l) => l.id === id) ?? null;
}

export async function getListingsByOwner(ownerId: string): Promise<Listing[]> {
  const listings = await getListings();
  return listings.filter((l) => l.ownerId === ownerId);
}

export async function createListing(
  data: Omit<Listing, "id" | "createdAt" | "status">
): Promise<Listing> {
  const listings = await readJson<Listing[]>(KEYS.listings, []);
  const listing: Listing = {
    ...data,
    id: uid("listing"),
    createdAt: Date.now(),
    status: "available",
  };
  listings.push(listing);
  await writeJson(KEYS.listings, listings);
  return listing;
}

export async function setListingStatus(
  id: string,
  status: Listing["status"]
): Promise<void> {
  const listings = await readJson<Listing[]>(KEYS.listings, []);
  const idx = listings.findIndex((l) => l.id === id);
  if (idx === -1) return;
  listings[idx] = { ...listings[idx], status };
  await writeJson(KEYS.listings, listings);
}

export async function deleteListing(id: string): Promise<void> {
  const listings = await readJson<Listing[]>(KEYS.listings, []);
  await writeJson(
    KEYS.listings,
    listings.filter((l) => l.id !== id)
  );
}

// ---------------------------------------------------------------------------
// Conversations & messages
// ---------------------------------------------------------------------------

export async function getOrCreateConversation(
  listingId: string,
  userAId: string,
  userBId: string
): Promise<Conversation> {
  const conversations = await readJson<Conversation[]>(KEYS.conversations, []);
  const existing = conversations.find(
    (c) =>
      c.listingId === listingId &&
      c.participantIds.includes(userAId) &&
      c.participantIds.includes(userBId)
  );
  if (existing) return existing;

  const conversation: Conversation = {
    id: uid("conv"),
    listingId,
    participantIds: [userAId, userBId],
    createdAt: Date.now(),
    lastMessageAt: Date.now(),
  };
  conversations.push(conversation);
  await writeJson(KEYS.conversations, conversations);
  return conversation;
}

export async function getConversationsForUser(
  userId: string
): Promise<Conversation[]> {
  const conversations = await readJson<Conversation[]>(KEYS.conversations, []);
  return conversations
    .filter((c) => c.participantIds.includes(userId))
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export async function getConversationById(
  id: string
): Promise<Conversation | null> {
  const conversations = await readJson<Conversation[]>(KEYS.conversations, []);
  return conversations.find((c) => c.id === id) ?? null;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const messages = await readJson<Message[]>(KEYS.messages, []);
  return messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<Message> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Sporočilo ne more biti prazno.");

  const messages = await readJson<Message[]>(KEYS.messages, []);
  const message: Message = {
    id: uid("msg"),
    conversationId,
    senderId,
    text: trimmed,
    createdAt: Date.now(),
  };
  messages.push(message);
  await writeJson(KEYS.messages, messages);

  const conversations = await readJson<Conversation[]>(KEYS.conversations, []);
  const idx = conversations.findIndex((c) => c.id === conversationId);
  if (idx !== -1) {
    conversations[idx] = {
      ...conversations[idx],
      lastMessageAt: message.createdAt,
      lastMessagePreview: trimmed,
    };
    await writeJson(KEYS.conversations, conversations);
  }

  return message;
}

// ---------------------------------------------------------------------------
// Demo seed data (first launch only) so the browse screen isn't empty.
// ---------------------------------------------------------------------------

export async function seedDemoDataOnce(): Promise<void> {
  const already = await AsyncStorage.getItem(KEYS.seeded);
  if (already) return;

  const users = await readJson<User[]>(KEYS.users, []);
  if (users.length === 0) {
    const demoUser: User = {
      id: uid("user"),
      name: "Vrtnarija Sonček",
      email: "demo@vrt.si",
      password: "demo1234",
      location: { latitude: 46.0569, longitude: 14.5058, label: "Ljubljana" },
      createdAt: Date.now(),
    };
    users.push(demoUser);
    await writeJson(KEYS.users, users);

    const listings = await readJson<Listing[]>(KEYS.listings, []);
    const demoListings: Listing[] = [
      {
        id: uid("listing"),
        ownerId: demoUser.id,
        title: "Domači paradižnik",
        description: "Zrel, sočen paradižnik iz vrta, brez škropiv.",
        quantity: "~3 kg",
        category: "Zelenjava",
        wantedInExchange: "Jabolka ali jajca",
        location: demoUser.location,
        createdAt: Date.now(),
        status: "available",
      },
      {
        id: uid("listing"),
        ownerId: demoUser.id,
        title: "Sveža bučka",
        description: "Nekaj kg buč, ravno smo obrali.",
        quantity: "5 kg",
        category: "Zelenjava",
        wantedInExchange: "Karkoli sezonsko",
        location: demoUser.location,
        createdAt: Date.now(),
        status: "available",
      },
      {
        id: uid("listing"),
        ownerId: demoUser.id,
        title: "Jabolka Golden",
        description: "Presežek jabolk iz sadovnjaka.",
        quantity: "10 kg",
        category: "Sadje",
        wantedInExchange: "Zelenjava ali med",
        location: { latitude: 46.15, longitude: 14.55, label: "Kranj" },
        createdAt: Date.now(),
        status: "available",
      },
    ];
    listings.push(...demoListings);
    await writeJson(KEYS.listings, listings);
  }

  await AsyncStorage.setItem(KEYS.seeded, "1");
}
