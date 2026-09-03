export type GeoPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string; // demo-only local auth, never do this in production
  avatarUri?: string;
  location?: GeoPoint;
  createdAt: number;
  /** Reward earned each time a trade is confirmed by both sides. */
  radishCount: number;
};

export type ListingStatus = "available" | "pending" | "traded";

export type Listing = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  quantity: string;
  category: string;
  imageUri?: string;
  wantedInExchange: string;
  location?: GeoPoint;
  createdAt: number;
  status: ListingStatus;
};

export type Conversation = {
  id: string;
  listingId: string;
  participantIds: [string, string];
  createdAt: number;
  lastMessageAt: number;
  lastMessagePreview?: string;
  /** User ids that have confirmed the trade in this conversation. The trade
   * completes once it contains both participants. */
  tradeConfirmedBy: string[];
};

/** Sender id used for automated messages (trade confirmations, etc). */
export const SYSTEM_SENDER_ID = "system";

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: number;
};

export const PRODUCE_CATEGORIES = [
  "Sadje",
  "Zelenjava",
  "Zelišča",
  "Jajca in mlečni izdelki",
  "Vloženo/predelano",
  "Sadike in seme",
  "Drugo",
] as const;
