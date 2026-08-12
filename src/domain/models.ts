import type { PaybyNetwork } from "../config/networks";

export type VisibilityMode = "public" | "unlisted" | "private";
export type AccessMode = "free" | "allowlist" | "nft" | "paid" | "subscription";
export type PendingPublishStatus =
  | "preparing"
  | "wallet"
  | "confirming"
  | "storing"
  | "registry"
  | "indexing"
  | "ready"
  | "failed";
export type TransactionStatus = "pending" | "confirmed" | "failed";
export type TransactionVerification = "checking" | "live" | "unavailable";
export type UnlockState = "idle" | "signing" | "authorized" | "denied";
export type MoveFunctionId = `${string}::${string}::${string}`;

export type MediaMetadata = {
  key: string;
  owner: string;
  blobName: string;
  metadataBlobName?: string;
  metadataUri?: string;
  metadataHash?: string;
  network: PaybyNetwork;
  title: string;
  description: string;
  category: string;
  tags: string[];
  coverUrl: string;
  visibility: VisibilityMode;
  accessMode: AccessMode;
  price: string;
  currency: "APT" | "SHELBYUSD";
  allowlist: string;
  createdAt: number;
};

export type CreatorProfile = {
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  website: string;
  xHandle?: string;
  xVerified?: boolean;
  updatedAt?: number;
};

export type ActivityItem = {
  id: string;
  at: number;
  wallet: string;
  network: PaybyNetwork;
  type: "upload" | "delete" | "metadata" | "share";
  label: string;
  detail: string;
  blobNames?: string[];
};

export type ActivityInput = Omit<ActivityItem, "id" | "at" | "wallet" | "network">;

export type PendingPublishItem = {
  id: string;
  owner: string;
  network: PaybyNetwork;
  blobName: string;
  title: string;
  size: number;
  status: PendingPublishStatus;
  createdAt: number;
  updatedAt: number;
  transactionHash: string;
  error: string;
};

export type RepublishDraft = {
  metadata: MediaMetadata;
  sourceBlobName: string;
  createdAt: number;
};

export type KnownCreator = {
  owner: string;
  network: PaybyNetwork;
  displayName: string;
  handle: string;
  avatarUrl: string;
  mediaCount: number;
  savedAt: number;
};

export type TransactionItem = {
  id: string;
  hash: string;
  network: PaybyNetwork;
  wallet: string;
  status: TransactionStatus;
  label: string;
  detail: string;
  owner?: string;
  blobNames?: string[];
  createdAt: number;
  updatedAt: number;
  verification?: TransactionVerification;
};

export type PurchaseReceipt = {
  hash: string;
  network: PaybyNetwork;
  buyer: string;
  creator: string;
  blobName: string;
  title: string;
  accessMode: AccessMode;
  accessType: "purchase" | "session";
  price: string;
  currency: "APT" | "SHELBYUSD";
  confirmedAt: number;
};

export type ChainListing = {
  found: boolean;
  owner: string;
  title: string;
  policy: number;
  price: string;
  paymentMetadata: string;
  metadataUri: string;
  metadataHash: string;
  active: boolean;
};

export type ChainPurchaseRecord = {
  owner: string;
  blobName: string;
  price: string;
  paymentMetadata: string;
  purchasedAtSecs: number;
  found: boolean;
};

export type CreatorSalesSummary = {
  saleCount: number;
  revenue: string;
};

export type ListingSalesSummary = CreatorSalesSummary;

export type ChainAccessProofState =
  | "unknown"
  | "checking"
  | "allowed"
  | "denied"
  | "error"
  | "unconfigured";

export type MetadataSyncState = "local" | "syncing" | "synced" | "offline";
