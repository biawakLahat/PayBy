import React from "react";
import {
  Activity,
  ArrowRight,
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  Filter,
  FileArchive,
  FileVideo,
  Image,
  KeyRound,
  Link2,
  ListChecks,
  Lock,
  Moon,
  PlayCircle,
  PlugZap,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  UploadCloud,
  User,
  Wallet,
  X,
  ReceiptText,
} from "lucide-react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { useWallet, WalletReadyState } from "@aptos-labs/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShelbyClientProvider } from "@shelby-protocol/react";
import {
  useAccountBlobs,
  useBlobMetadata,
  useDeleteBlobs,
  useUploadBlobs,
} from "@shelby-protocol/react";
import type { BlobMetadata, ShelbyClient } from "@shelby-protocol/sdk/browser";
import { ShelbyClient as ShelbyBrowserClient } from "@shelby-protocol/sdk/browser";
import { PaybyLogo } from "./components/PaybyLogo";
import {
  PAYBY_NETWORKS,
  defaultNetwork,
  paybyWallets,
  type PaybyNetwork,
} from "./config/networks";

type AppProps = {
  selectedNetwork: PaybyNetwork;
  onNetworkChange: (network: PaybyNetwork) => void;
  shelbyClient: ShelbyClient;
};

type RouteName =
  | "landing"
  | "vault"
  | "publish"
  | "library"
  | "network"
  | "detail"
  | "share"
  | "profile"
  | "activity";
type AppRoute = {
  name: RouteName;
  owner?: string;
  blobName?: string;
};
type ThemeName = "light" | "dark";
type AppViewName = Exclude<RouteName, "landing" | "share">;
type VisibilityMode = "public" | "unlisted" | "private";
type AccessMode = "free" | "allowlist" | "nft" | "paid" | "subscription";
type PublishPhase =
  | "idle"
  | "preparing"
  | "wallet"
  | "confirming"
  | "storing"
  | "registry"
  | "success"
  | "error";
type PendingPublishStatus =
  | "preparing"
  | "wallet"
  | "confirming"
  | "storing"
  | "registry"
  | "indexing"
  | "ready"
  | "failed";
type TransactionStatus = "pending" | "confirmed" | "failed";
type UnlockState = "idle" | "signing" | "authorized" | "denied";
type MoveFunctionId = `${string}::${string}::${string}`;

type WalletLike = {
  name: string;
  icon?: string;
  url?: string;
  readyState?: WalletReadyState | string;
};

const WALLET_DISPLAY_ORDER = [
  "Continue with Google",
  "Continue with Apple",
  "Petra",
  "OKX Wallet",
  "Nightly",
  "Pontem Wallet",
  "Backpack",
  "Bitget Wallet",
  "Gate Wallet",
  "Cosmostation Wallet",
];

type AccountLike = {
  address?: string;
  accountAddress?: string | { toString: () => string };
};

type WalletNetworkLike = {
  name?: string;
};

type BlobLike = {
  name?: string;
  blobName?: string;
  blobNameSuffix?: string;
  size?: number;
  expirationMicros?: number;
  creationMicros?: number;
  isWritten?: boolean;
};

type MediaMetadata = {
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

type CreatorProfile = {
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  website: string;
};

type ActivityItem = {
  id: string;
  at: number;
  wallet: string;
  network: PaybyNetwork;
  type: "upload" | "delete" | "metadata" | "share";
  label: string;
  detail: string;
};
type ActivityInput = Omit<ActivityItem, "id" | "at" | "wallet" | "network">;

type PendingPublishItem = {
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

type TransactionItem = {
  id: string;
  hash: string;
  network: PaybyNetwork;
  wallet: string;
  status: TransactionStatus;
  label: string;
  detail: string;
  createdAt: number;
  updatedAt: number;
};

type PurchaseReceipt = {
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

type ChainListing = {
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
type ChainPurchaseRecord = {
  owner: string;
  blobName: string;
  price: string;
  paymentMetadata: string;
  purchasedAtSecs: number;
  found: boolean;
};
type CreatorSalesSummary = {
  saleCount: number;
  revenue: string;
};
type ChainAccessProofState =
  | "unknown"
  | "checking"
  | "allowed"
  | "denied"
  | "error"
  | "unconfigured";
type MetadataSyncState = "local" | "syncing" | "synced" | "offline";

const formatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});
const METADATA_KEY = "payby-media-metadata-v1";
const PROFILE_KEY = "payby-creator-profile-v1";
const ACTIVITY_KEY = "payby-activity-v1";
const PENDING_PUBLISH_KEY = "payby-pending-publishes-v1";
const TRANSACTION_HISTORY_KEY = "payby-transaction-history-v1";
const PURCHASE_RECEIPTS_KEY = "payby-purchase-receipts-v1";
const VAULT_PAGE_SIZE = 8;
const ACTIVITY_PAGE_SIZE = 8;
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const ACCESS_POLICY_IDS: Record<AccessMode, number> = {
  free: 0,
  allowlist: 1,
  paid: 2,
  nft: 3,
  subscription: 4,
};
const CHAIN_SUPPORTED_ACCESS_MODES = new Set<AccessMode>([
  "free",
  "allowlist",
  "paid",
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
    },
  },
});

function useRoute(): [AppRoute, (route: AppRoute) => void] {
  const getRoute = React.useCallback((): AppRoute => {
    const path = window.location.pathname;
    if (path.startsWith("/media/")) {
      const [, , owner = "", ...nameParts] = path.split("/");
      return {
        name: "share",
        owner: decodeURIComponent(owner),
        blobName: decodeURIComponent(nameParts.join("/")),
      };
    }
    if (path.startsWith("/app/blob/")) {
      const [, , , owner = "", ...nameParts] = path.split("/");
      return {
        name: "detail",
        owner: decodeURIComponent(owner),
        blobName: decodeURIComponent(nameParts.join("/")),
      };
    }
    if (path.startsWith("/app/publish")) return { name: "publish" };
    if (path.startsWith("/app/library")) return { name: "library" };
    if (path.startsWith("/app/network")) return { name: "network" };
    if (path.startsWith("/app/profile")) return { name: "profile" };
    if (path.startsWith("/app/activity")) return { name: "activity" };
    if (path.startsWith("/app")) return { name: "vault" };
    return { name: "landing" };
  }, []);
  const [route, setRoute] = React.useState<AppRoute>(getRoute);

  React.useEffect(() => {
    const sync = () => setRoute(getRoute());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [getRoute]);

  const navigate = React.useCallback((nextRoute: AppRoute) => {
    const detailPath =
      nextRoute.owner && nextRoute.blobName
        ? `/app/blob/${encodeURIComponent(nextRoute.owner)}/${encodeBlobPath(
            nextRoute.blobName,
          )}`
        : "/app/vault";
    const sharePath =
      nextRoute.owner && nextRoute.blobName
        ? `/media/${encodeURIComponent(nextRoute.owner)}/${encodeBlobPath(
            nextRoute.blobName,
          )}`
        : "/";
    const paths: Record<RouteName, string> = {
      landing: "/",
      vault: "/app/vault",
      publish: "/app/publish",
      library: "/app/library",
      network: "/app/network",
      detail: detailPath,
      share: sharePath,
      profile: "/app/profile",
      activity: "/app/activity",
    };
    const nextPath = paths[nextRoute.name];
    window.history.pushState({}, "", nextPath);
    setRoute(nextRoute);
  }, []);

  return [route, navigate];
}

function getAccountAddress(account: unknown) {
  const candidate = account as AccountLike | null | undefined;
  const raw = candidate?.accountAddress ?? candidate?.address;
  return typeof raw === "string" ? raw : raw?.toString() ?? "";
}

function getWalletNetworkName(network: unknown) {
  const candidate = network as WalletNetworkLike | null | undefined;
  return candidate?.name?.toString().toLowerCase() ?? "";
}

function getExpectedWalletNetworkName(selectedNetwork: PaybyNetwork) {
  return PAYBY_NETWORKS[selectedNetwork].walletNetwork.toString().toLowerCase();
}

function isWalletNetworkAligned(network: unknown, selectedNetwork: PaybyNetwork) {
  const current = getWalletNetworkName(network);
  const expected = getExpectedWalletNetworkName(selectedNetwork);

  if (!current || current === expected) return true;

  // Petra reports Shelbynet as a custom network even when the wallet UI shows
  // the active chain as Shelbynet. Treat that as aligned for Shelby's route.
  return selectedNetwork === "shelbynet" && current === "custom";
}

function walletNetworkMismatchMessage(
  network: unknown,
  selectedNetwork: PaybyNetwork,
) {
  const current = getWalletNetworkName(network) || "unknown";
  const expected = getExpectedWalletNetworkName(selectedNetwork);
  if (selectedNetwork === "shelbynet" && current === "custom") {
    return "Wallet is connected to a custom Shelbynet route.";
  }
  return `Wallet is on ${current}. Switch wallet network to ${expected} before signing this ${PAYBY_NETWORKS[selectedNetwork].label} transaction.`;
}

function transactionExplorerUrl(
  selectedNetwork: PaybyNetwork,
  transactionHash: string,
) {
  return `https://explorer.aptoslabs.com/txn/${transactionHash}?network=${PAYBY_NETWORKS[selectedNetwork].explorerNetwork}`;
}

function getTransactionHash(response: unknown) {
  if (
    response &&
    typeof response === "object" &&
    "hash" in response &&
    typeof response.hash === "string"
  ) {
    return response.hash;
  }

  return "";
}

function parseAllowlistAddresses(value: string) {
  return value
    .split(/[,\n\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeBlobSegment(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "media"
  );
}

function getShelbyUri(network: PaybyNetwork, owner: string, blobName: string) {
  return `shelby://${network}/${owner}/${encodeBlobPath(blobName)}`;
}

function resolveShelbyUri(uri: string) {
  if (!uri.startsWith("shelby://")) return uri;
  const parsed = new URL(uri);
  const network = parsed.hostname as PaybyNetwork;
  const [owner = "", ...blobParts] = parsed.pathname
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);
  if (!owner || !blobParts.length || !PAYBY_NETWORKS[network]) return "";
  return getDownloadUrl(network, owner, blobParts.join("/"));
}

function createPaybyMetadataPayload(metadata: MediaMetadata) {
  return {
    schema: "payby.media.v1",
    version: 1,
    network: metadata.network,
    owner: metadata.owner,
    blobName: metadata.blobName,
    mediaUri: getShelbyUri(metadata.network, metadata.owner, metadata.blobName),
    metadataBlobName: metadata.metadataBlobName ?? "",
    title: metadata.title,
    description: metadata.description,
    category: metadata.category,
    tags: metadata.tags,
    coverUrl: metadata.coverUrl,
    visibility: metadata.visibility,
    accessMode: metadata.accessMode,
    price: metadata.price,
    currency: metadata.currency,
    allowlist: metadata.allowlist,
    createdAt: metadata.createdAt,
  };
}

function mediaMetadataFromPayload(
  payload: Record<string, unknown>,
  fallback: {
    network: PaybyNetwork;
    owner: string;
    blobName: string;
    metadataUri?: string;
    metadataHash?: string;
  },
): MediaMetadata {
  const accessMode = ["free", "allowlist", "nft", "paid", "subscription"].includes(
    payload.accessMode as string,
  )
    ? (payload.accessMode as AccessMode)
    : "free";
  const visibility = ["public", "unlisted", "private"].includes(
    payload.visibility as string,
  )
    ? (payload.visibility as VisibilityMode)
    : "unlisted";
  const network = (payload.network as PaybyNetwork) || fallback.network;
  const owner = (payload.owner as string) || fallback.owner;
  const blobName = (payload.blobName as string) || fallback.blobName;

  return {
    key: createMediaKey(owner, blobName),
    owner,
    blobName,
    metadataBlobName: (payload.metadataBlobName as string) || "",
    metadataUri: fallback.metadataUri,
    metadataHash: fallback.metadataHash,
    network,
    title: (payload.title as string) || blobName,
    description: (payload.description as string) || "",
    category: (payload.category as string) || "On-chain media",
    tags: Array.isArray(payload.tags)
      ? payload.tags.map(String).filter(Boolean).slice(0, 12)
      : ["on-chain"],
    coverUrl: (payload.coverUrl as string) || "",
    visibility,
    accessMode,
    price: (payload.price as string) || "",
    currency: payload.currency === "SHELBYUSD" ? "SHELBYUSD" : "APT",
    allowlist: (payload.allowlist as string) || "",
    createdAt:
      typeof payload.createdAt === "number" && Number.isFinite(payload.createdAt)
        ? payload.createdAt
        : Date.now(),
  };
}

async function fetchCommittedMetadata(
  selectedNetwork: PaybyNetwork,
  owner: string,
  blobName: string,
  listing: ChainListing,
): Promise<MediaMetadata | null> {
  if (!listing.metadataUri || !listing.metadataHash) return null;
  const url = resolveShelbyUri(listing.metadataUri);
  if (!url) return null;

  const response = await fetch(url);
  if (!response.ok) return null;
  const text = await response.text();
  const hash = await sha256Hex(text);
  if (hash !== listing.metadataHash) return null;

  const payload = JSON.parse(text) as Record<string, unknown>;
  return mediaMetadataFromPayload(payload, {
    network: selectedNetwork,
    owner,
    blobName,
    metadataUri: listing.metadataUri,
    metadataHash: listing.metadataHash,
  });
}

function parseAssetUnits(value: string) {
  const normalized = value.trim();
  if (!normalized) return 0;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  return Math.round(parsed * 100_000_000);
}

function formatAssetUnits(value: string | number, currency: "APT" | "SHELBYUSD" = "APT") {
  const units = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(units) || units <= 0) return `0 ${currency}`;
  const amount = units / 100_000_000;
  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits: 8,
  }).format(amount)} ${currency}`;
}

function userFacingError(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : "";
  const message = raw || fallback;
  const lower = message.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("rejected")) {
    return "Wallet approval was rejected.";
  }
  if (lower.includes("e_already_purchased") || lower.includes("already_purchased")) {
    return "This wallet already purchased this media. Refresh access proof and unlock again.";
  }
  if (lower.includes("e_price_required") || lower.includes("price_required")) {
    return "This paid listing has no valid on-chain price.";
  }
  if (lower.includes("e_payment_asset_required") || lower.includes("payment_asset_required")) {
    return "Payment asset metadata is missing for this paid listing.";
  }
  if (lower.includes("insufficient") || lower.includes("balance")) {
    return "Wallet balance is not enough for this transaction.";
  }
  if (lower.includes("simulation") || lower.includes("vmstatus")) {
    return "Aptos rejected the transaction during validation. Check network, balance, and listing state.";
  }

  return message;
}

function marketplaceFunction(
  selectedNetwork: PaybyNetwork,
  functionName:
    | "upsert_listing"
    | "purchase"
    | "purchase_from"
    | "can_access"
    | "can_access_for_owner"
    | "get_listing"
    | "get_listing_for_owner"
    | "get_listing_metadata"
    | "get_listing_metadata_for_owner"
    | "get_listing_count"
    | "get_listing_count_for_owner"
    | "get_listing_key"
    | "get_listing_key_for_owner"
    | "get_purchases"
    | "get_purchases_from_owner"
    | "get_purchase_record_count"
    | "get_purchase_record"
    | "get_sales_summary"
    | "upsert_listing_metadata"
    | "upsert_listing_metadata_for_owner"
    | "upsert_listing_with_metadata"
    | "upsert_listing_for_owner_with_metadata",
): MoveFunctionId | "" {
  const address = PAYBY_NETWORKS[selectedNetwork].marketplaceContractAddress;
  return address
    ? (`${address}::payby_marketplace::${functionName}` as MoveFunctionId)
    : "";
}

function policyIdToAccessMode(policy: number): AccessMode {
  if (policy === ACCESS_POLICY_IDS.allowlist) return "allowlist";
  if (policy === ACCESS_POLICY_IDS.paid) return "paid";
  if (policy === ACCESS_POLICY_IDS.nft) return "nft";
  if (policy === ACCESS_POLICY_IDS.subscription) return "subscription";
  return "free";
}

async function readChainListing(
  selectedNetwork: PaybyNetwork,
  owner: string,
  blobName: string,
): Promise<ChainListing | null> {
  const ownerFunctionId = marketplaceFunction(selectedNetwork, "get_listing_for_owner");
  const legacyFunctionId = marketplaceFunction(selectedNetwork, "get_listing");
  if (!ownerFunctionId && !legacyFunctionId) return null;

  let data: unknown[];
  try {
    if (!ownerFunctionId || !owner) throw new Error("Owner-scoped listing unavailable.");
    data = await callMarketplaceView(selectedNetwork, ownerFunctionId, [owner, blobName]);
    const ownerListing = parseChainListing(data);
    if (ownerListing.found || !legacyFunctionId) {
      if (!ownerListing.found) return ownerListing;
      try {
        const metadata = await readChainListingMetadata(selectedNetwork, owner, blobName);
        if (metadata) {
          ownerListing.metadataUri = metadata.metadataUri;
          ownerListing.metadataHash = metadata.metadataHash;
        }
      } catch {
        // Older deployments may not expose metadata commitment views yet.
      }
      return ownerListing;
    }
  } catch {
    if (!legacyFunctionId) return null;
  }

  data = await callMarketplaceView(selectedNetwork, legacyFunctionId, [blobName]);
  const listing = parseChainListing(data);
  if (!listing.found) return listing;

  try {
    const metadata = await readChainListingMetadata(selectedNetwork, owner, blobName);
    if (metadata) {
      listing.metadataUri = metadata.metadataUri;
      listing.metadataHash = metadata.metadataHash;
    }
  } catch {
    // Older deployments may not expose metadata commitment views yet.
  }

  return listing;
}

async function callMarketplaceView(
  selectedNetwork: PaybyNetwork,
  functionId: MoveFunctionId,
  args: unknown[],
) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  const fullnode = network.fullnodeUrl.replace(/\/$/, "");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (network.aptosApiKey) headers.authorization = `Bearer ${network.aptosApiKey}`;

  const response = await fetch(`${fullnode}/view`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      function: functionId,
      type_arguments: [],
      arguments: args,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not read marketplace state from Aptos.");
  }

  return (await response.json()) as unknown[];
}

function parseChainListing(data: unknown[]): ChainListing {
  const [owner, title, policy, price, paymentMetadata, active] = data;
  const ownerString = owner?.toString() ?? "";
  const found =
    Boolean(ownerString) &&
    ownerString !== "0x0" &&
    !/^0x0+$/.test(ownerString);

  return {
    found,
    owner: ownerString,
    title: title?.toString() ?? "",
    policy: Number(policy ?? 0),
    price: price?.toString() ?? "0",
    paymentMetadata: paymentMetadata?.toString() ?? "",
    metadataUri: "",
    metadataHash: "",
    active: Boolean(active),
  };
}

async function readChainListingMetadata(
  selectedNetwork: PaybyNetwork,
  owner: string,
  blobName: string,
) {
  const ownerFunctionId = marketplaceFunction(
    selectedNetwork,
    "get_listing_metadata_for_owner",
  );
  const legacyFunctionId = marketplaceFunction(selectedNetwork, "get_listing_metadata");
  if (!ownerFunctionId && !legacyFunctionId) return null;

  let data: unknown[];
  try {
    if (!ownerFunctionId || !owner) throw new Error("Owner-scoped metadata unavailable.");
    data = await callMarketplaceView(selectedNetwork, ownerFunctionId, [owner, blobName]);
    const [ownerMetadataUri, ownerMetadataHash, ownerFound] = data;
    if (ownerFound || !legacyFunctionId) {
      if (!ownerFound) return null;
      return {
        metadataUri: ownerMetadataUri?.toString() ?? "",
        metadataHash: ownerMetadataHash?.toString() ?? "",
      };
    }
  } catch {
    if (!legacyFunctionId) return null;
  }

  data = await callMarketplaceView(selectedNetwork, legacyFunctionId, [blobName]);
  const [metadataUri, metadataHash, found] = data;
  if (!found) return null;
  return {
    metadataUri: metadataUri?.toString() ?? "",
    metadataHash: metadataHash?.toString() ?? "",
  };
}

async function readChainAccess(
  selectedNetwork: PaybyNetwork,
  owner: string,
  user: string,
  blobName: string,
): Promise<boolean | null> {
  const ownerFunctionId = marketplaceFunction(selectedNetwork, "can_access_for_owner");
  const legacyFunctionId = marketplaceFunction(selectedNetwork, "can_access");
  if (!ownerFunctionId && !legacyFunctionId) return null;

  let data: unknown[];
  try {
    if (!ownerFunctionId || !owner) throw new Error("Owner-scoped access unavailable.");
    data = await callMarketplaceView(selectedNetwork, ownerFunctionId, [
      owner,
      user,
      blobName,
    ]);
    const ownerAllowed = Boolean(data[0]);
    if (ownerAllowed || !legacyFunctionId) return ownerAllowed;
  } catch {
    if (!legacyFunctionId) return null;
  }

  data = await callMarketplaceView(selectedNetwork, legacyFunctionId, [
    user,
    blobName,
  ]);
  return Boolean(data[0]);
}

async function readChainPurchases(
  selectedNetwork: PaybyNetwork,
  buyer: string,
  owner: string,
): Promise<string[] | null> {
  const ownerFunctionId = marketplaceFunction(
    selectedNetwork,
    "get_purchases_from_owner",
  );
  const legacyFunctionId = marketplaceFunction(selectedNetwork, "get_purchases");
  if (!ownerFunctionId && !legacyFunctionId) return null;

  let data: unknown[];
  try {
    if (!ownerFunctionId || !owner) throw new Error("Owner-scoped purchase list unavailable.");
    data = await callMarketplaceView(selectedNetwork, ownerFunctionId, [buyer, owner]);
    const ownerPurchases = Array.isArray(data[0]) ? data[0] : data;
    if (ownerPurchases.length > 0 || !legacyFunctionId) {
      return ownerPurchases.map((item) => item?.toString() ?? "").filter(Boolean);
    }
  } catch {
    if (!legacyFunctionId) return null;
  }

  data = await callMarketplaceView(selectedNetwork, legacyFunctionId, [buyer]);
  const purchases = Array.isArray(data[0]) ? data[0] : data;
  return purchases.map((item) => item?.toString() ?? "").filter(Boolean);
}

async function readChainPurchaseRecordCount(
  selectedNetwork: PaybyNetwork,
  buyer: string,
) {
  const functionId = marketplaceFunction(selectedNetwork, "get_purchase_record_count");
  if (!functionId || !buyer) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [buyer]);
  return Number(data[0] ?? 0);
}

async function readChainPurchaseRecord(
  selectedNetwork: PaybyNetwork,
  buyer: string,
  index: number,
): Promise<ChainPurchaseRecord | null> {
  const functionId = marketplaceFunction(selectedNetwork, "get_purchase_record");
  if (!functionId || !buyer) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [
    buyer,
    String(index),
  ]);
  const [owner, blobName, price, paymentMetadata, purchasedAtSecs, found] = data;
  return {
    owner: owner?.toString() ?? "",
    blobName: blobName?.toString() ?? "",
    price: price?.toString() ?? "0",
    paymentMetadata: paymentMetadata?.toString() ?? "",
    purchasedAtSecs: Number(purchasedAtSecs ?? 0),
    found: Boolean(found),
  };
}

async function readBuyerPurchaseRecords(
  selectedNetwork: PaybyNetwork,
  buyer: string,
  limit = 120,
) {
  const count = await readChainPurchaseRecordCount(selectedNetwork, buyer).catch(
    () => null,
  );
  if (!count) return null;

  const records: ChainPurchaseRecord[] = [];
  const capped = Math.min(count, limit);
  for (let index = 0; index < capped; index += 1) {
    const record = await readChainPurchaseRecord(
      selectedNetwork,
      buyer,
      index,
    ).catch(() => null);
    if (record?.found && record.owner && record.blobName) records.push(record);
  }
  return records;
}

async function readCreatorSalesSummary(
  selectedNetwork: PaybyNetwork,
  owner: string,
): Promise<CreatorSalesSummary | null> {
  const functionId = marketplaceFunction(selectedNetwork, "get_sales_summary");
  if (!functionId || !owner) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [owner]);
  return {
    saleCount: Number(data[0] ?? 0),
    revenue: data[1]?.toString() ?? "0",
  };
}

async function readChainListingCount(selectedNetwork: PaybyNetwork) {
  const functionId = marketplaceFunction(selectedNetwork, "get_listing_count");
  if (!functionId) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, []);
  return Number(data[0] ?? 0);
}

async function readChainListingKey(
  selectedNetwork: PaybyNetwork,
  index: number,
) {
  const functionId = marketplaceFunction(selectedNetwork, "get_listing_key");
  if (!functionId) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [String(index)]);
  return data[0]?.toString() || "";
}

async function readOwnerChainListingCount(
  selectedNetwork: PaybyNetwork,
  owner: string,
) {
  const functionId = marketplaceFunction(
    selectedNetwork,
    "get_listing_count_for_owner",
  );
  if (!functionId || !owner) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [owner]);
  return Number(data[0] ?? 0);
}

async function readOwnerChainListingKey(
  selectedNetwork: PaybyNetwork,
  owner: string,
  index: number,
) {
  const functionId = marketplaceFunction(selectedNetwork, "get_listing_key_for_owner");
  if (!functionId || !owner) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [
    owner,
    String(index),
  ]);
  return data[0]?.toString() || "";
}

async function readCreatorChainListings(
  selectedNetwork: PaybyNetwork,
  owner: string,
  limit = 120,
) {
  const ownerCount = await readOwnerChainListingCount(selectedNetwork, owner).catch(
    () => null,
  );
  const count =
    ownerCount && ownerCount > 0
      ? ownerCount
      : await readChainListingCount(selectedNetwork);
  if (count === null) return [];

  const capped = Math.min(count, limit);
  const listings: Array<{ blobName: string; listing: ChainListing }> = [];
  for (let index = 0; index < capped; index += 1) {
    const blobName = !ownerCount || ownerCount <= 0
      ? await readChainListingKey(selectedNetwork, index)
      : await readOwnerChainListingKey(selectedNetwork, owner, index);
    if (!blobName) continue;
    const listing = await readChainListing(selectedNetwork, owner, blobName);
    if (
      listing?.found &&
      listing.owner.toLowerCase() === owner.toLowerCase()
    ) {
      listings.push({ blobName, listing });
    }
  }
  return listings;
}

function metadataFromChainListing(
  selectedNetwork: PaybyNetwork,
  blobName: string,
  listing: ChainListing,
): MediaMetadata {
  const accessMode = policyIdToAccessMode(listing.policy);
  return {
    key: createMediaKey(listing.owner, blobName),
    owner: listing.owner,
    blobName,
    metadataUri: listing.metadataUri,
    metadataHash: listing.metadataHash,
    network: selectedNetwork,
    title: listing.title || blobName,
    description: "Recovered from the Payby marketplace registry.",
    category: "On-chain media",
    tags: ["on-chain"],
    coverUrl: "",
    visibility: "unlisted",
    accessMode,
    price: listing.price === "0" ? "" : listing.price,
    currency: "APT",
    allowlist: "",
    createdAt: Date.now(),
  };
}

function getAccessRegistryBlocker(
  selectedNetwork: PaybyNetwork,
  accessMode: AccessMode,
  price = "",
) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  if (!CHAIN_SUPPORTED_ACCESS_MODES.has(accessMode)) {
    return "NFT and subscription gates need a verifier contract before they can be published safely.";
  }
  if (!network.marketplaceContractAddress) {
    return "Set the Payby marketplace contract address before publishing Web3-native media.";
  }
  if (accessMode === "paid" && !network.paymentAssetMetadataAddress) {
    return "Set the payment asset metadata address before publishing paid unlocks.";
  }
  if (accessMode === "paid" && parseAssetUnits(price) <= 0) {
    return "Set a paid unlock price greater than 0 before registering on-chain access.";
  }
  return "";
}

async function waitForTransaction(selectedNetwork: PaybyNetwork, hash: string) {
  if (!hash) return;

  const baseUrl = PAYBY_NETWORKS[selectedNetwork].fullnodeUrl.replace(/\/$/, "");
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const response = await fetch(
      `${baseUrl}/transactions/by_hash/${encodeURIComponent(hash)}`,
    );

    if (response.ok) {
      const data = (await response.json()) as {
        type?: string;
        success?: boolean;
        vm_status?: string;
      };

      if (data.type !== "pending_transaction") {
        if (data.success === false) {
          throw new Error(data.vm_status || "Transaction failed on-chain.");
        }
        return;
      }
    }

    await new Promise((resolve) => window.setTimeout(resolve, 2_000));
  }

  throw new Error("Transaction confirmation timed out. Check Aptos Explorer.");
}

async function requestWalletNetworkChange({
  changeNetwork,
  network,
  selectedNetwork,
  setStatusMessage,
}: {
  changeNetwork: (
    network: (typeof PAYBY_NETWORKS)[PaybyNetwork]["walletNetwork"],
  ) => Promise<unknown>;
  network: unknown;
  selectedNetwork: PaybyNetwork;
  setStatusMessage: (message: string) => void;
}) {
  if (isWalletNetworkAligned(network, selectedNetwork)) return true;

  try {
    await changeNetwork(PAYBY_NETWORKS[selectedNetwork].walletNetwork);
    setStatusMessage("Wallet network switch requested. Approve it, then publish again.");
  } catch (error) {
    setStatusMessage(
      error instanceof Error
        ? error.message
        : walletNetworkMismatchMessage(network, selectedNetwork),
    );
  }

  return false;
}

function encodeBlobPath(blobName: string) {
  return blobName.split("/").map(encodeURIComponent).join("/");
}

function createMediaKey(owner: string, blobName: string) {
  return `${owner.toLowerCase()}::${blobName}`;
}

function createNetworkMediaKey(
  network: PaybyNetwork,
  owner: string,
  blobName: string,
) {
  return `${network}::${createMediaKey(owner, blobName)}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function useStoredMetadata() {
  const [metadata, setMetadata] = React.useState<Record<string, MediaMetadata>>(
    () => readJson<Record<string, MediaMetadata>>(METADATA_KEY, {}),
  );
  const [syncState] = React.useState<MetadataSyncState>("local");

  const saveMetadata = React.useCallback(
    (items: MediaMetadata[]) => {
      setMetadata((current) => {
        const next = { ...current };
        items.forEach((item) => {
          next[item.key] = item;
        });
        writeJson(METADATA_KEY, next);
        return next;
      });
    },
    [],
  );

  const removeMetadata = React.useCallback((key: string) => {
    setMetadata((current) => {
      const next = { ...current };
      delete next[key];
      writeJson(METADATA_KEY, next);
      return next;
    });
  }, []);

  return { metadata, saveMetadata, removeMetadata, syncState };
}

function useCreatorProfile() {
  const [profile, setProfile] = React.useState<CreatorProfile>(() =>
    readJson<CreatorProfile>(PROFILE_KEY, {
      displayName: "Payby Creator",
      handle: "payby",
      bio: "Premium media publishing on Shelby and Aptos.",
      avatarUrl: "",
      website: "",
    }),
  );

  const saveProfile = React.useCallback((next: CreatorProfile) => {
    setProfile(next);
    writeJson(PROFILE_KEY, next);
  }, []);

  return { profile, saveProfile };
}

function useActivityFeed(
  accountAddress: string,
  selectedNetwork: PaybyNetwork,
) {
  const [activity, setActivity] = React.useState<ActivityItem[]>(() =>
    readJson<ActivityItem[]>(ACTIVITY_KEY, []),
  );

  const walletActivity = React.useMemo(
    () =>
      activity.filter(
        (item) =>
          item.wallet?.toLowerCase() === accountAddress.toLowerCase() &&
          item.network === selectedNetwork,
      ),
    [accountAddress, activity, selectedNetwork],
  );

  const addActivity = React.useCallback(
    (item: ActivityInput) => {
      if (!accountAddress) return;
      setActivity((current) => {
        const next = [
          {
            id: crypto.randomUUID(),
            at: Date.now(),
            wallet: accountAddress,
            network: selectedNetwork,
            ...item,
          },
          ...current,
        ].slice(0, 160);
        writeJson(ACTIVITY_KEY, next);
        return next;
      });
    },
    [accountAddress, selectedNetwork],
  );

  return { activity: walletActivity, addActivity };
}

function usePendingPublishes() {
  const [pendingPublishes, setPendingPublishes] = React.useState<
    PendingPublishItem[]
  >(() => readJson<PendingPublishItem[]>(PENDING_PUBLISH_KEY, []));

  const commit = React.useCallback((next: PendingPublishItem[]) => {
    const trimmed = next
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 80);
    writeJson(PENDING_PUBLISH_KEY, trimmed);
    return trimmed;
  }, []);

  const upsertPublishes = React.useCallback(
    (items: PendingPublishItem[]) => {
      setPendingPublishes((current) => {
        const next = [...current];
        items.forEach((item) => {
          const index = next.findIndex((candidate) => candidate.id === item.id);
          if (index >= 0) {
            next[index] = { ...next[index], ...item, updatedAt: Date.now() };
          } else {
            next.unshift(item);
          }
        });
        return commit(next);
      });
    },
    [commit],
  );

  const updatePublishes = React.useCallback(
    (
      ids: string[],
      patch:
        | Partial<PendingPublishItem>
        | ((item: PendingPublishItem) => Partial<PendingPublishItem>),
    ) => {
      if (ids.length === 0) return;
      setPendingPublishes((current) =>
        commit(
          current.map((item) => {
            if (!ids.includes(item.id)) return item;
            const nextPatch =
              typeof patch === "function" ? patch(item) : patch;
            return { ...item, ...nextPatch, updatedAt: Date.now() };
          }),
        ),
      );
    },
    [commit],
  );

  const removePublishes = React.useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const removeIds = new Set(ids);
      setPendingPublishes((current) =>
        commit(current.filter((item) => !removeIds.has(item.id))),
      );
    },
    [commit],
  );

  const markIndexed = React.useCallback(
    (owner: string, network: PaybyNetwork, blobNames: string[]) => {
      if (!owner || blobNames.length === 0) return;
      const names = new Set(blobNames);
      setPendingPublishes((current) =>
        commit(
          current.map((item) =>
            item.owner.toLowerCase() === owner.toLowerCase() &&
            item.network === network &&
            names.has(item.blobName) &&
            item.status !== "failed"
              ? { ...item, status: "ready", error: "", updatedAt: Date.now() }
              : item,
          ),
        ),
      );
    },
    [commit],
  );

  return {
    pendingPublishes,
    upsertPublishes,
    updatePublishes,
    removePublishes,
    markIndexed,
  };
}

function useTransactionHistory(
  accountAddress: string,
  selectedNetwork: PaybyNetwork,
) {
  const [transactions, setTransactions] = React.useState<TransactionItem[]>(() =>
    readJson<TransactionItem[]>(TRANSACTION_HISTORY_KEY, []),
  );

  const walletTransactions = React.useMemo(
    () =>
      transactions.filter(
        (item) =>
          item.wallet?.toLowerCase() === accountAddress.toLowerCase() &&
          item.network === selectedNetwork,
      ),
    [accountAddress, selectedNetwork, transactions],
  );

  const commit = React.useCallback((next: TransactionItem[]) => {
    const trimmed = next
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 80);
    writeJson(TRANSACTION_HISTORY_KEY, trimmed);
    return trimmed;
  }, []);

  const upsertTransaction = React.useCallback(
    (item: Omit<TransactionItem, "wallet"> & { wallet?: string }) => {
      if (!accountAddress) return;
      setTransactions((current) => {
        const index = current.findIndex((candidate) => candidate.hash === item.hash);
        const scopedItem = {
          ...item,
          wallet: item.wallet || accountAddress,
        };
        const next = [...current];
        if (index >= 0) {
          next[index] = { ...next[index], ...scopedItem, updatedAt: Date.now() };
        } else {
          next.unshift(scopedItem);
        }
        return commit(next);
      });
    },
    [accountAddress, commit],
  );

  const updateTransaction = React.useCallback(
    (hash: string, patch: Partial<TransactionItem>) => {
      if (!hash) return;
      setTransactions((current) =>
        commit(
          current.map((item) =>
            item.hash === hash
              ? { ...item, ...patch, updatedAt: Date.now() }
              : item,
          ),
        ),
      );
    },
    [commit],
  );

  return { transactions: walletTransactions, upsertTransaction, updateTransaction };
}

function createReceiptKey(
  buyer: string,
  network: PaybyNetwork,
  creator: string,
  blobName: string,
) {
  return [
    buyer.toLowerCase(),
    network,
    creator.toLowerCase(),
    blobName.toLowerCase(),
  ].join("::");
}

async function loadOnChainPurchaseIndex(
  buyer: string,
  network: PaybyNetwork,
): Promise<PurchaseReceipt[]> {
  const records = await readBuyerPurchaseRecords(network, buyer).catch(() => null);
  const receipts: PurchaseReceipt[] = [];

  if (records && records.length > 0) {
    for (const record of records) {
      const listing = await readChainListing(
        network,
        record.owner,
        record.blobName,
      ).catch(() => null);
      if (!listing?.found) continue;
      const committedMetadata = await fetchCommittedMetadata(
        network,
        record.owner,
        record.blobName,
        listing,
      ).catch(() => null);
      receipts.push({
        hash: "",
        network,
        buyer,
        creator: record.owner,
        blobName: record.blobName,
        title: committedMetadata?.title || listing.title || record.blobName,
        accessMode: policyIdToAccessMode(listing.policy),
        accessType: "purchase",
        price: record.price || listing.price,
        currency: committedMetadata?.currency || "APT",
        confirmedAt: record.purchasedAtSecs
          ? record.purchasedAtSecs * 1000
          : Date.now(),
      });
    }
    return receipts;
  }

  const blobNames = await readChainPurchases(network, buyer, "");
  if (!blobNames) return [];

  for (const blobName of blobNames) {
    const listing = await readChainListing(network, "", blobName).catch(() => null);
    if (!listing?.found) continue;
    const committedMetadata = await fetchCommittedMetadata(
      network,
      listing.owner,
      blobName,
      listing,
    ).catch(() => null);
    receipts.push({
      hash: "",
      network,
      buyer,
      creator: listing.owner,
      blobName,
      title: committedMetadata?.title || listing.title || blobName,
      accessMode: policyIdToAccessMode(listing.policy),
      accessType: "purchase",
      price: committedMetadata?.price || listing.price,
      currency: committedMetadata?.currency || "APT",
      confirmedAt: Date.now(),
    });
  }

  return receipts;
}

function usePurchaseReceipts() {
  const [receipts, setReceipts] = React.useState<PurchaseReceipt[]>(() =>
    readJson<PurchaseReceipt[]>(PURCHASE_RECEIPTS_KEY, []),
  );

  const commit = React.useCallback((next: PurchaseReceipt[]) => {
    const deduped = new Map<string, PurchaseReceipt>();
    next.forEach((receipt) => {
      deduped.set(
        createReceiptKey(
          receipt.buyer,
          receipt.network,
          receipt.creator,
          receipt.blobName,
        ),
        receipt,
      );
    });
    const trimmed = Array.from(deduped.values())
      .sort((a, b) => b.confirmedAt - a.confirmedAt)
      .slice(0, 120);
    writeJson(PURCHASE_RECEIPTS_KEY, trimmed);
    return trimmed;
  }, []);

  const upsertReceipt = React.useCallback(
    (receipt: PurchaseReceipt) => {
      setReceipts((current) => commit([receipt, ...current]));
    },
    [commit],
  );

  const getReceipt = React.useCallback(
    (
      buyer: string,
      network: PaybyNetwork,
      creator: string,
      blobName: string,
    ) => {
      if (!buyer || !creator || !blobName) return null;
      const key = createReceiptKey(buyer, network, creator, blobName);
      return (
        receipts.find(
          (receipt) =>
            createReceiptKey(
              receipt.buyer,
              receipt.network,
              receipt.creator,
              receipt.blobName,
            ) === key,
        ) ?? null
      );
    },
    [receipts],
  );

  return { receipts, upsertReceipt, getReceipt };
}

function getDownloadUrl(network: PaybyNetwork, owner: string, blobName: string) {
  return `${PAYBY_NETWORKS[network].shelbyRpcUrl}/v1/blobs/${owner}/${encodeBlobPath(
    blobName,
  )}`;
}

function isRestrictedMedia(metadata?: MediaMetadata) {
  return Boolean(metadata?.accessMode && metadata.accessMode !== "free");
}

function getShareUrl(owner: string, blobName: string) {
  return `${window.location.origin}/media/${encodeURIComponent(owner)}/${encodeBlobPath(
    blobName,
  )}`;
}

function shortenAddress(address: string) {
  if (!address) return "No wallet";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  return {
    pageCount,
    safePage,
    pageItems: items.slice((safePage - 1) * pageSize, safePage * pageSize),
  };
}

function fileSize(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${formatter.format(bytes / 1024 ** index)} ${units[index]}`;
}

function formatElapsed(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining.toString().padStart(2, "0")}s`;
}

function useElapsedSeconds(active: boolean, resetKey: string) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    setElapsed(0);
    if (!active) return;

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [active, resetKey]);

  return elapsed;
}

function formatMicros(micros?: number) {
  if (!micros) return "No expiry";
  return new Date(micros / 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getExpiryState(micros?: number) {
  if (!micros) {
    return {
      label: "Unknown",
      className: "is-warning",
      detail: "Shelby did not return an expiry timestamp for this blob.",
    };
  }

  const expiresAt = micros / 1000;
  const remainingMs = expiresAt - Date.now();
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  if (remainingMs <= 0) {
    return {
      label: "Expired",
      className: "is-danger",
      detail: "This blob may no longer be retrievable from the active Shelby route.",
    };
  }

  if (remainingDays <= 3) {
    return {
      label: `${remainingDays}d left`,
      className: "is-danger",
      detail: "Retention is almost over. Re-publish this media to keep access reliable.",
    };
  }

  if (remainingDays <= 14) {
    return {
      label: `${remainingDays}d left`,
      className: "is-warning",
      detail: "Retention is approaching expiry. Plan an extension or re-publish flow.",
    };
  }

  return {
    label: `${remainingDays}d left`,
    className: "is-ready",
    detail: "Retention window is healthy for this Shelby blob.",
  };
}

function metadataRegistryLabel(syncState: ReturnType<typeof useStoredMetadata>["syncState"]) {
  if (syncState === "synced") return "Synced";
  if (syncState === "syncing") return "Checking";
  if (syncState === "offline") return "Browser cache";
  return "Browser cache";
}

function pendingStatusLabel(status: PendingPublishStatus) {
  const labels: Record<PendingPublishStatus, string> = {
    preparing: "Preparing",
    wallet: "Awaiting wallet",
    confirming: "Finalizing",
    storing: "Storing",
    registry: "Registry",
    indexing: "Indexing",
    ready: "Ready",
    failed: "Failed",
  };

  return labels[status];
}

function pendingStatusDetail(status: PendingPublishStatus) {
  const details: Record<PendingPublishStatus, string> = {
    preparing: "Building commitments before the wallet transaction.",
    wallet: "Approve the registration from your wallet.",
    confirming: "Waiting for Aptos finality.",
    storing: "Sending blob data to Shelby RPC.",
    registry: "Writing Payby access policy on-chain.",
    indexing: "Stored on Shelby. Waiting for vault indexer.",
    ready: "Indexed and available in the vault.",
    failed: "Publish did not complete. Reopen publish and try again.",
  };

  return details[status];
}

function accessModeLabel(mode?: AccessMode) {
  const labels: Record<AccessMode, string> = {
    free: "Free access",
    allowlist: "Wallet allowlist",
    nft: "NFT holder",
    paid: "Paid unlock",
    subscription: "Subscriber only",
  };

  return mode ? labels[mode] : "Unknown policy";
}

function accessModeDetail(mode?: AccessMode) {
  if (!mode) return "Metadata is not available in this browser.";
  if (mode === "free") return "The creator marked this media as free to retrieve.";
  if (mode === "paid") {
    return "Purchase proof is recorded on Aptos before the Shelby media is shown.";
  }
  if (mode === "allowlist") {
    return "Connect an allowlisted wallet to verify access from the Payby Move contract.";
  }
  return "This policy needs a verifier before Payby can unlock the media.";
}

function createUnlockMessage({
  selectedNetwork,
  owner,
  blobName,
  nonce,
}: {
  selectedNetwork: PaybyNetwork;
  owner: string;
  blobName: string;
  nonce: string;
}) {
  return [
    "Payby media access request",
    `network: ${selectedNetwork}`,
    `owner: ${owner}`,
    `blob: ${blobName}`,
    `nonce: ${nonce}`,
    `issuedAt: ${new Date().toISOString()}`,
  ].join("\n");
}

function App({ selectedNetwork, onNetworkChange, shelbyClient }: AppProps) {
  const [route, navigate] = useRoute();
  const wallet = useWallet();
  const accountAddress = getAccountAddress(wallet.account);
  const metadataStore = useStoredMetadata();
  const profileStore = useCreatorProfile();
  const activityFeed = useActivityFeed(accountAddress, selectedNetwork);
  const pendingPublishStore = usePendingPublishes();
  const transactionStore = useTransactionHistory(accountAddress, selectedNetwork);
  const purchaseStore = usePurchaseReceipts();
  const [theme, setTheme] = React.useState<ThemeName>(() => {
    const stored = localStorage.getItem("payby-theme");
    return stored === "dark" || stored === "light" ? stored : "dark";
  });

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("payby-theme", theme);
  }, [theme]);

  if (route.name === "share") {
    return (
      <PublicMediaPage
        route={route}
        selectedNetwork={selectedNetwork}
        metadataStore={metadataStore}
        purchaseStore={purchaseStore}
        transactionStore={transactionStore}
        profile={profileStore.profile}
        onOpenApp={() => navigate({ name: "vault" })}
      />
    );
  }

  return route.name === "landing" ? (
    <LandingPage
      theme={theme}
      setTheme={setTheme}
      onLaunch={() => navigate({ name: "vault" })}
    />
  ) : (
    <VaultApp
      route={route}
      onNavigate={navigate}
      theme={theme}
      setTheme={setTheme}
      selectedNetwork={selectedNetwork}
      onNetworkChange={onNetworkChange}
      onHome={() => navigate({ name: "landing" })}
      shelbyClient={shelbyClient}
      metadataStore={metadataStore}
      profileStore={profileStore}
      activityFeed={activityFeed}
      pendingPublishStore={pendingPublishStore}
      transactionStore={transactionStore}
      purchaseStore={purchaseStore}
    />
  );
}

function LandingPage({
  theme,
  setTheme,
  onLaunch,
}: {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  onLaunch: () => void;
}) {
  React.useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal-on-scroll"),
    );

    if (nodes.length === 0) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    nodes.forEach((node, index) => {
      node.style.setProperty("--reveal-delay", `${Math.min(index * 70, 320)}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.16 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="landing landing-web3">
      <header className="landing-nav">
        <button className="brand-mark" onClick={onLaunch} type="button" aria-label="Open Payby app">
          <PaybyLogo />
        </button>
        <nav className="landing-links" aria-label="Landing sections">
          <a href="#protocol">Protocol</a>
          <a href="#creator-os">Creator OS</a>
          <a href="#networks">Networks</a>
        </nav>
        <div className="nav-actions">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <button className="button button-secondary" onClick={onLaunch}>
            Launch app
            <ArrowRight size={17} />
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-pill">
              <ShieldCheck size={16} />
              Shelby-native vault for Aptos creators
            </span>
            <h1>Payby</h1>
            <p>
              A polished creator media vault for premium files, wallet-signed
              publishing, visible Shelby routing, and storage operations that
              feel native to Web3.
            </p>
            <div className="hero-actions">
              <button className="button button-primary button-xl" onClick={onLaunch}>
                Launch dApp
                <ArrowRight size={19} />
              </button>
              <a className="button button-ghost button-xl" href="#protocol">
                Explore flow
                <span className="route-action-icon" aria-hidden="true">
                  <NetworkRouteMark />
                </span>
              </a>
            </div>
            <div className="trust-row" aria-label="Payby capabilities">
              <span>
                <Check size={15} />
                Shelby upload
              </span>
              <span>
                <Check size={15} />
                Wallet signer
              </span>
              <span>
                <Check size={15} />
                Dual network
              </span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="vault-scene">
              <div className="scene-grid" />
              <div className="hero-console console-one">
                <span>PAYBY ROUTE</span>
                <strong>shelby://creator/media</strong>
                <i>signed upload ready</i>
              </div>
              <div className="media-stack">
                <span>
                  <i>4K</i>
                  <b>VIDEO</b>
                </span>
                <span>
                  <i>24B</i>
                  <b>AUDIO</b>
                </span>
                <span>
                  <i>ZIP</i>
                  <b>ASSET</b>
                </span>
              </div>
              <div className="data-lane lane-one">
                <span>creator-film.mov</span>
                <strong>registered</strong>
              </div>
              <div className="data-lane lane-two">
                <span>vault-audio.wav</span>
                <strong>shelby rpc</strong>
              </div>
              <div className="vault-ring ring-one" />
              <div className="vault-ring ring-two" />
              <div className="vault-core">
                <div className="vault-face">
                  <Database size={34} />
                  <span>PAYBY</span>
                </div>
                <div className="vault-depth" />
              </div>
              <div className="chain-node node-one">APT</div>
              <div className="chain-node node-two">SHELBY</div>
              <div className="chain-node node-three">MEDIA</div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-band protocol-band" id="protocol">
        <div className="section-heading reveal-on-scroll">
          <span className="eyebrow">Creator publishing flow</span>
          <h2>From media file to wallet-signed Shelby storage.</h2>
        </div>
        <div className="protocol-flow">
          <article className="reveal-on-scroll">
            <span>01</span>
            <h3>Stage premium media</h3>
            <p>Drop video, audio, archives, or creator assets into the vault.</p>
          </article>
          <article className="reveal-on-scroll">
            <span>02</span>
            <h3>Sign with wallet</h3>
            <p>Register blob commitments through the connected Aptos wallet.</p>
          </article>
          <article className="reveal-on-scroll">
            <span>03</span>
            <h3>Publish to Shelby</h3>
            <p>Upload encoded blobs to Shelby RPC on shelbynet or testnet.</p>
          </article>
        </div>
      </section>

      <section className="landing-band" id="creator-os">
        <div className="section-heading compact-heading reveal-on-scroll">
          <span className="eyebrow">Built for real dApp usage</span>
          <h2>Not a file picker. A creator storage console.</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card feature-card-large reveal-on-scroll">
            <span className="feature-kicker">Publishing surface</span>
            <FileVideo size={24} />
            <h3>Media-first vault</h3>
            <p>
              Stage files, review size and retention, then publish blobs through
              Shelby's React upload mutation.
            </p>
          </article>
          <article className="feature-card reveal-on-scroll">
            <span className="feature-kicker">Signer control</span>
            <Wallet size={24} />
            <h3>Wallet-controlled</h3>
            <p>
              Uploads use an Aptos wallet signer, keeping creator identity and
              on-chain registration in one workflow.
            </p>
          </article>
          <article className="feature-card feature-card-cool reveal-on-scroll">
            <span className="feature-kicker">Network proof</span>
            <Database size={24} />
            <h3>Inspectable networks</h3>
            <p>
              Switch between shelbynet and Shelby testnet while keeping RPC,
              fullnode, indexer, and contract details visible.
            </p>
          </article>
        </div>
      </section>

      <section className="network-showcase reveal-on-scroll" id="networks">
        <div>
          <span className="eyebrow">Network aware</span>
          <h2>Shelbynet and Shelby testnet are first-class routes.</h2>
          <p>
            Payby surfaces the RPC, fullnode, indexer, and contract details so
            creators can see where media is being registered and stored.
          </p>
        </div>
        <button className="button button-primary button-xl" onClick={onLaunch}>
          Open workspace
          <ArrowRight size={19} />
        </button>
      </section>
    </main>
  );
}

function VaultApp({
  route,
  onNavigate,
  theme,
  setTheme,
  selectedNetwork,
  onNetworkChange,
  onHome,
  shelbyClient,
  metadataStore,
  profileStore,
  activityFeed,
  pendingPublishStore,
  transactionStore,
  purchaseStore,
}: AppProps & {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  onHome: () => void;
  metadataStore: ReturnType<typeof useStoredMetadata>;
  profileStore: ReturnType<typeof useCreatorProfile>;
  activityFeed: ReturnType<typeof useActivityFeed>;
  pendingPublishStore: ReturnType<typeof usePendingPublishes>;
  transactionStore: ReturnType<typeof useTransactionHistory>;
  purchaseStore: ReturnType<typeof usePurchaseReceipts>;
}) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  const wallet = useWallet();
  const accountAddress = getAccountAddress(wallet.account);
  const currentView = route.name as AppViewName;
  const viewTitle = {
    vault: "Vault library",
    publish: "Publish media",
    library: "Buyer library",
    network: "Network routes",
    detail: "Media detail",
    profile: "Creator profile",
    activity: "Activity feed",
  }[currentView];
  const viewLabel = {
    vault: "Creator workspace",
    publish: "Shelby upload flow",
    library: "Buyer workspace",
    network: "Live configuration",
    detail: "Blob operations",
    profile: "Public identity",
    activity: "On-chain and local actions",
  }[currentView];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-identity">
          <button className="brand-mark sidebar-brand" onClick={onHome} aria-label="Back to Payby landing">
            <PaybyLogo />
          </button>
          <span>Creator media vault</span>
        </div>
        <nav className="side-nav" aria-label="Payby sections">
          <span className="side-nav-label">Creator</span>
          <button
            className={`side-link ${currentView === "vault" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "vault" })}
          >
            <FileArchive size={18} />
            Vault
          </button>
          <button
            className={`side-link ${currentView === "publish" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "publish" })}
          >
            <UploadCloud size={18} />
            Publish
          </button>
          <span className="side-nav-label">Buyer</span>
          <button
            className={`side-link ${currentView === "library" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "library" })}
          >
            <ReceiptText size={18} />
            Library
          </button>
          <span className="side-nav-label">System</span>
          <button
            className={`side-link ${currentView === "network" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "network" })}
          >
            <Database size={18} />
            Network
          </button>
          <button
            className={`side-link ${currentView === "profile" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "profile" })}
          >
            <User size={18} />
            Profile
          </button>
          <button
            className={`side-link ${currentView === "activity" ? "is-active" : ""}`}
            type="button"
            onClick={() => onNavigate({ name: "activity" })}
          >
            <Activity size={18} />
            Activity
          </button>
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={18} />
          <p>{network.permanenceNote}</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="muted">{viewLabel}</p>
            <h1>{viewTitle}</h1>
          </div>
          <div className="topbar-actions">
            <NetworkSwitch
              selectedNetwork={selectedNetwork}
              onNetworkChange={onNetworkChange}
            />
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <WalletControl />
          </div>
        </header>

        <section className="status-strip">
          <StatusTile label="Wallet" value={shortenAddress(accountAddress)} />
          <StatusTile label="Network" value={network.label} />
          <StatusTile
            label="API key"
            value={network.apiKey ? "Client key loaded" : "Anonymous mode"}
          />
          <StatusTile
            label="Metadata"
            value={
              metadataStore.syncState === "synced"
                ? "Synced"
                : metadataStore.syncState === "syncing"
                  ? "Syncing"
                : metadataStore.syncState === "offline"
                    ? "Browser cache"
                    : "Browser cache"
            }
          />
        </section>

        <section className="workspace-intel" aria-label="Workspace readiness">
          <div>
            <span>Storage route</span>
            <strong>{network.shelbyRpcUrl.replace("https://", "")}</strong>
          </div>
          <div>
            <span>Signer state</span>
            <strong>{accountAddress ? "Wallet attached" : "Awaiting wallet"}</strong>
          </div>
          <div>
            <span>Publishing mode</span>
            <strong>{network.apiKey ? "Authenticated client" : "Public client"}</strong>
          </div>
          <div>
            <span>Metadata registry</span>
            <strong>
              {metadataStore.syncState === "synced"
                ? "Synced"
                : metadataStore.syncState === "offline"
                  ? "Browser cache"
                  : "Local cache"}
            </strong>
          </div>
        </section>

        <section className="workspace-page" aria-live="polite">
          {currentView === "vault" ? (
            <VaultList
              accountAddress={accountAddress}
              selectedNetwork={selectedNetwork}
              shelbyClient={shelbyClient}
              metadataStore={metadataStore}
              pendingPublishStore={pendingPublishStore}
              onNavigate={onNavigate}
              addActivity={activityFeed.addActivity}
            />
          ) : null}
          {currentView === "publish" ? (
            <UploadPanel
              accountAddress={accountAddress}
              selectedNetwork={selectedNetwork}
              shelbyClient={shelbyClient}
              saveMetadata={metadataStore.saveMetadata}
              pendingPublishStore={pendingPublishStore}
              transactionStore={transactionStore}
              addActivity={activityFeed.addActivity}
            />
          ) : null}
          {currentView === "library" ? (
            <BuyerLibraryPanel
              accountAddress={accountAddress}
              selectedNetwork={selectedNetwork}
              metadataStore={metadataStore}
              purchaseStore={purchaseStore}
              onNavigate={onNavigate}
            />
          ) : null}
          {currentView === "network" ? (
            <NetworkPanel
              selectedNetwork={selectedNetwork}
              accountAddress={accountAddress}
              metadataSyncState={metadataStore.syncState}
            />
          ) : null}
          {currentView === "detail" && route.owner && route.blobName ? (
            <MediaDetailPage
              owner={route.owner}
              blobName={route.blobName}
              selectedNetwork={selectedNetwork}
              shelbyClient={shelbyClient}
              metadataStore={metadataStore}
              onNavigate={onNavigate}
              addActivity={activityFeed.addActivity}
            />
          ) : null}
          {currentView === "profile" ? (
            <ProfilePanel
              profile={profileStore.profile}
              saveProfile={profileStore.saveProfile}
              accountAddress={accountAddress}
              mediaCount={Object.keys(metadataStore.metadata).length}
              addActivity={activityFeed.addActivity}
            />
          ) : null}
          {currentView === "activity" ? (
            <ActivityPanel
              activity={activityFeed.activity}
              transactions={transactionStore.transactions}
              accountAddress={accountAddress}
              selectedNetwork={selectedNetwork}
              onNavigate={onNavigate}
            />
          ) : null}
        </section>
      </section>
    </main>
  );
}

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}) {
  return (
    <button
      className="icon-button"
      type="button"
      aria-label="Toggle color mode"
      title="Toggle color mode"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function NetworkSwitch({
  selectedNetwork,
  onNetworkChange,
}: {
  selectedNetwork: PaybyNetwork;
  onNetworkChange: (network: PaybyNetwork) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const network = PAYBY_NETWORKS[selectedNetwork];
  const options: { value: PaybyNetwork; detail: string }[] = [
    { value: "shelbynet", detail: "Early access storage route" },
    { value: "shelby-testnet", detail: "Public test environment" },
  ];

  React.useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  return (
    <div className="network-switch" ref={menuRef}>
      <button
        className={`network-trigger ${open ? "is-open" : ""}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="network-trigger-icon">
          <NetworkRouteMark />
        </span>
        <span className="network-trigger-copy">
          <strong>{network.label}</strong>
          <small>{selectedNetwork === "shelbynet" ? "Main route" : "Test route"}</small>
        </span>
        <ChevronDown size={16} />
      </button>
      {open ? (
        <div className="network-menu" role="listbox" aria-label="Select Shelby network">
          {options.map((option) => {
            const optionNetwork = PAYBY_NETWORKS[option.value];
            const active = option.value === selectedNetwork;
            return (
              <button
                className={`network-option ${active ? "is-active" : ""}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onNetworkChange(option.value);
                  setOpen(false);
                }}
              >
                <span>
                  <strong>{optionNetwork.label}</strong>
                  <small>{option.detail}</small>
                </span>
                {active ? <Check size={16} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function NetworkRouteMark() {
  return (
    <svg className="network-route-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path
        className="network-route-shell"
        d="M16 3.8 26.8 10v12L16 28.2 5.2 22V10L16 3.8Z"
      />
      <path
        className="network-route-line"
        d="M9.8 13.3 16 9.8l6.2 3.5v7.2L16 24l-6.2-3.5v-7.2Z"
      />
      <path
        className="network-route-path"
        d="M10.2 16h5.2c1.7 0 2.5-1.8 1.2-2.9l-.8-.7M21.8 16h-5.2c-1.7 0-2.5 1.8-1.2 2.9l.8.7"
      />
      <circle className="network-route-node node-a" cx="10.2" cy="16" r="1.6" />
      <circle className="network-route-node node-b" cx="21.8" cy="16" r="1.6" />
    </svg>
  );
}

function WalletControl() {
  const {
    account,
    connected,
    connect,
    disconnect,
    wallet,
    wallets,
    notDetectedWallets,
    isLoading,
  } = useWallet();
  const [open, setOpen] = React.useState(false);
  const [walletMessage, setWalletMessage] = React.useState("");
  const accountAddress = getAccountAddress(account);
  const walletOptions = React.useMemo(() => {
    const merged = new Map<string, WalletLike>();

    ((notDetectedWallets as unknown) as readonly WalletLike[]).forEach(
      (candidate) => {
        merged.set(candidate.name, candidate);
      },
    );

    ((wallets as unknown) as readonly WalletLike[]).forEach((candidate) => {
      merged.set(candidate.name, candidate);
    });

    return [...merged.values()].sort((a, b) => {
      const first = WALLET_DISPLAY_ORDER.indexOf(a.name);
      const second = WALLET_DISPLAY_ORDER.indexOf(b.name);
      const firstRank = first === -1 ? WALLET_DISPLAY_ORDER.length : first;
      const secondRank = second === -1 ? WALLET_DISPLAY_ORDER.length : second;
      return firstRank - secondRank || a.name.localeCompare(b.name);
    });
  }, [notDetectedWallets, wallets]);

  if (connected && accountAddress) {
    return (
      <button className="wallet-pill" type="button" onClick={disconnect}>
        <span className="wallet-dot" />
        <span>{wallet?.name ?? "Wallet"}</span>
        <strong>{shortenAddress(accountAddress)}</strong>
        <X size={15} />
      </button>
    );
  }

  return (
    <div className="wallet-menu">
      <button
        className="button button-primary"
        type="button"
        onClick={() => {
          setWalletMessage("");
          setOpen((value) => !value);
        }}
        disabled={isLoading}
      >
        <Wallet size={18} />
        Connect
      </button>
      {open && (
        <div className="wallet-list">
          <div className="wallet-list-header">
            <strong>Choose wallet</strong>
            <span>Aptos Connect and AIP-62 wallets</span>
          </div>
          {walletOptions.length === 0 ? (
            <p>No Aptos wallet option is available yet.</p>
          ) : (
            walletOptions.map((candidate) => {
              const isInstalled =
                candidate.readyState !== WalletReadyState.NotDetected;
              return (
                <button
                  className={!isInstalled ? "is-install" : ""}
                  key={candidate.name}
                  type="button"
                  onClick={async () => {
                    if (!isInstalled) {
                      if (candidate.url) {
                        window.open(candidate.url, "_blank", "noopener,noreferrer");
                      }
                      return;
                    }

                    try {
                      setWalletMessage("");
                      await (connect as (walletName: string) => Promise<void>)(
                        candidate.name,
                      );
                      setOpen(false);
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : "Wallet connection failed.";
                      setWalletMessage(message);
                    }
                  }}
                >
                  {candidate.icon ? <img src={candidate.icon} alt="" /> : null}
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>{isInstalled ? "Ready to connect" : "Install wallet"}</small>
                  </span>
                  {isInstalled ? (
                    <Check size={15} />
                  ) : (
                    <ExternalLink size={15} />
                  )}
                </button>
              );
            })
          )}
          {walletMessage ? (
            <p className="wallet-error" role="alert">
              {walletMessage}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-tile">
      <span>
        <i aria-hidden="true" />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function UploadPanel({
  accountAddress,
  selectedNetwork,
  shelbyClient,
  saveMetadata,
  pendingPublishStore,
  transactionStore,
  addActivity,
}: {
  accountAddress: string;
  selectedNetwork: PaybyNetwork;
  shelbyClient: ShelbyClient;
  saveMetadata: (items: MediaMetadata[]) => void;
  pendingPublishStore: ReturnType<typeof usePendingPublishes>;
  transactionStore: ReturnType<typeof useTransactionHistory>;
  addActivity: (item: ActivityInput) => void;
}) {
  const {
    connected,
    account,
    network: walletNetwork,
    changeNetwork,
    signAndSubmitTransaction,
  } = useWallet();
  const [files, setFiles] = React.useState<File[]>([]);
  const [retentionDays, setRetentionDays] = React.useState(30);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("Premium media");
  const [tags, setTags] = React.useState("");
  const [coverUrl, setCoverUrl] = React.useState("");
  const [visibility, setVisibility] = React.useState<VisibilityMode>("unlisted");
  const [accessMode, setAccessMode] = React.useState<AccessMode>("free");
  const [price, setPrice] = React.useState("");
  const [currency, setCurrency] = React.useState<"APT" | "SHELBYUSD">("APT");
  const [allowlist, setAllowlist] = React.useState("");
  const [publishPhase, setPublishPhase] =
    React.useState<PublishPhase>("idle");
  const [transactionHash, setTransactionHash] = React.useState("");
  const [registryRetryItems, setRegistryRetryItems] = React.useState<MediaMetadata[]>(
    [],
  );
  const activePublishRef = React.useRef({
    pendingIds: [] as string[],
    hash: "",
    mediaItems: [] as MediaMetadata[],
  });

  const uploadBlobs = useUploadBlobs({
    client: shelbyClient,
    onSuccess: (_data, variables) => {
      if (accountAddress) {
        const items = activePublishRef.current.mediaItems;
        const uploadedNames = new Set(variables.blobs.map((blob) => blob.blobName));
        const mediaItems = items.filter((item) => uploadedNames.has(item.blobName));
        saveMetadata(items);
        pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
          status: "indexing",
          error: "",
        });
        transactionStore.updateTransaction(activePublishRef.current.hash, {
          status: "confirmed",
          detail: `Registered ${mediaItems.length} ${mediaItems.length === 1 ? "blob" : "blobs"} on ${PAYBY_NETWORKS[selectedNetwork].label}`,
        });
        addActivity({
          type: "upload",
          label: `Published ${mediaItems.length} media ${mediaItems.length === 1 ? "file" : "files"}`,
          detail: `Stored on ${PAYBY_NETWORKS[selectedNetwork].label}`,
        });
        void registerAccessListings(items);
      }
      setFiles([]);
      setPublishPhase("success");
      setStatusMessage(
        "Published to Shelby. Vault indexing can take a few seconds to catch up.",
      );
    },
    onError: (error) => {
      const message = userFacingError(error, "Upload failed.");
      pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
        status: "failed",
        error: message,
      });
      transactionStore.updateTransaction(activePublishRef.current.hash, {
        status: "failed",
        detail: message,
      });
      setPublishPhase("error");
      setStatusMessage(message);
    },
  });

  React.useEffect(() => {
    if (!uploadBlobs.isPending || publishPhase !== "confirming") return;

    const timeout = window.setTimeout(() => {
      setPublishPhase((phase) =>
        phase === "confirming" ? "storing" : phase,
      );
      pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
        status: "storing",
      });
      setStatusMessage(
        "Transaction submitted. Finality and Shelby storage are still running; keep this tab open.",
      );
    }, 9_000);

    return () => window.clearTimeout(timeout);
  }, [pendingPublishStore.updatePublishes, publishPhase, uploadBlobs.isPending]);

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  const walletNetworkAligned = isWalletNetworkAligned(
    walletNetwork,
    selectedNetwork,
  );
  const accessRegistryBlocker = getAccessRegistryBlocker(
    selectedNetwork,
    accessMode,
    price,
  );
  const accessRegistryReady = !accessRegistryBlocker;
  const canUpload =
    connected &&
    account &&
    walletNetworkAligned &&
    accessRegistryReady &&
    files.length > 0 &&
    !uploadBlobs.isPending;
  const publishNoticeMessage =
    statusMessage ||
    (!walletNetworkAligned && accountAddress
      ? walletNetworkMismatchMessage(walletNetwork, selectedNetwork)
      : accessRegistryBlocker
        ? accessRegistryBlocker
        : accountAddress
          ? "Ready for wallet-approved Shelby upload."
          : "Connect wallet to publish.");
  const publishNoticeTone =
    publishPhase === "success"
      ? "success"
      : publishPhase === "error"
        ? "danger"
        : !walletNetworkAligned || accessRegistryBlocker
          ? "warning"
          : publishPhase === "idle"
            ? "neutral"
            : "info";
  const publishNoticeTitle =
    publishNoticeTone === "success"
      ? "Publish complete"
      : publishNoticeTone === "danger"
        ? "Publish failed"
        : publishNoticeTone === "warning"
          ? "Action needed"
          : publishPhase === "idle"
            ? "Ready state"
            : "Publish in progress";

  async function registerAccessListings(items: MediaMetadata[]) {
    const registryItems = items;
    if (registryItems.length === 0) return;

    const functionId = marketplaceFunction(
      selectedNetwork,
      "upsert_listing_for_owner_with_metadata",
    );
    if (!functionId || !account) return;

    setPublishPhase("registry");
    pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
      status: "registry",
    });
    setStatusMessage(
      `Shelby storage complete. Registering ${registryItems.length} on-chain ${registryItems.length === 1 ? "listing" : "listings"} with metadata commitments.`,
    );

    for (const item of registryItems) {
      try {
        const response = await signAndSubmitTransaction({
          data: {
            function: functionId,
            functionArguments: [
              item.blobName,
              item.title,
              ACCESS_POLICY_IDS[item.accessMode],
              parseAssetUnits(item.price),
              PAYBY_NETWORKS[selectedNetwork].paymentAssetMetadataAddress ||
                ZERO_ADDRESS,
              parseAllowlistAddresses(item.allowlist),
              item.metadataUri || "",
              item.metadataHash || "",
            ],
          },
        });
        const hash = getTransactionHash(response);
        if (hash) {
          setTransactionHash(hash);
          transactionStore.upsertTransaction({
            id: crypto.randomUUID(),
            hash,
            network: selectedNetwork,
            status: "pending",
            label: "Payby access registry",
            detail: `Registering ${item.title} listing and metadata commitment`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          await waitForTransaction(selectedNetwork, hash);
          transactionStore.updateTransaction(hash, {
            status: "confirmed",
            detail: `${item.title} listing and metadata commitment are registered on-chain.`,
          });
        }
      } catch (error) {
        const message = userFacingError(
          error,
          "Access registry transaction failed.",
        );
        setPublishPhase("error");
        setRegistryRetryItems(registryItems);
        pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
          status: "failed",
          error: message,
        });
        setStatusMessage(message);
        addActivity({
          type: "metadata",
          label: "Access registry failed",
          detail: item.blobName,
        });
        return;
      }
    }

    setPublishPhase("success");
    setRegistryRetryItems([]);
    pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
      status: "indexing",
      error: "",
    });
    setStatusMessage("Published to Shelby with on-chain listing and metadata commitment.");
    addActivity({
      type: "metadata",
      label: "Registered on-chain listings",
      detail: registryItems.map((item) => item.blobName).join(", "),
    });
  }

  async function handleRetryRegistry() {
    if (registryRetryItems.length === 0) return;
    if (!connected || !account) {
      setStatusMessage("Connect the creator wallet before retrying registry.");
      return;
    }
    if (!walletNetworkAligned) {
      await requestWalletNetworkChange({
        changeNetwork,
        network: walletNetwork,
        selectedNetwork,
        setStatusMessage,
      });
      return;
    }
    await registerAccessListings(registryRetryItems);
  }

  async function handleUpload() {
    if (!connected || !account) {
      setPublishPhase("error");
      setStatusMessage("Connect a wallet and select at least one file.");
      return;
    }

    if (!walletNetworkAligned) {
      await requestWalletNetworkChange({
        changeNetwork,
        network: walletNetwork,
        selectedNetwork,
        setStatusMessage,
      });
      return;
    }

    if (files.length === 0) {
      setPublishPhase("error");
      setStatusMessage("Select at least one file before publishing.");
      return;
    }

    if (accessRegistryBlocker) {
      setPublishPhase("error");
      setStatusMessage(accessRegistryBlocker);
      return;
    }

    setPublishPhase("preparing");
    setTransactionHash("");
    setStatusMessage(
      `Preparing ${files.length} ${files.length === 1 ? "file" : "files"} for Shelby registration.`,
    );

    const now = Date.now();
    const tagList = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const mediaItems: MediaMetadata[] = [];
    const metadataBlobs: Array<{ blobName: string; blobData: Uint8Array }> = [];
    const mediaBlobs = await Promise.all(
      files.map(async (file) => {
        const metadataBlobName = `.payby/${now}-${crypto.randomUUID()}-${sanitizeBlobSegment(
          file.name,
        )}.metadata.json`;
        const baseMetadata: MediaMetadata = {
          key: createMediaKey(accountAddress, file.name),
          owner: accountAddress,
          blobName: file.name,
          metadataBlobName,
          network: selectedNetwork,
          title: title.trim() || file.name,
          description: description.trim(),
          category: category.trim() || "Premium media",
          tags: tagList,
          coverUrl: coverUrl.trim(),
          visibility,
          accessMode,
          price: price.trim(),
          currency,
          allowlist: allowlist.trim(),
          createdAt: now,
        };
        const metadataPayload = createPaybyMetadataPayload(baseMetadata);
        const metadataJson = stableStringify(metadataPayload);
        const metadataHash = await sha256Hex(metadataJson);
        const committedMetadata: MediaMetadata = {
          ...baseMetadata,
          metadataUri: getShelbyUri(
            selectedNetwork,
            accountAddress,
            metadataBlobName,
          ),
          metadataHash,
        };
        mediaItems.push(committedMetadata);
        metadataBlobs.push({
          blobName: metadataBlobName,
          blobData: new TextEncoder().encode(
            stableStringify(createPaybyMetadataPayload(committedMetadata)),
          ),
        });

        return {
          blobName: file.name,
          blobData: new Uint8Array(await file.arrayBuffer()),
        };
      }),
    );
    const blobs = [...mediaBlobs, ...metadataBlobs];
    const pendingItems = files.map((file) => ({
      id: crypto.randomUUID(),
      owner: accountAddress,
      network: selectedNetwork,
      blobName: file.name,
      title: title.trim() || file.name,
      size: file.size,
      status: "preparing" as PendingPublishStatus,
      createdAt: now,
      updatedAt: now,
      transactionHash: "",
      error: "",
    }));
    activePublishRef.current = {
      pendingIds: pendingItems.map((item) => item.id),
      hash: "",
      mediaItems,
    };
    pendingPublishStore.upsertPublishes(pendingItems);

    const walletSigner = async (...args: Parameters<typeof signAndSubmitTransaction>) => {
      setPublishPhase("wallet");
      pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
        status: "wallet",
      });
      setStatusMessage(
        "Wallet prompt opened. Approve the Shelby registration transaction.",
      );

      try {
        const response = await signAndSubmitTransaction(...args);
        const hash = getTransactionHash(response);
        setTransactionHash(hash);
        activePublishRef.current.hash = hash;
        pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
          status: "confirming",
          transactionHash: hash,
          error: "",
        });
        if (hash) {
          transactionStore.upsertTransaction({
            id: crypto.randomUUID(),
            hash,
            network: selectedNetwork,
            status: "pending",
            label: "Shelby blob registration",
            detail: `Waiting for Aptos finality on ${PAYBY_NETWORKS[selectedNetwork].label}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        setPublishPhase("confirming");
        setStatusMessage(
          hash
            ? "Transaction submitted. Waiting for Aptos finality before Shelby stores the blobs."
            : "Transaction submitted. Waiting for Aptos finality before Shelby storage.",
        );
        return response;
      } catch (error) {
        const message = userFacingError(
          error,
          "Wallet rejected or failed to submit the transaction.",
        );
        pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
          status: "failed",
          error: message,
        });
        transactionStore.updateTransaction(activePublishRef.current.hash, {
          status: "failed",
          detail: message,
        });
        setPublishPhase("error");
        setStatusMessage(message);
        throw error;
      }
    };

    uploadBlobs.mutate({
      signer: {
        account: account ? { address: account.address } : null,
        signAndSubmitTransaction: walletSigner,
      },
      blobs,
      expirationMicros:
        Date.now() * 1000 + retentionDays * 24 * 60 * 60 * 1000 * 1000,
      maxConcurrentUploads: 3,
    });
  }

  return (
    <section className="workspace-layout publish-layout" id="publish">
      <div className="panel publish-panel">
        <div className="panel-header hero-panel-header">
          <div>
            <p className="muted">Publish to {PAYBY_NETWORKS[selectedNetwork].label}</p>
            <h2>Upload media blobs</h2>
            <span>
              Stage files, set retention, then approve the Shelby registration
              from your Aptos wallet.
            </span>
          </div>
          <UploadCloud size={24} />
        </div>

        <label className="dropzone premium-dropzone">
          <input
            type="file"
            multiple
            onChange={(event) => {
              setFiles(Array.from(event.target.files ?? []));
              setPublishPhase("idle");
              setTransactionHash("");
              setRegistryRetryItems([]);
              setStatusMessage("");
            }}
          />
          <span className="drop-icon">
            <UploadCloud size={30} />
          </span>
          <strong>Select media files</strong>
          <span>Video, audio, archives, images, or creator assets.</span>
        </label>

        <div className="metadata-form">
          <label>
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Fallbacks to file name"
            />
          </label>
          <label>
            <span>Category</span>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Premium media"
            />
          </label>
          <label className="form-wide">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What buyers or members should know about this media."
            />
          </label>
          <label>
            <span>Tags</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="video, course, archive"
            />
          </label>
          <label>
            <span>Cover URL</span>
            <input
              value={coverUrl}
              onChange={(event) => setCoverUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="access-grid">
          <label>
            <span>Visibility</span>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as VisibilityMode)}
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private metadata</option>
            </select>
          </label>
          <label>
            <span>Access policy</span>
            <select
              value={accessMode}
              onChange={(event) => setAccessMode(event.target.value as AccessMode)}
            >
              <option value="free">Free access</option>
              <option value="allowlist">Wallet allowlist</option>
              <option value="nft" disabled>
                NFT/pass holder - verifier needed
              </option>
              <option value="paid">Paid unlock</option>
              <option value="subscription" disabled>
                Subscriber only - verifier needed
              </option>
            </select>
          </label>
          <label>
            <span>Price</span>
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
            />
          </label>
          <label>
            <span>Currency</span>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as "APT" | "SHELBYUSD")}
            >
              <option value="APT">APT</option>
              <option value="SHELBYUSD">ShelbyUSD</option>
            </select>
          </label>
          <label className="form-wide">
            <span>Allowlist wallets or NFT collection</span>
            <textarea
              value={allowlist}
              onChange={(event) => setAllowlist(event.target.value)}
              placeholder="Wallet addresses, collection id, or pass notes. Enforcement uses the Payby Move contract."
            />
          </label>
        </div>

        <div className="retention-row">
          <label htmlFor="retention">Retention window</label>
          <input
            id="retention"
            type="range"
            min={1}
            max={90}
            value={retentionDays}
            onChange={(event) => setRetentionDays(Number(event.target.value))}
          />
          <strong>{retentionDays}d</strong>
        </div>

        <div className="file-review">
          <div>
            <span>Selected</span>
            <strong>{files.length} files</strong>
          </div>
          <div>
            <span>Total size</span>
            <strong>{fileSize(totalBytes)}</strong>
          </div>
        </div>

        {files.length > 0 && (
          <ul className="file-list">
            {files.map((file) => (
              <li key={`${file.name}-${file.lastModified}`}>
                <FileVideo size={17} />
                <span>{file.name}</span>
                <strong>{fileSize(file.size)}</strong>
              </li>
            ))}
          </ul>
        )}

        {(files.length > 0 || publishPhase !== "idle") && (
          <PublishProgress
            phase={publishPhase}
            selectedNetwork={selectedNetwork}
            transactionHash={transactionHash}
          />
        )}

        <div
          className={`publish-alert is-${publishNoticeTone}`}
          role={publishNoticeTone === "danger" ? "alert" : "status"}
        >
          {publishNoticeTone === "success" ? (
            <Check size={18} />
          ) : publishNoticeTone === "danger" || publishNoticeTone === "warning" ? (
            <AlertTriangle size={18} />
          ) : (
            <Clock size={18} />
          )}
          <div>
            <strong>{publishNoticeTitle}</strong>
            <span>{publishNoticeMessage}</span>
          </div>
        </div>

        <button
          className="button button-primary publish-button"
          type="button"
          disabled={registryRetryItems.length > 0 ? false : !canUpload}
          onClick={registryRetryItems.length > 0 ? handleRetryRegistry : handleUpload}
        >
          <PlugZap size={18} />
          {registryRetryItems.length > 0
            ? "Retry access registry"
            : uploadBlobs.isPending
            ? "Publishing..."
            : publishPhase === "error" && files.length > 0
              ? "Retry publish"
              : "Publish to Shelby"}
        </button>

      </div>

      <aside className="support-panel">
        <div>
          <p className="muted">Publish checklist</p>
          <h3>Ready state</h3>
        </div>
        <div className="publish-steps">
          <div className={accountAddress ? "is-complete" : ""}>
            <Check size={16} />
            <span>Wallet connected</span>
          </div>
          <div className={walletNetworkAligned ? "is-complete" : ""}>
            <Check size={16} />
            <span>Wallet network aligned</span>
          </div>
          <div className={files.length > 0 ? "is-complete" : ""}>
            <Check size={16} />
            <span>Files selected</span>
          </div>
          <div className={retentionDays > 0 ? "is-complete" : ""}>
            <Check size={16} />
            <span>Retention configured</span>
          </div>
          <div className={accessRegistryReady ? "is-complete" : ""}>
            <Check size={16} />
            <span>Access registry ready</span>
          </div>
        </div>
        <div className="network-mini-card">
          <span>Active route</span>
          <strong>{PAYBY_NETWORKS[selectedNetwork].label}</strong>
          <p>{PAYBY_NETWORKS[selectedNetwork].permanenceNote}</p>
        </div>
        <div className="network-mini-card">
          <span>Access enforcement</span>
          <strong>
            {accessMode === "free"
              ? "Free route"
              : accessRegistryReady
                ? "On-chain registry"
                : "Needs setup"}
          </strong>
          <p>
            {accessMode === "free"
              ? "Free media is served directly from Shelby."
              : accessRegistryReady
                ? "Payby will register this media policy in the marketplace contract after Shelby storage."
                : accessRegistryBlocker}
          </p>
        </div>
      </aside>
    </section>
  );
}

const publishStepOrder = [
  "preparing",
  "wallet",
  "confirming",
  "storing",
  "registry",
] as const;
type PublishProgressPhase = (typeof publishStepOrder)[number];

const publishStepCopy: Record<
  PublishProgressPhase,
  { label: string; detail: string }
> = {
  preparing: {
    label: "Prepare",
    detail: "Read files and build commitments",
  },
  wallet: {
    label: "Approve",
    detail: "Sign Shelby registration",
  },
  confirming: {
    label: "Finalize",
    detail: "Wait for Aptos finality",
  },
  storing: {
    label: "Store",
    detail: "Send blobs to Shelby RPC",
  },
  registry: {
    label: "Registry",
    detail: "Write access policy",
  },
};

function publishPhaseSummary(
  phase: PublishPhase,
  elapsedSeconds: number,
  transactionHash: string,
) {
  if (phase === "idle") {
    return {
      label: "Ready when files are selected",
      detail: "Payby will show every wallet, chain, Shelby, and registry step here.",
    };
  }

  if (phase === "preparing") {
    return {
      label: "Preparing Shelby payload",
      detail: "Reading selected files and building blob commitments before the wallet request.",
    };
  }

  if (phase === "wallet") {
    return {
      label: "Wallet approval required",
      detail: "Approve the Shelby registration in your Aptos wallet. Keep this tab open after approval.",
    };
  }

  if (phase === "confirming") {
    return {
      label: "Waiting for Aptos finality",
      detail:
        elapsedSeconds > 25
          ? "Still waiting on the network. This can happen on prototype routes; the transaction link stays available once a hash is returned."
          : transactionHash
            ? "Transaction submitted. Payby is waiting for finality before sending blob data to Shelby."
            : "Wallet submitted the transaction. Payby is waiting for the network response.",
    };
  }

  if (phase === "storing") {
    return {
      label: "Uploading to Shelby",
      detail: "The registration transaction was accepted. Payby is sending blob data to the active Shelby route.",
    };
  }

  if (phase === "registry") {
    return {
      label: "Writing access registry",
      detail: "Shelby storage is complete. Restricted access policy is being registered on Aptos.",
    };
  }

  if (phase === "success") {
    return {
      label: "Publish complete",
      detail: "Media is stored on Shelby. Vault indexing may take a few seconds to display it.",
    };
  }

  return {
    label: "Publish needs attention",
    detail: "The last step did not complete. Review the message below, then retry the publish or registry step.",
  };
}

function PublishProgress({
  phase,
  selectedNetwork,
  transactionHash,
}: {
  phase: PublishPhase;
  selectedNetwork: PaybyNetwork;
  transactionHash: string;
}) {
  const progressPhase = publishStepOrder.includes(
    phase as PublishProgressPhase,
  )
    ? (phase as PublishProgressPhase)
    : null;
  const activeIndex =
    phase === "success"
      ? publishStepOrder.length
      : progressPhase
        ? publishStepOrder.indexOf(progressPhase)
        : -1;
  const running =
    phase !== "idle" &&
    phase !== "success" &&
    phase !== "error";
  const elapsedSeconds = useElapsedSeconds(
    running,
    `${phase}-${transactionHash || "pending"}`,
  );
  const summary = publishPhaseSummary(phase, elapsedSeconds, transactionHash);

  return (
    <div className={`publish-progress ${phase === "error" ? "is-error" : ""}`}>
      <div className="publish-progress-head">
        <div>
          <span>
            {phase === "success" ? <Check size={15} /> : <Clock size={15} />}
            {summary.label}
          </span>
          <p>{summary.detail}</p>
        </div>
        <strong>
          {running
            ? formatElapsed(elapsedSeconds)
            : phase === "success"
              ? "Complete"
              : phase === "error"
                ? "Action needed"
                : "Idle"}
        </strong>
      </div>
      <div className="publish-progress-track" aria-label="Publish progress">
        {publishStepOrder.map((step, index) => {
          const complete = phase === "success" || activeIndex > index;
          const active = activeIndex === index;
          const copy = publishStepCopy[step];

          return (
            <div
              className={`publish-progress-step ${
                complete ? "is-complete" : ""
              } ${active ? "is-active" : ""}`}
              key={step}
            >
              <span>{complete ? <Check size={14} /> : index + 1}</span>
              <strong>{copy.label}</strong>
              <small>{copy.detail}</small>
            </div>
          );
        })}
      </div>
      {transactionHash ? (
        <a
          className="transaction-link"
          href={transactionExplorerUrl(selectedNetwork, transactionHash)}
          rel="noreferrer"
          target="_blank"
        >
          View transaction
          <ExternalLink size={14} />
        </a>
      ) : null}
    </div>
  );
}

function VaultList({
  accountAddress,
  selectedNetwork,
  shelbyClient,
  metadataStore,
  pendingPublishStore,
  onNavigate,
  addActivity,
}: {
  accountAddress: string;
  selectedNetwork: PaybyNetwork;
  shelbyClient: ShelbyClient;
  metadataStore: ReturnType<typeof useStoredMetadata>;
  pendingPublishStore: ReturnType<typeof usePendingPublishes>;
  onNavigate: (route: AppRoute) => void;
  addActivity: (item: ActivityInput) => void;
}) {
  const {
    account,
    network: walletNetwork,
    changeNetwork,
    signAndSubmitTransaction,
  } = useWallet();
  const [query, setQuery] = React.useState("");
  const [vaultPage, setVaultPage] = React.useState(1);
  const [actionMessage, setActionMessage] = React.useState("");
  const [chainIndexState, setChainIndexState] = React.useState<
    "idle" | "checking" | "synced" | "unavailable" | "error"
  >("idle");
  const [chainListingCount, setChainListingCount] = React.useState(0);
  const [salesSummary, setSalesSummary] = React.useState<CreatorSalesSummary>({
    saleCount: 0,
    revenue: "0",
  });
  const network = PAYBY_NETWORKS[selectedNetwork];
  const walletNetworkAligned = isWalletNetworkAligned(
    walletNetwork,
    selectedNetwork,
  );
  const blobsQuery = useAccountBlobs({
    account: accountAddress || "0x0",
    pagination: { limit: 100, offset: 0 },
    enabled: Boolean(accountAddress),
  });
  const deleteBlobs = useDeleteBlobs({
    client: shelbyClient,
    onSuccess: (_data, variables) => {
      variables.blobNames.forEach((blobName) => {
        metadataStore.removeMetadata(createMediaKey(accountAddress, blobName));
      });
      addActivity({
        type: "delete",
        label: `Deleted ${variables.blobNames.length} blob`,
        detail: variables.blobNames.join(", "),
      });
      setActionMessage("Delete transaction confirmed.");
      void blobsQuery.refetch();
    },
    onError: (error) => {
      setActionMessage(userFacingError(error, "Delete failed."));
    },
  });

  const blobs = ((blobsQuery.data ?? []) as (BlobMetadata & BlobLike)[]).filter((blob) => {
    const name = blob.blobNameSuffix ?? blob.name ?? blob.blobName ?? "";
    return name.toLowerCase().includes(query.toLowerCase());
  });
  const indexedBlobNames = React.useMemo(
    () =>
      ((blobsQuery.data ?? []) as (BlobMetadata & BlobLike)[])
        .map((blob) => blob.blobNameSuffix ?? blob.name ?? blob.blobName ?? "")
        .filter(Boolean),
    [blobsQuery.data],
  );
  const indexedBlobNameSet = React.useMemo(
    () => new Set(indexedBlobNames),
    [indexedBlobNames],
  );
  const pendingForAccount = pendingPublishStore.pendingPublishes.filter(
    (item) =>
      item.owner.toLowerCase() === accountAddress.toLowerCase() &&
      item.network === selectedNetwork &&
      `${item.title} ${item.blobName}`.toLowerCase().includes(query.toLowerCase()),
  );
  const visiblePending = pendingForAccount.filter(
    (item) =>
      item.status === "failed" ||
      (item.status !== "ready" && !indexedBlobNameSet.has(item.blobName)),
  );
  const activePendingCount = pendingForAccount.filter(
    (item) =>
      item.status !== "ready" &&
      item.status !== "failed" &&
      !indexedBlobNameSet.has(item.blobName),
  ).length;
  const totalBytes = blobs.reduce((total, blob) => total + (blob.size ?? 0), 0);
  const expiringSoonCount = blobs.filter((blob) => {
    const state = getExpiryState(blob.expirationMicros);
    return state.className === "is-warning" || state.className === "is-danger";
  }).length;
  const {
    pageItems: paginatedBlobs,
    pageCount: vaultPageCount,
    safePage: safeVaultPage,
  } = paginateItems(blobs, vaultPage, VAULT_PAGE_SIZE);

  React.useEffect(() => {
    setVaultPage(1);
  }, [accountAddress, query, selectedNetwork]);

  const syncCreatorChainListings = React.useCallback(async () => {
    if (!accountAddress) return;
    if (!PAYBY_NETWORKS[selectedNetwork].marketplaceContractAddress) {
      setChainIndexState("unavailable");
      return;
    }

    setChainIndexState("checking");
    try {
      const listings = await readCreatorChainListings(
        selectedNetwork,
        accountAddress,
      );
      setChainListingCount(listings.length);
      const recoveredMetadata = (
        await Promise.all(
          listings
            .filter(
              ({ blobName }) =>
                !metadataStore.metadata[createMediaKey(accountAddress, blobName)],
            )
            .map(async ({ blobName, listing }) =>
              (await fetchCommittedMetadata(
                selectedNetwork,
                accountAddress,
                blobName,
                listing,
              ).catch(() => null)) ??
              metadataFromChainListing(selectedNetwork, blobName, listing),
            ),
        )
      ).filter((item): item is MediaMetadata => Boolean(item));

      if (recoveredMetadata.length > 0) {
        metadataStore.saveMetadata(recoveredMetadata);
        setActionMessage(
          `Recovered ${recoveredMetadata.length} media ${recoveredMetadata.length === 1 ? "record" : "records"} from the marketplace registry.`,
        );
      }
      setChainIndexState("synced");
    } catch {
      setChainIndexState("error");
    }
  }, [accountAddress, metadataStore, selectedNetwork]);

  React.useEffect(() => {
    if (!accountAddress) return;
    void syncCreatorChainListings();
  }, [accountAddress, selectedNetwork]);

  React.useEffect(() => {
    if (!accountAddress || !PAYBY_NETWORKS[selectedNetwork].marketplaceContractAddress) {
      setSalesSummary({ saleCount: 0, revenue: "0" });
      return;
    }

    let cancelled = false;
    void readCreatorSalesSummary(selectedNetwork, accountAddress)
      .then((summary) => {
        if (!cancelled) setSalesSummary(summary ?? { saleCount: 0, revenue: "0" });
      })
      .catch(() => {
        if (!cancelled) setSalesSummary({ saleCount: 0, revenue: "0" });
      });

    return () => {
      cancelled = true;
    };
  }, [accountAddress, selectedNetwork]);

  React.useEffect(() => {
    pendingPublishStore.markIndexed(
      accountAddress,
      selectedNetwork,
      indexedBlobNames,
    );
  }, [
    accountAddress,
    indexedBlobNames,
    pendingPublishStore.markIndexed,
    selectedNetwork,
  ]);

  React.useEffect(() => {
    if (!accountAddress || activePendingCount === 0) return;

    void blobsQuery.refetch();
    const interval = window.setInterval(() => {
      void blobsQuery.refetch();
    }, 4_500);

    return () => window.clearInterval(interval);
  }, [accountAddress, activePendingCount, blobsQuery.refetch]);

  return (
    <section className="panel vault-panel" id="vault">
      <div className="panel-header hero-panel-header">
        <div>
          <p className="muted">Account media</p>
          <h2>Vault library</h2>
          <span>
            Search, inspect, and download Shelby blobs registered to the
            connected wallet.
          </span>
        </div>
        <Database size={24} />
      </div>

      <div className="vault-metrics">
        <div>
          <span>Blobs</span>
          <strong>{blobs.length}</strong>
        </div>
        <div>
          <span>Stored size</span>
          <strong>{fileSize(totalBytes)}</strong>
        </div>
        <div>
          <span>Route</span>
          <strong>{network.label}</strong>
        </div>
        <div>
          <span>Pending</span>
          <strong>{activePendingCount}</strong>
        </div>
        <div>
          <span>Chain index</span>
          <strong>
            {chainIndexState === "checking"
              ? "Syncing"
              : chainIndexState === "synced"
                ? `${chainListingCount}`
                : chainIndexState === "unavailable"
                  ? "No contract"
                  : chainIndexState === "error"
                    ? "Failed"
                    : "Ready"}
          </strong>
        </div>
        <div>
          <span>Expiring</span>
          <strong>{expiringSoonCount}</strong>
        </div>
        <div>
          <span>Sales</span>
          <strong>{salesSummary.saleCount}</strong>
        </div>
        <div>
          <span>Revenue</span>
          <strong>{formatAssetUnits(salesSummary.revenue)}</strong>
        </div>
      </div>

      <label className="search-box">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search blobs"
        />
      </label>

      <div className="library-source-banner">
        <ShieldCheck size={18} />
        <div>
          <strong>
            {chainIndexState === "checking"
              ? "Rebuilding creator index from Aptos"
              : chainIndexState === "synced"
                ? "Creator registry synced"
                : chainIndexState === "unavailable"
                  ? "Marketplace contract not configured"
                  : chainIndexState === "error"
                    ? "Creator registry sync failed"
                    : "Creator registry ready"}
          </strong>
          <p>
            Payby keeps Shelby blobs as media storage and uses the marketplace
            registry to recover missing titles, access policies, and public
            routes for this creator wallet.
          </p>
        </div>
        <button
          className="button button-secondary compact-button"
          type="button"
          disabled={chainIndexState === "checking" || !accountAddress}
          onClick={syncCreatorChainListings}
        >
          Refresh registry
          <ShieldCheck size={15} />
        </button>
      </div>

      <div className="library-source-banner creator-insight-banner">
        <CreditCard size={18} />
        <div>
          <strong>
            {salesSummary.saleCount > 0
              ? `${salesSummary.saleCount} on-chain ${salesSummary.saleCount === 1 ? "sale" : "sales"} recorded`
              : "No on-chain sales yet"}
          </strong>
          <p>
            Creator revenue is read from the Payby marketplace contract. Paid
            unlocks transfer the configured asset to the creator and update this
            summary after finality.
          </p>
        </div>
        <span className="creator-revenue-pill">
          {formatAssetUnits(salesSummary.revenue)}
        </span>
      </div>

      {(actionMessage || (!walletNetworkAligned && accountAddress)) && (
        <p className="inline-status">
          {actionMessage ||
            walletNetworkMismatchMessage(walletNetwork, selectedNetwork)}
        </p>
      )}

      {visiblePending.length > 0 ? (
        <PendingPublishQueue
          items={visiblePending}
          selectedNetwork={selectedNetwork}
          onPublish={() => onNavigate({ name: "publish" })}
          onDismiss={(id) => pendingPublishStore.removePublishes([id])}
        />
      ) : null}

      {!accountAddress ? (
        <EmptyState
          title="Wallet required"
          body="Connect an Aptos wallet to load the Shelby blobs registered to your account."
        />
      ) : blobsQuery.isLoading ? (
        <EmptyState title="Loading vault" body="Reading account blob metadata." />
      ) : blobsQuery.isError ? (
        <EmptyState
          title="Could not load blobs"
          body={(blobsQuery.error as Error)?.message ?? "Query failed."}
        />
      ) : blobs.length === 0 ? (
        <EmptyState
          title="No blobs yet"
          body="Publish creator media and it will appear here with download links."
          actionLabel="Publish media"
          onAction={() => onNavigate({ name: "publish" })}
        />
      ) : (
        <>
          <ul className="blob-list">
          {paginatedBlobs.map((blob) => {
            const name = blob.blobNameSuffix ?? blob.name ?? blob.blobName ?? "untitled";
            const metadata = metadataStore.metadata[createMediaKey(accountAddress, name)];
            const url = getDownloadUrl(selectedNetwork, accountAddress, name);
            const expiryState = getExpiryState(blob.expirationMicros);
            return (
              <li key={`${name}-${blob.creationMicros ?? ""}`}>
                <div className="blob-icon">
                  <FileArchive size={18} />
                </div>
                <div>
                  <strong>{metadata?.title || name}</strong>
                  <span>
                    {fileSize(blob.size)} - Expires {formatMicros(blob.expirationMicros)}
                  </span>
                </div>
                <span className={`expiry-pill ${expiryState.className}`}>
                  {expiryState.label}
                </span>
                <button
                  className="button button-ghost compact-button"
                  type="button"
                  onClick={() =>
                    onNavigate({
                      name: "detail",
                      owner: accountAddress,
                      blobName: name,
                    })
                  }
                >
                  Detail
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Share ${name}`}
                  title={`Share ${name}`}
                  onClick={async () => {
                    await navigator.clipboard.writeText(getShareUrl(accountAddress, name));
                    addActivity({
                      type: "share",
                      label: "Copied share link",
                      detail: name,
                    });
                  }}
                >
                  <Share2 size={17} />
                </button>
                <a className="icon-button" href={url} target="_blank" rel="noreferrer">
                  <Download size={17} />
                </a>
                <button
                  className="icon-button danger-button"
                  type="button"
                  aria-label={`Delete ${name}`}
                  title={`Delete ${name}`}
                  disabled={!account || deleteBlobs.isPending}
                  onClick={async () => {
                    if (!account) return;
                    if (!walletNetworkAligned) {
                      await requestWalletNetworkChange({
                        changeNetwork,
                        network: walletNetwork,
                        selectedNetwork,
                        setStatusMessage: setActionMessage,
                      });
                      return;
                    }
                    deleteBlobs.mutate({
                      signer: {
                        account: { address: account.address },
                        signAndSubmitTransaction,
                      },
                      blobNames: [name],
                    });
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </li>
            );
          })}
          </ul>
          <PaginationControls
            label="Vault pagination"
            page={safeVaultPage}
            pageCount={vaultPageCount}
            total={blobs.length}
            pageSize={VAULT_PAGE_SIZE}
            onPageChange={setVaultPage}
          />
        </>
      )}
    </section>
  );
}

function PendingPublishQueue({
  items,
  selectedNetwork,
  onPublish,
  onDismiss,
}: {
  items: PendingPublishItem[];
  selectedNetwork: PaybyNetwork;
  onPublish: () => void;
  onDismiss: (id: string) => void;
}) {
  const failedCount = items.filter((item) => item.status === "failed").length;
  const activeCount = items.length - failedCount;

  return (
    <section className="pending-publish-card" aria-label="Pending publish queue">
      <div className="pending-publish-head">
        <div>
          <span>Publish queue</span>
          <strong>
            {failedCount > 0
              ? `${failedCount} needs attention`
              : `${activeCount} waiting for vault sync`}
          </strong>
        </div>
        <button className="button button-ghost compact-button" type="button" onClick={onPublish}>
          Publish
          <ArrowRight size={15} />
        </button>
      </div>
      <ul className="pending-publish-list">
        {items.map((item) => (
          <li className={`pending-publish-item is-${item.status}`} key={item.id}>
            <span className="pending-state-dot" aria-hidden="true" />
            <div>
              <strong>{item.title}</strong>
              <p>{pendingStatusDetail(item.status)}</p>
              {item.error ? <small>{item.error}</small> : null}
            </div>
            <span>{fileSize(item.size)}</span>
            {item.transactionHash ? (
              <a
                className="transaction-link"
                href={transactionExplorerUrl(selectedNetwork, item.transactionHash)}
                rel="noreferrer"
                target="_blank"
              >
                Tx
                <ExternalLink size={14} />
              </a>
            ) : (
              <em>{pendingStatusLabel(item.status)}</em>
            )}
            {item.status === "failed" ? (
              <button
                className="icon-button"
                type="button"
                aria-label={`Dismiss failed publish ${item.title}`}
                title="Dismiss failed publish"
                onClick={() => onDismiss(item.id)}
              >
                <X size={15} />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PaginationControls({
  label,
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  label: string;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <nav className="pagination-bar" aria-label={label}>
      <span>
        {start}-{end} of {total}
      </span>
      <div>
        <button
          className="button button-secondary compact-button"
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <strong>
          Page {page} / {pageCount}
        </strong>
        <button
          className="button button-secondary compact-button"
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <FileArchive size={30} />
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
      {actionLabel && onAction ? (
        <button className="button button-secondary compact-button" type="button" onClick={onAction}>
          {actionLabel}
          <ArrowRight size={15} />
        </button>
      ) : null}
    </div>
  );
}

function MediaDetailPage({
  owner,
  blobName,
  selectedNetwork,
  shelbyClient,
  metadataStore,
  onNavigate,
  addActivity,
}: {
  owner: string;
  blobName: string;
  selectedNetwork: PaybyNetwork;
  shelbyClient: ShelbyClient;
  metadataStore: ReturnType<typeof useStoredMetadata>;
  onNavigate: (route: AppRoute) => void;
  addActivity: (item: ActivityInput) => void;
}) {
  const {
    account,
    network: walletNetwork,
    changeNetwork,
    signAndSubmitTransaction,
  } = useWallet();
  const [actionMessage, setActionMessage] = React.useState("");
  const walletNetworkAligned = isWalletNetworkAligned(
    walletNetwork,
    selectedNetwork,
  );
  const key = createMediaKey(owner, blobName);
  const metadata = metadataStore.metadata[key];
  const blobQuery = useBlobMetadata({
    client: shelbyClient,
    account: owner,
    name: blobName,
    enabled: Boolean(owner && blobName),
  });
  const [chainListing, setChainListing] = React.useState<ChainListing | null>(null);
  const [chainListingState, setChainListingState] = React.useState<
    "checking" | "found" | "missing" | "error" | "unconfigured"
  >("checking");
  const [registryRepairing, setRegistryRepairing] = React.useState(false);
  const [allowlistDraft, setAllowlistDraft] = React.useState("");
  const [allowlistSaving, setAllowlistSaving] = React.useState(false);
  const deleteBlobs = useDeleteBlobs({
    client: shelbyClient,
    onSuccess: () => {
      metadataStore.removeMetadata(key);
      addActivity({
        type: "delete",
        label: "Deleted blob",
        detail: blobName,
      });
      setActionMessage("Delete transaction confirmed.");
      onNavigate({ name: "vault" });
    },
    onError: (error) => {
      setActionMessage(userFacingError(error, "Delete failed."));
    },
  });
  const shelbyBlobUrl = getDownloadUrl(selectedNetwork, owner, blobName);
  const shareUrl = getShareUrl(owner, blobName);
  const blobData = blobQuery.data as (BlobMetadata & BlobLike) | undefined;
  const expiryState = getExpiryState(blobData?.expirationMicros);
  const registryState = metadataRegistryLabel(metadataStore.syncState);
  const chainAccessMode = chainListing?.found
    ? policyIdToAccessMode(chainListing.policy)
    : undefined;
  const accessPolicy = accessModeLabel(chainAccessMode ?? metadata?.accessMode);
  const chainRegistryLabel =
    chainListingState === "found"
      ? chainListing?.active
        ? "On-chain policy active"
        : "On-chain policy inactive"
      : chainListingState === "missing"
        ? "On-chain policy missing"
        : chainListingState === "unconfigured"
          ? "Marketplace not configured"
          : chainListingState === "error"
            ? "Chain read failed"
            : "Checking chain";
  const needsRegistryRepair =
    Boolean(metadata) &&
    metadata.accessMode !== "free" &&
    (chainListingState === "missing" ||
      chainListingState === "error" ||
      (chainListingState === "found" && !chainListing?.active));

  React.useEffect(() => {
    setAllowlistDraft(metadata?.allowlist ?? "");
  }, [metadata?.allowlist]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadListing() {
      if (!PAYBY_NETWORKS[selectedNetwork].marketplaceContractAddress) {
        setChainListing(null);
        setChainListingState("unconfigured");
        return;
      }

      setChainListingState("checking");
      try {
        const listing = await readChainListing(selectedNetwork, owner, blobName);
        if (cancelled) return;
        setChainListing(listing);
        setChainListingState(listing?.found ? "found" : "missing");
      } catch {
        if (cancelled) return;
        setChainListing(null);
        setChainListingState("error");
      }
    }

    void loadListing();

    return () => {
      cancelled = true;
    };
  }, [blobName, selectedNetwork]);

  async function repairRegistry() {
    if (!metadata || !account) {
      setActionMessage("Connect the creator wallet before repairing registry.");
      return;
    }
    if (!walletNetworkAligned) {
      await requestWalletNetworkChange({
        changeNetwork,
        network: walletNetwork,
        selectedNetwork,
        setStatusMessage: setActionMessage,
      });
      return;
    }
    const functionId = marketplaceFunction(
      selectedNetwork,
      "upsert_listing_for_owner_with_metadata",
    );
    if (!functionId) {
      setActionMessage("Payby marketplace contract is not configured.");
      return;
    }

    setRegistryRepairing(true);
    setActionMessage("Submitting access policy repair transaction.");
    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: functionId,
          functionArguments: [
            blobName,
            metadata.title || blobName,
            ACCESS_POLICY_IDS[metadata.accessMode],
            parseAssetUnits(metadata.price),
            PAYBY_NETWORKS[selectedNetwork].paymentAssetMetadataAddress ||
              ZERO_ADDRESS,
            parseAllowlistAddresses(metadata.allowlist),
            metadata.metadataUri || "",
            metadata.metadataHash || "",
          ],
        },
      });
      const hash = getTransactionHash(response);
      setActionMessage("Registry repair submitted. Waiting for Aptos finality.");
      await waitForTransaction(selectedNetwork, hash);
      const listing = await readChainListing(selectedNetwork, owner, blobName);
      setChainListing(listing);
      setChainListingState(listing?.found ? "found" : "missing");
      setActionMessage("Access policy repaired on-chain.");
      addActivity({
        type: "metadata",
        label: "Repaired access registry",
        detail: blobName,
      });
    } catch (error) {
      setChainListingState("error");
      setActionMessage(userFacingError(error, "Registry repair failed."));
    } finally {
      setRegistryRepairing(false);
    }
  }

  async function updateAllowlistPolicy() {
    if (!metadata || !account) {
      setActionMessage("Connect the creator wallet before updating allowlist.");
      return;
    }
    if (metadata.accessMode !== "allowlist") {
      setActionMessage("Allowlist management is available for allowlist media.");
      return;
    }
    if (getAccountAddress(account).toLowerCase() !== owner.toLowerCase()) {
      setActionMessage("Only the creator wallet can update this allowlist.");
      return;
    }
    if (!walletNetworkAligned) {
      await requestWalletNetworkChange({
        changeNetwork,
        network: walletNetwork,
        selectedNetwork,
        setStatusMessage: setActionMessage,
      });
      return;
    }

    const functionId = marketplaceFunction(
      selectedNetwork,
      "upsert_listing_for_owner_with_metadata",
    );
    if (!functionId) {
      setActionMessage("Payby marketplace contract is not configured.");
      return;
    }

    setAllowlistSaving(true);
    setActionMessage("Submitting allowlist update to Aptos.");
    try {
      const nextMetadata = {
        ...metadata,
        allowlist: allowlistDraft.trim(),
      };
      const response = await signAndSubmitTransaction({
        data: {
          function: functionId,
          functionArguments: [
            blobName,
            nextMetadata.title || blobName,
            ACCESS_POLICY_IDS.allowlist,
            parseAssetUnits(nextMetadata.price),
            PAYBY_NETWORKS[selectedNetwork].paymentAssetMetadataAddress ||
              ZERO_ADDRESS,
            parseAllowlistAddresses(nextMetadata.allowlist),
            nextMetadata.metadataUri || "",
            nextMetadata.metadataHash || "",
          ],
        },
      });
      const hash = getTransactionHash(response);
      setActionMessage("Allowlist update submitted. Waiting for Aptos finality.");
      await waitForTransaction(selectedNetwork, hash);
      metadataStore.saveMetadata([nextMetadata]);
      const listing = await readChainListing(selectedNetwork, owner, blobName);
      setChainListing(listing);
      setChainListingState(listing?.found ? "found" : "missing");
      setActionMessage("Allowlist policy updated on-chain.");
      addActivity({
        type: "metadata",
        label: "Updated allowlist",
        detail: blobName,
      });
    } catch (error) {
      setActionMessage(userFacingError(error, "Allowlist update failed."));
    } finally {
      setAllowlistSaving(false);
    }
  }

  return (
    <section className="workspace-layout detail-layout">
      <div className="panel detail-panel">
        <div className="panel-header hero-panel-header">
          <div>
            <p className="muted">{metadata?.category || "Media detail"}</p>
            <h2>{metadata?.title || blobName}</h2>
            <span>{metadata?.description || "Shelby blob registered to this wallet."}</span>
          </div>
          <FileVideo size={24} />
        </div>

        <MediaPreview
          url={shelbyBlobUrl}
          title={metadata?.title || blobName}
          blobName={blobName}
        />

        <section className={`media-lifecycle-card ${expiryState.className}`}>
          <div>
            <Clock size={18} />
            <span>Retention status</span>
            <strong>{expiryState.label}</strong>
            <p>{expiryState.detail}</p>
          </div>
          <button
            className="button button-secondary compact-button"
            type="button"
            onClick={() => onNavigate({ name: "publish" })}
          >
            Re-publish flow
            <ArrowRight size={15} />
          </button>
        </section>

        <div className="detail-meta-grid">
          <DetailItem label="Owner" value={shortenAddress(owner)} />
          <DetailItem label="Blob name" value={blobName} />
          <DetailItem label="Size" value={fileSize(blobData?.size)} />
          <DetailItem
            label="Expires"
            value={formatMicros(blobData?.expirationMicros)}
          />
          <DetailItem label="Visibility" value={metadata?.visibility || "Unknown"} />
          <DetailItem label="Access" value={accessPolicy} />
          <DetailItem label="Shelby route" value={PAYBY_NETWORKS[selectedNetwork].label} />
          <DetailItem label="Registry cache" value={registryState} />
          <DetailItem label="Chain policy" value={chainRegistryLabel} />
        </div>

        <section className="media-proof-card" aria-label="Shelby media proof">
          <div className="media-proof-head">
            <div>
              <span>Shelby media proof</span>
              <strong>Routes and access evidence for this blob</strong>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="media-proof-grid">
            <div>
              <span>Shelby RPC</span>
              <code>{PAYBY_NETWORKS[selectedNetwork].shelbyRpcUrl}</code>
            </div>
            <div>
              <span>Blob route</span>
              <code>{shelbyBlobUrl}</code>
            </div>
            <div>
              <span>Public link</span>
              <code>{shareUrl}</code>
            </div>
            <div>
              <span>Access policy</span>
              <strong>{accessPolicy}</strong>
            </div>
            <div>
              <span>Marketplace contract</span>
              <code>
                {PAYBY_NETWORKS[selectedNetwork].marketplaceContractAddress ||
                  "Not configured"}
              </code>
            </div>
            <div>
              <span>Registry function</span>
              <code>payby_marketplace::get_listing</code>
            </div>
            <div>
              <span>Policy price</span>
              <strong>
                {chainListing?.found
                  ? formatAssetUnits(chainListing.price, metadata?.currency ?? "APT")
                  : metadata?.price
                    ? `${metadata.price} ${metadata.currency}`
                    : "0"}
              </strong>
            </div>
            <div>
              <span>Payment asset</span>
              <code>
                {chainListing?.paymentMetadata ||
                  PAYBY_NETWORKS[selectedNetwork].paymentAssetMetadataAddress ||
                  "Not configured"}
              </code>
            </div>
            <div>
              <span>Retrieval mode</span>
              <strong>Direct Shelby</strong>
            </div>
            <div>
              <span>On-chain registry</span>
              <strong>{chainRegistryLabel}</strong>
            </div>
          </div>
        </section>

        {metadata?.tags.length ? (
          <div className="tag-row">
            {metadata.tags.map((tag) => (
              <span key={tag}>
                <Tag size={14} />
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <aside className="support-panel">
        <div>
          <p className="muted">Actions</p>
          <h3>Manage media</h3>
        </div>
        <a className="button button-primary" href={shelbyBlobUrl} target="_blank" rel="noreferrer">
          <Download size={17} />
          Download
        </a>
        <button
          className="button button-secondary"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl);
            addActivity({
              type: "share",
              label: "Copied share link",
              detail: blobName,
            });
          }}
        >
          <Share2 size={17} />
          Copy share link
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(shelbyBlobUrl);
            setActionMessage("Shelby blob route copied.");
          }}
        >
          <Database size={17} />
          Copy Shelby route
        </button>
        <button
          className="button button-ghost"
          type="button"
          onClick={() =>
            onNavigate({
              name: "share",
              owner,
              blobName,
            })
          }
        >
          <ExternalLink size={17} />
          Open public page
        </button>
        <button
          className="button danger-action"
          type="button"
          disabled={!account || deleteBlobs.isPending}
          onClick={async () => {
            if (!account) return;
            if (!walletNetworkAligned) {
              await requestWalletNetworkChange({
                changeNetwork,
                network: walletNetwork,
                selectedNetwork,
                setStatusMessage: setActionMessage,
              });
              return;
            }
            deleteBlobs.mutate({
              signer: {
                account: { address: account.address },
                signAndSubmitTransaction,
              },
              blobNames: [blobName],
            });
          }}
        >
          <Trash2 size={17} />
          Delete on-chain
        </button>
        {(actionMessage || !walletNetworkAligned) && (
          <p className="inline-status">
            {actionMessage ||
              walletNetworkMismatchMessage(walletNetwork, selectedNetwork)}
          </p>
        )}
        <div className="network-mini-card">
          <span>On-chain listing</span>
          <strong>{chainRegistryLabel}</strong>
          <p>
            {chainListingState === "found"
              ? "Payby found this blob policy in the marketplace contract."
              : chainListingState === "missing"
                ? "This Shelby blob exists locally, but no marketplace policy was found for the blob name."
                : chainListingState === "unconfigured"
                  ? "Set the marketplace contract address to verify policy state."
                  : chainListingState === "error"
                    ? "Payby could not read the listing view from the active fullnode."
                    : "Reading marketplace view from Aptos."}
          </p>
        </div>
        {needsRegistryRepair ? (
          <button
            className="button button-primary"
            type="button"
            disabled={registryRepairing || !account}
            onClick={repairRegistry}
          >
            <PlugZap size={17} />
            {registryRepairing ? "Repairing registry..." : "Register access policy"}
          </button>
        ) : null}
        {metadata?.accessMode === "allowlist" ? (
          <div className="allowlist-manager">
            <span>Allowlist wallets</span>
            <textarea
              value={allowlistDraft}
              onChange={(event) => setAllowlistDraft(event.target.value)}
              placeholder="0x..., 0x..."
            />
            <button
              className="button button-primary compact-button"
              type="button"
              disabled={allowlistSaving || !account}
              onClick={updateAllowlistPolicy}
            >
              <ShieldCheck size={15} />
              {allowlistSaving ? "Updating..." : "Update on-chain"}
            </button>
            <p>
              This submits a marketplace transaction and replaces the allowlist
              stored for this blob policy.
            </p>
          </div>
        ) : null}
        <div className="network-mini-card">
          <span>Lifecycle</span>
          <strong>{expiryState.label}</strong>
          <p>
            {expiryState.detail} Shelby React currently exposes delete and
            upload hooks here; extension needs a supported renewal method or a
            re-publish flow.
          </p>
        </div>
      </aside>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getMediaExtension(value: string) {
  let decodedValue = value.split("?")[0] ?? value;
  try {
    decodedValue = decodeURIComponent(decodedValue);
  } catch {
    decodedValue = value;
  }

  const cleanValue = decodedValue
    .split("#")[0]
    .trim()
    .toLowerCase();
  const match = cleanValue.match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

function MediaPreview({
  url,
  title,
  blobName,
}: {
  url: string;
  title: string;
  blobName?: string;
}) {
  const extension =
    getMediaExtension(blobName ?? "") ||
    getMediaExtension(title) ||
    getMediaExtension(url);
  const isImage = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "avif",
    "bmp",
    "svg",
  ].includes(extension);
  const isVideo = ["mp4", "webm", "mov", "m4v", "ogv"].includes(extension);
  const isAudio = ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension);
  const isPdf = extension === "pdf";

  return (
    <div className="media-preview">
      {isImage ? <img src={url} alt={title} loading="lazy" /> : null}
      {isVideo ? <video src={url} controls playsInline preload="metadata" /> : null}
      {isAudio ? <audio src={url} controls preload="metadata" /> : null}
      {isPdf ? <iframe src={url} title={title} /> : null}
      {!isImage && !isVideo && !isAudio && !isPdf ? (
        <div>
          <PlayCircle size={42} />
          <strong>Preview unavailable</strong>
          <span>Download the blob or open it in a new tab.</span>
        </div>
      ) : null}
    </div>
  );
}

function ProfilePanel({
  profile,
  saveProfile,
  accountAddress,
  mediaCount,
  addActivity,
}: {
  profile: CreatorProfile;
  saveProfile: (profile: CreatorProfile) => void;
  accountAddress: string;
  mediaCount: number;
  addActivity: (item: ActivityInput) => void;
}) {
  const [draft, setDraft] = React.useState(profile);

  return (
    <section className="workspace-layout profile-layout">
      <div className="panel profile-panel">
        <div className="panel-header hero-panel-header">
          <div>
            <p className="muted">Creator profile</p>
            <h2>{profile.displayName}</h2>
            <span>Local public identity used across Payby share pages.</span>
          </div>
          <User size={24} />
        </div>
        <div className="metadata-form">
          <label>
            <span>Display name</span>
            <input
              value={draft.displayName}
              onChange={(event) =>
                setDraft({ ...draft, displayName: event.target.value })
              }
            />
          </label>
          <label>
            <span>Handle</span>
            <input
              value={draft.handle}
              onChange={(event) => setDraft({ ...draft, handle: event.target.value })}
            />
          </label>
          <label className="form-wide">
            <span>Bio</span>
            <textarea
              value={draft.bio}
              onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
            />
          </label>
          <label>
            <span>Avatar URL</span>
            <input
              value={draft.avatarUrl}
              onChange={(event) =>
                setDraft({ ...draft, avatarUrl: event.target.value })
              }
            />
          </label>
          <label>
            <span>Website</span>
            <input
              value={draft.website}
              onChange={(event) => setDraft({ ...draft, website: event.target.value })}
            />
          </label>
        </div>
        <button
          className="button button-primary publish-button"
          type="button"
          onClick={() => {
            saveProfile(draft);
            addActivity({
              type: "metadata",
              label: "Updated creator profile",
              detail: draft.displayName,
            });
          }}
        >
          <Check size={17} />
          Save profile
        </button>
      </div>
      <aside className="support-panel profile-card-preview">
        <div className="avatar-preview">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <User size={34} />}
        </div>
        <strong>{profile.displayName}</strong>
        <span>@{profile.handle}</span>
        <p>{profile.bio}</p>
        <DetailItem label="Wallet" value={shortenAddress(accountAddress)} />
        <DetailItem label="Registered media" value={`${mediaCount}`} />
      </aside>
    </section>
  );
}

function ActivityPanel({
  activity,
  transactions,
  accountAddress,
  selectedNetwork,
  onNavigate,
}: {
  activity: ActivityItem[];
  transactions: TransactionItem[];
  accountAddress: string;
  selectedNetwork: PaybyNetwork;
  onNavigate: (route: AppRoute) => void;
}) {
  const [filter, setFilter] = React.useState<
    "all" | TransactionStatus | "local"
  >("all");
  const [transactionPage, setTransactionPage] = React.useState(1);
  const [localPage, setLocalPage] = React.useState(1);
  const confirmedCount = transactions.filter((item) => item.status === "confirmed").length;
  const pendingCount = transactions.filter((item) => item.status === "pending").length;
  const failedCount = transactions.filter((item) => item.status === "failed").length;
  const filteredTransactions =
    filter === "all" || filter === "local"
      ? transactions
      : transactions.filter((item) => item.status === filter);
  const showLocalEvents = filter === "all" || filter === "local";
  const hasProofItems =
    filteredTransactions.length > 0 || (showLocalEvents && activity.length > 0);
  const {
    pageItems: paginatedTransactions,
    pageCount: transactionPageCount,
    safePage: safeTransactionPage,
  } = paginateItems(filteredTransactions, transactionPage, ACTIVITY_PAGE_SIZE);
  const {
    pageItems: paginatedActivity,
    pageCount: localPageCount,
    safePage: safeLocalPage,
  } = paginateItems(activity, localPage, ACTIVITY_PAGE_SIZE);
  const filters: { value: "all" | TransactionStatus | "local"; label: string }[] = [
    { value: "all", label: "All proof" },
    { value: "confirmed", label: "Confirmed" },
    { value: "pending", label: "Pending" },
    { value: "failed", label: "Failed" },
    { value: "local", label: "Local events" },
  ];

  React.useEffect(() => {
    setTransactionPage(1);
    setLocalPage(1);
  }, [accountAddress, filter, selectedNetwork]);

  return (
    <section className="panel activity-panel">
      <div className="panel-header hero-panel-header">
        <div>
          <p className="muted">Recent actions</p>
          <h2>Activity feed</h2>
          <span>
            Showing only activity for {accountAddress ? shortenAddress(accountAddress) : "the connected wallet"} on{" "}
            {PAYBY_NETWORKS[selectedNetwork].label}.
          </span>
        </div>
        <Activity size={24} />
      </div>

      <div className="proof-summary" aria-label="Payby proof summary">
        <div>
          <ReceiptText size={18} />
          <span>Transactions</span>
          <strong>{transactions.length}</strong>
        </div>
        <div>
          <Check size={18} />
          <span>Confirmed</span>
          <strong>{confirmedCount}</strong>
        </div>
        <div>
          <Clock size={18} />
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>
        <div>
          <AlertTriangle size={18} />
          <span>Failed</span>
          <strong>{failedCount}</strong>
        </div>
      </div>

      <div className="proof-filter" aria-label="Activity filters">
        <Filter size={15} />
        {filters.map((item) => (
          <button
            className={filter === item.value ? "is-active" : ""}
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredTransactions.length > 0 ? (
        <section className="transaction-history" aria-label="Transaction history">
          <div className="transaction-history-head">
            <span>Transaction history</span>
            <strong>{filteredTransactions.length} shown</strong>
          </div>
          <ul>
            {paginatedTransactions.map((item) => (
              <li className={`is-${item.status}`} key={item.id}>
                <span>{item.status}</span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                  <time>{new Date(item.updatedAt).toLocaleString()}</time>
                </div>
                <a
                  className="transaction-link"
                  href={transactionExplorerUrl(item.network, item.hash)}
                  rel="noreferrer"
                  target="_blank"
                >
                  Explorer
                  <ExternalLink size={14} />
                </a>
              </li>
            ))}
          </ul>
          <PaginationControls
            label="Transaction pagination"
            page={safeTransactionPage}
            pageCount={transactionPageCount}
            total={filteredTransactions.length}
            pageSize={ACTIVITY_PAGE_SIZE}
            onPageChange={setTransactionPage}
          />
        </section>
      ) : null}

      {!hasProofItems ? (
        <EmptyState
          title={filter === "all" ? "No activity yet" : "No matching proof"}
          body={
            filter === "all"
              ? "Publish media, copy share links, or update your profile to populate this feed."
              : "Try a different filter or publish media to create new proof events."
          }
          actionLabel="Start publishing"
          onAction={() => onNavigate({ name: "publish" })}
        />
      ) : showLocalEvents && activity.length > 0 ? (
        <>
          <ul className="activity-list">
            {paginatedActivity.map((item) => (
              <li key={item.id}>
                <span>{item.type}</span>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
                <time>{new Date(item.at).toLocaleString()}</time>
              </li>
            ))}
          </ul>
          <PaginationControls
            label="Local activity pagination"
            page={safeLocalPage}
            pageCount={localPageCount}
            total={activity.length}
            pageSize={ACTIVITY_PAGE_SIZE}
            onPageChange={setLocalPage}
          />
        </>
      ) : null}
    </section>
  );
}

function BuyerLibraryPanel({
  accountAddress,
  selectedNetwork,
  metadataStore,
  purchaseStore,
  onNavigate,
}: {
  accountAddress: string;
  selectedNetwork: PaybyNetwork;
  metadataStore: ReturnType<typeof useStoredMetadata>;
  purchaseStore: ReturnType<typeof usePurchaseReceipts>;
  onNavigate: (route: AppRoute) => void;
}) {
  const [indexState, setIndexState] = React.useState<
    "idle" | "checking" | "ready"
  >("idle");
  const [copiedKey, setCopiedKey] = React.useState("");
  const [libraryPage, setLibraryPage] = React.useState(1);
  const [accessProofs, setAccessProofs] = React.useState<
    Record<string, ChainAccessProofState>
  >({});
  const upsertReceipt = purchaseStore.upsertReceipt;
  const receipts = React.useMemo(
    () =>
      purchaseStore.receipts.filter(
        (receipt) =>
          receipt.buyer.toLowerCase() === accountAddress.toLowerCase() &&
          receipt.network === selectedNetwork,
      ),
    [accountAddress, purchaseStore.receipts, selectedNetwork],
  );
  const purchaseCount = receipts.filter(
    (receipt) => receipt.accessType === "purchase",
  ).length;
  const sessionCount = receipts.filter(
    (receipt) => receipt.accessType === "session",
  ).length;
  const lastReceipt = receipts[0];
  const {
    pageItems: paginatedReceipts,
    pageCount: libraryPageCount,
    safePage: safeLibraryPage,
  } = paginateItems(receipts, libraryPage, VAULT_PAGE_SIZE);

  React.useEffect(() => {
    if (!accountAddress) {
      setIndexState("idle");
      return;
    }

    let cancelled = false;
    setIndexState("checking");
    void loadOnChainPurchaseIndex(accountAddress, selectedNetwork)
      .then((items) => {
        if (cancelled) return;
        items.forEach((item) => upsertReceipt(item));
        setIndexState("ready");
      })
      .catch(() => {
        if (!cancelled) setIndexState("ready");
      });

    return () => {
      cancelled = true;
    };
  }, [accountAddress, selectedNetwork, upsertReceipt]);

  React.useEffect(() => {
    setLibraryPage(1);
  }, [accountAddress, selectedNetwork, receipts.length]);

  async function copyShareLink(receipt: PurchaseReceipt) {
    await navigator.clipboard.writeText(getShareUrl(receipt.creator, receipt.blobName));
    setCopiedKey(createReceiptKey(receipt.buyer, receipt.network, receipt.creator, receipt.blobName));
    window.setTimeout(() => setCopiedKey(""), 1400);
  }

  async function refreshReceiptProof(receipt: PurchaseReceipt) {
    const receiptKey = createReceiptKey(
      receipt.buyer,
      receipt.network,
      receipt.creator,
      receipt.blobName,
    );
    setAccessProofs((current) => ({ ...current, [receiptKey]: "checking" }));

    try {
      const access = await readChainAccess(
        receipt.network,
        receipt.creator,
        accountAddress,
        receipt.blobName,
      );
      setAccessProofs((current) => ({
        ...current,
        [receiptKey]:
          access === null ? "unconfigured" : access ? "allowed" : "denied",
      }));
    } catch {
      setAccessProofs((current) => ({ ...current, [receiptKey]: "error" }));
    }
  }

  function proofLabel(state: ChainAccessProofState) {
    if (state === "checking") return "Checking chain";
    if (state === "allowed") return "On-chain access";
    if (state === "denied") return "No chain access";
    if (state === "error") return "Proof failed";
    if (state === "unconfigured") return "No contract";
    return "Proof not checked";
  }

  return (
    <section className="panel buyer-library-panel">
      <div className="panel-header hero-panel-header">
        <div>
          <p className="muted">Buyer workspace</p>
          <h2>Buyer library</h2>
          <span>
            Media unlocked by this wallet. Local receipts are used now and the
            interface is ready for on-chain purchase index reads.
          </span>
        </div>
        <ReceiptText size={24} />
      </div>

      <div className="buyer-library-summary" aria-label="Buyer library summary">
        <div>
          <ReceiptText size={18} />
          <span>Library items</span>
          <strong>{receipts.length}</strong>
        </div>
        <div>
          <CreditCard size={18} />
          <span>Purchases</span>
          <strong>{purchaseCount}</strong>
        </div>
        <div>
          <KeyRound size={18} />
          <span>Wallet sessions</span>
          <strong>{sessionCount}</strong>
        </div>
        <div>
          <Clock size={18} />
          <span>Last unlock</span>
          <strong>{lastReceipt ? new Date(lastReceipt.confirmedAt).toLocaleDateString() : "None"}</strong>
        </div>
      </div>

      <div className="library-source-banner">
        <ShieldCheck size={18} />
        <div>
          <strong>
            {indexState === "checking"
              ? "Checking on-chain purchase index"
              : indexState === "ready"
                ? "Purchase index synced"
                : "Connect wallet to load buyer receipts"}
          </strong>
          <p>
            Payby restores local receipts first, then refreshes buyer purchase
            records from the marketplace contract when the current deployment
            exposes indexed purchase views.
          </p>
        </div>
      </div>

      {!accountAddress ? (
        <EmptyState
          title="Wallet required"
          body="Connect the buyer wallet to load purchases and unlocked media."
        />
      ) : receipts.length === 0 ? (
        <EmptyState
          title="No buyer media yet"
          body="Unlock a shared Payby media link and it will appear here for this wallet."
        />
      ) : (
        <>
          <ul className="buyer-library-list">
          {paginatedReceipts.map((receipt) => {
            const metadata =
              metadataStore.metadata[createMediaKey(receipt.creator, receipt.blobName)];
            const title = metadata?.title || receipt.title || receipt.blobName;
            const receiptKey = createReceiptKey(
              receipt.buyer,
              receipt.network,
              receipt.creator,
              receipt.blobName,
            );
            const proofState = accessProofs[receiptKey] ?? "unknown";

            return (
              <li key={receiptKey}>
                <div className="blob-icon">
                  <FileArchive size={18} />
                </div>
                <div>
                  <strong>{title}</strong>
                  <p>
                    {accessModeLabel(receipt.accessMode)} - {shortenAddress(receipt.creator)}
                  </p>
                  <span>
                  {receipt.accessType === "purchase"
                      ? formatAssetUnits(receipt.price || "0", receipt.currency)
                      : "Wallet session"}{" "}
                    - {new Date(receipt.confirmedAt).toLocaleString()}
                  </span>
                </div>
                <button
                  className={`proof-pill is-${proofState}`}
                  type="button"
                  disabled={proofState === "checking"}
                  onClick={() => refreshReceiptProof(receipt)}
                  title="Refresh access proof from Aptos"
                >
                  <ShieldCheck size={14} />
                  {proofLabel(proofState)}
                </button>
                <button
                  className="button button-primary compact-button"
                  type="button"
                  onClick={() =>
                    onNavigate({
                      name: "share",
                      owner: receipt.creator,
                      blobName: receipt.blobName,
                    })
                  }
                >
                  Open media
                  <ArrowRight size={15} />
                </button>
                {receipt.hash ? (
                  <a
                    className="icon-button"
                    href={transactionExplorerUrl(receipt.network, receipt.hash)}
                    rel="noreferrer"
                    target="_blank"
                    title="View transaction"
                  >
                    <ExternalLink size={16} />
                  </a>
                ) : null}
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Copy ${title} share link`}
                  title={copiedKey === receiptKey ? "Copied" : "Copy share link"}
                  onClick={() => copyShareLink(receipt)}
                >
                  {copiedKey === receiptKey ? <Check size={16} /> : <Share2 size={16} />}
                </button>
              </li>
            );
          })}
          </ul>
          <PaginationControls
            label="Buyer library pagination"
            page={safeLibraryPage}
            pageCount={libraryPageCount}
            total={receipts.length}
            pageSize={VAULT_PAGE_SIZE}
            onPageChange={setLibraryPage}
          />
        </>
      )}
    </section>
  );
}

function NetworkPanel({
  selectedNetwork,
  accountAddress,
  metadataSyncState,
}: {
  selectedNetwork: PaybyNetwork;
  accountAddress: string;
  metadataSyncState: ReturnType<typeof useStoredMetadata>["syncState"];
}) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  const [copiedLabel, setCopiedLabel] = React.useState("");
  const rows = [
    { label: "Shelby RPC", value: network.shelbyRpcUrl },
    { label: "Aptos Full Node", value: network.fullnodeUrl },
    { label: "Indexer", value: network.indexerUrl },
    { label: "Contract", value: network.contractAddress },
    {
      label: "Payby Marketplace",
      value: network.marketplaceContractAddress || "Not configured",
    },
    {
      label: "Payment Asset",
      value: network.paymentAssetMetadataAddress || "Not configured",
    },
  ];
  const proofRows = [
    {
      label: "Shelby storage route",
      state: "Ready",
      detail: "Uploads and retrieval target this Shelby RPC.",
      ok: Boolean(network.shelbyRpcUrl),
    },
    {
      label: "Aptos execution route",
      state: "Ready",
      detail: "Wallet transactions settle through the configured fullnode.",
      ok: Boolean(network.fullnodeUrl),
    },
    {
      label: "Marketplace registry",
      state: network.marketplaceContractAddress ? "Configured" : "Missing",
      detail: network.marketplaceContractAddress
        ? "Restricted media can write access policy on-chain."
        : "Set the marketplace contract address before paid or allowlist media.",
      ok: Boolean(network.marketplaceContractAddress),
    },
    {
      label: "Retrieval mode",
      state: "Direct Shelby",
      detail: "Payby retrieves media directly from Shelby while Early Access is pending.",
      ok: true,
    },
  ];

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(""), 1400);
  }

  return (
    <section className="panel network-panel" id="network">
      <div className="panel-header hero-panel-header">
        <div>
          <p className="muted">Live configuration</p>
          <h2>{network.label}</h2>
          <span>
            Inspect the active Shelby route before publishing or retrieving
            creator media.
          </span>
        </div>
        <KeyRound size={24} />
      </div>
      <div className="network-overview">
        <div>
          <Sparkles size={18} />
          <span>Storage network</span>
          <strong>{network.label}</strong>
        </div>
        <div>
          <ShieldCheck size={18} />
          <span>Status note</span>
          <strong>{network.permanenceNote}</strong>
        </div>
        <div>
          <Database size={18} />
          <span>Retrieval mode</span>
          <strong>Direct Shelby</strong>
          <p>Direct retrieval keeps the community beta focused on Shelby storage and Move access proofs.</p>
        </div>
        <div>
          {metadataSyncState === "synced" ? (
            <Database size={18} />
          ) : metadataSyncState === "syncing" ? (
            <KeyRound size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>Metadata registry</span>
          <strong>
            {metadataSyncState === "synced"
              ? "Synced"
              : metadataSyncState === "syncing"
                ? "Checking"
                : metadataSyncState === "offline"
                  ? "Local fallback"
                  : "Local mode"}
          </strong>
          <p>
            {metadataSyncState === "synced"
              ? "Vault metadata is synced."
              : "Payby keeps a browser copy and uses on-chain metadata commitments as the durable source."}
          </p>
        </div>
      </div>
      <section className="integration-proof" aria-label="Shelby and Aptos integration proof">
        <div className="integration-proof-head">
          <div>
            <span>Integration proof</span>
            <strong>Live Shelby + Aptos readiness</strong>
          </div>
          <p>
            These checks show whether Payby is ready to publish media, register
            access policy, and serve controlled retrieval from this browser.
          </p>
        </div>
        <div className="integration-proof-grid">
          {proofRows.map((item) => (
            <div className={item.ok ? "is-ready" : "is-warning"} key={item.label}>
              {item.ok ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
              <span>{item.label}</span>
              <strong>{item.state}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="funding-helper">
        <div>
          <CreditCard size={18} />
          <span>Funding helper</span>
          <strong>{accountAddress ? shortenAddress(accountAddress) : "Connect wallet"}</strong>
          <p>
            Upload registration requires network gas and Shelby storage
            resources. Keep test funds available before publishing large media.
          </p>
        </div>
        <a
          className="button button-secondary"
          href="https://aptos.dev/network/faucet"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={17} />
          Aptos faucet
        </a>
      </div>
      <div className="endpoint-grid">
        {rows.map(({ label, value }) => (
          <div className="endpoint" key={label}>
            <span>{label}</span>
            <code>{value}</code>
            <button
              className="icon-button"
              type="button"
              aria-label={`Copy ${label}`}
              title={copiedLabel === label ? "Copied" : `Copy ${label}`}
              onClick={() => copy(label, value)}
            >
              {copiedLabel === label ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        ))}
      </div>
      <a
        className="network-link"
        href={`https://explorer.aptoslabs.com/account/${network.contractAddress}?network=${network.explorerNetwork}`}
        target="_blank"
        rel="noreferrer"
      >
        <ExternalLink size={17} />
        Open contract in Aptos Explorer
      </a>
    </section>
  );
}

function LockedMediaPreview({ accessMode }: { accessMode: AccessMode }) {
  return (
    <div className="media-preview locked-preview">
      <div>
        <Lock size={42} />
        <strong>Access controlled media</strong>
        <span>
          {`This ${accessMode} asset opens after Payby verifies the on-chain access policy.`}
        </span>
      </div>
    </div>
  );
}

function PurchaseReceiptCard({ receipt }: { receipt: PurchaseReceipt }) {
  const hasTransaction = Boolean(receipt.hash);
  return (
    <section className="purchase-receipt" aria-label="Purchase receipt">
      <div className="purchase-receipt-head">
        <span>
          <ReceiptText size={16} />
          {receipt.accessType === "purchase" ? "Purchase receipt" : "Access receipt"}
        </span>
        <strong>{hasTransaction ? "Confirmed" : "Session"}</strong>
      </div>
      <div className="receipt-grid">
        <div>
          <span>Network</span>
          <strong>{PAYBY_NETWORKS[receipt.network].label}</strong>
        </div>
        <div>
          <span>Price</span>
          <strong>{formatAssetUnits(receipt.price || "0", receipt.currency)}</strong>
        </div>
        <div>
          <span>Buyer</span>
          <strong>{shortenAddress(receipt.buyer)}</strong>
        </div>
        <div>
          <span>Creator</span>
          <strong>{shortenAddress(receipt.creator)}</strong>
        </div>
      </div>
      {hasTransaction ? (
        <a
          className="transaction-link"
          href={transactionExplorerUrl(receipt.network, receipt.hash)}
          rel="noreferrer"
          target="_blank"
        >
          View purchase transaction
          <ExternalLink size={14} />
        </a>
      ) : (
        <p className="muted">Access was unlocked from the on-chain policy state.</p>
      )}
    </section>
  );
}

function PublicMediaPage({
  route,
  selectedNetwork,
  metadataStore,
  purchaseStore,
  transactionStore,
  profile,
  onOpenApp,
}: {
  route: AppRoute;
  selectedNetwork: PaybyNetwork;
  metadataStore: ReturnType<typeof useStoredMetadata>;
  purchaseStore: ReturnType<typeof usePurchaseReceipts>;
  transactionStore: ReturnType<typeof useTransactionHistory>;
  profile: CreatorProfile;
  onOpenApp: () => void;
}) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const owner = route.owner ?? "";
  const blobName = route.blobName ?? "";
  const cachedMetadata = metadataStore.metadata[createMediaKey(owner, blobName)];
  const [committedMetadata, setCommittedMetadata] =
    React.useState<MediaMetadata | null>(null);
  const metadata = committedMetadata ?? cachedMetadata;
  const [unlockState, setUnlockState] = React.useState<UnlockState>("idle");
  const [accessToken, setAccessToken] = React.useState("");
  const [unlockMessage, setUnlockMessage] = React.useState("");
  const [purchaseReceipt, setPurchaseReceipt] =
    React.useState<PurchaseReceipt | null>(null);
  const [chainListing, setChainListing] = React.useState<ChainListing | null>(
    null,
  );
  const [chainListingState, setChainListingState] = React.useState<
    "checking" | "found" | "missing" | "error" | "unconfigured"
  >("checking");
  const [chainAccessAllowed, setChainAccessAllowed] =
    React.useState<boolean | null>(null);
  const [chainAccessState, setChainAccessState] =
    React.useState<ChainAccessProofState>("unknown");
  const buyerAddress = account ? getAccountAddress(account) : "";
  const recoveredReceipt = purchaseStore.getReceipt(
    buyerAddress,
    selectedNetwork,
    owner,
    blobName,
  );
  const marketplaceConfigured = Boolean(
    PAYBY_NETWORKS[selectedNetwork].marketplaceContractAddress,
  );
  const effectiveAccessMode = chainListing?.found
    ? policyIdToAccessMode(chainListing.policy)
    : metadata?.accessMode;
  const isLocked = effectiveAccessMode
    ? effectiveAccessMode !== "free"
    : isRestrictedMedia(metadata);
  const effectiveTitle =
    chainListing?.found && chainListing.title
      ? chainListing.title
      : metadata?.title || blobName;
  const effectivePrice =
    chainListing?.found && chainListing.price !== "0"
      ? formatAssetUnits(chainListing.price, metadata?.currency ?? "APT")
      : metadata?.price
        ? `${metadata.price} ${metadata.currency}`
        : "";
  const unlockElapsed = useElapsedSeconds(
    unlockState === "signing",
    `${unlockMessage}-${purchaseReceipt?.hash ?? "no-receipt"}`,
  );
  const mediaUrl = getDownloadUrl(selectedNetwork, owner, blobName);
  const accessLabel = accessModeLabel(effectiveAccessMode);
  const accessDetail = accessModeDetail(effectiveAccessMode);
  const visibleReceipt = purchaseReceipt ?? recoveredReceipt;
  const chainRegistryLabel =
    chainListingState === "checking"
      ? "Checking"
      : chainListingState === "found"
        ? chainListing?.active
          ? "Active listing"
          : "Inactive listing"
        : chainListingState === "missing"
          ? "Not registered"
          : chainListingState === "unconfigured"
            ? "No contract"
            : "Read failed";
  const chainAccessLabel =
    chainAccessState === "checking"
      ? "Checking"
      : chainAccessState === "allowed"
        ? "Allowed"
        : chainAccessState === "denied"
          ? "Denied"
          : chainAccessState === "unconfigured"
            ? "No contract"
            : chainAccessState === "error"
              ? "Read failed"
              : "Wallet needed";

  React.useEffect(() => {
    if (!blobName) {
      setChainListing(null);
      setChainListingState("missing");
      return;
    }

    if (!marketplaceConfigured) {
      setChainListing(null);
      setChainListingState("unconfigured");
      return;
    }

    let cancelled = false;
    setChainListingState("checking");
    void readChainListing(selectedNetwork, owner, blobName)
      .then((listing) => {
        if (cancelled) return;
        setChainListing(listing);
        setChainListingState(listing?.found ? "found" : "missing");
      })
      .catch(() => {
        if (cancelled) return;
        setChainListing(null);
        setChainListingState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [blobName, marketplaceConfigured, owner, selectedNetwork]);

  React.useEffect(() => {
    if (!chainListing?.found || !chainListing.metadataUri || !chainListing.metadataHash) {
      setCommittedMetadata(null);
      return;
    }

    let cancelled = false;
    void fetchCommittedMetadata(selectedNetwork, owner, blobName, chainListing)
      .then((item) => {
        if (cancelled || !item) return;
        setCommittedMetadata(item);
        metadataStore.saveMetadata([item]);
      })
      .catch(() => {
        if (!cancelled) setCommittedMetadata(null);
      });

    return () => {
      cancelled = true;
    };
  }, [blobName, chainListing, metadataStore.saveMetadata, owner, selectedNetwork]);

  React.useEffect(() => {
    if (!buyerAddress || !blobName) {
      setChainAccessAllowed(null);
      setChainAccessState("unknown");
      return;
    }

    if (!marketplaceConfigured) {
      setChainAccessAllowed(null);
      setChainAccessState("unconfigured");
      return;
    }

    let cancelled = false;
    setChainAccessState("checking");
    void readChainAccess(selectedNetwork, owner, buyerAddress, blobName)
      .then((allowed) => {
        if (cancelled) return;
        setChainAccessAllowed(allowed);
        setChainAccessState(
          allowed === null ? "unconfigured" : allowed ? "allowed" : "denied",
        );
      })
      .catch(() => {
        if (cancelled) return;
        setChainAccessAllowed(null);
        setChainAccessState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [blobName, buyerAddress, marketplaceConfigured, owner, selectedNetwork]);

  React.useEffect(() => {
    if (!recoveredReceipt || purchaseReceipt || unlockMessage) return;
    setUnlockMessage(
      recoveredReceipt.hash
        ? "Purchase recorded for this wallet. Unlock again to refresh the on-chain access proof."
        : "Access was previously unlocked on this wallet.",
    );
  }, [purchaseReceipt, recoveredReceipt, unlockMessage]);

  async function submitPaidUnlockPurchase() {
    if (!metadata && !chainListing?.found) {
      throw new Error("Media metadata and on-chain listing are not available.");
    }
    if (!account) throw new Error("Connect a wallet before purchasing.");

    const functionId =
      marketplaceFunction(selectedNetwork, "purchase_from") ||
      marketplaceFunction(selectedNetwork, "purchase");
    if (!functionId) {
      throw new Error("Payby marketplace contract is not configured.");
    }

    setUnlockMessage("Confirm the paid unlock transaction in your wallet.");
    const response = await signAndSubmitTransaction({
      data: {
        function: functionId,
        functionArguments: functionId.includes("::purchase_from")
          ? [owner, blobName]
          : [blobName],
      },
    });
    const hash = getTransactionHash(response);
    if (!hash) {
      throw new Error("Wallet submitted the purchase, but no transaction hash was returned.");
    }

    transactionStore.upsertTransaction({
      id: crypto.randomUUID(),
      hash,
      network: selectedNetwork,
      status: "pending",
      label: "Paid media unlock",
      detail: `Paying ${effectivePrice || "configured price"} to ${shortenAddress(owner)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setUnlockMessage(
      "Purchase submitted. Waiting for Aptos confirmation before unlocking.",
    );
    try {
      await waitForTransaction(selectedNetwork, hash);
    } catch (error) {
      transactionStore.updateTransaction(hash, {
        status: "failed",
        detail:
          error instanceof Error
            ? error.message
            : "Paid unlock transaction failed.",
      });
      throw error;
    }
    const receipt: PurchaseReceipt = {
      hash,
      network: selectedNetwork,
      buyer: getAccountAddress(account),
      creator: owner,
      blobName,
      title: effectiveTitle,
      accessMode: effectiveAccessMode ?? "paid",
      accessType: "purchase",
      price:
        chainListing?.found && chainListing.price !== "0"
          ? chainListing.price
          : metadata?.price ?? "0",
      currency: metadata?.currency ?? "APT",
      confirmedAt: Date.now(),
    };
    setPurchaseReceipt(receipt);
    purchaseStore.upsertReceipt(receipt);
    transactionStore.updateTransaction(hash, {
      status: "confirmed",
      detail: `${effectiveTitle} unlocked for ${formatAssetUnits(receipt.price, receipt.currency)}.`,
    });
    setUnlockMessage("Purchase confirmed. Aptos access proof is ready.");
    return receipt;
  }

  async function unlockMedia() {
    if (!metadata) {
      setUnlockState("denied");
      setUnlockMessage("Media metadata is not available in this browser.");
      return;
    }

    if (!connected || !account) {
      setUnlockState("denied");
      setUnlockMessage("Connect a wallet before requesting access.");
      return;
    }

    try {
      setUnlockState("signing");
      let latestReceipt = purchaseReceipt ?? recoveredReceipt;

      if (effectiveAccessMode && effectiveAccessMode !== "free") {
        if (!marketplaceConfigured) {
          throw new Error("Payby marketplace contract is not configured for this network.");
        }
        if (chainListingState === "checking") {
          throw new Error("Payby is still reading the on-chain access policy. Try again in a moment.");
        }
        if (!chainListing?.found || !chainListing.active) {
          throw new Error("This gated media is not registered as an active on-chain Payby listing.");
        }

        setUnlockMessage("Checking wallet access on Aptos.");
        const access = await readChainAccess(
          selectedNetwork,
          owner,
          getAccountAddress(account),
          blobName,
        );
        setChainAccessAllowed(access);
        setChainAccessState(
          access === null ? "unconfigured" : access ? "allowed" : "denied",
        );

        if (!access) {
          if (effectiveAccessMode !== "paid") {
            throw new Error("This wallet is not allowed by the on-chain access policy.");
          }

          latestReceipt = await submitPaidUnlockPurchase();
          const verifiedAccess = await readChainAccess(
            selectedNetwork,
            owner,
            getAccountAddress(account),
            blobName,
          );
          setChainAccessAllowed(verifiedAccess);
          setChainAccessState(
            verifiedAccess === null
              ? "unconfigured"
              : verifiedAccess
                ? "allowed"
                : "denied",
          );
          if (!verifiedAccess) {
            throw new Error("Purchase confirmed, but Aptos access proof is not visible yet. Wait a few seconds and try again.");
          }
        }
      }

      setAccessToken("direct-shelby");
      setUnlockState("authorized");
      setUnlockMessage("Access granted. Media is available from Shelby.");
      if (effectiveAccessMode && effectiveAccessMode !== "free") {
        purchaseStore.upsertReceipt({
          hash: latestReceipt?.hash ?? "",
          network: selectedNetwork,
          buyer: getAccountAddress(account),
          creator: owner,
          blobName,
          title: effectiveTitle,
          accessMode: effectiveAccessMode,
          accessType:
            effectiveAccessMode === "paid" &&
            latestReceipt?.hash
              ? "purchase"
              : "session",
          price:
            chainListing?.found && chainListing.price !== "0"
              ? chainListing.price
              : metadata.price,
          currency: metadata.currency,
          confirmedAt: Date.now(),
        });
      }
    } catch (error) {
      setUnlockState("denied");
      setUnlockMessage(userFacingError(error, "Could not unlock this media."));
    }
  }

  return (
    <main className="public-page">
      <header className="landing-nav public-nav">
        <button className="brand-mark" onClick={onOpenApp} type="button" aria-label="Open Payby app">
          <PaybyLogo />
        </button>
        <div className="public-nav-actions">
          <WalletControl />
          <button className="button button-secondary" onClick={onOpenApp}>
            Open dApp
            <ArrowRight size={17} />
          </button>
        </div>
      </header>

      <section className="public-media-shell">
        <div className="panel public-media-card">
          <div className="panel-header hero-panel-header">
            <div>
              <p className="muted">{metadata?.category || "Shared media"}</p>
              <h1>{effectiveTitle}</h1>
              <span>{metadata?.description || "Media shared from a Payby creator vault."}</span>
            </div>
            {isLocked ? <Lock size={24} /> : <FileVideo size={24} />}
          </div>
          <div className="public-access-bar" aria-label="Media access state">
            <div>
              <ShieldCheck size={17} />
              <span>Access</span>
              <strong>{accessLabel}</strong>
            </div>
            <div>
              <Database size={17} />
              <span>Storage</span>
              <strong>{PAYBY_NETWORKS[selectedNetwork].label}</strong>
            </div>
            <div className="is-ready">
              <Database size={17} />
              <span>Retrieval</span>
              <strong>Direct Shelby</strong>
            </div>
            <div
              className={
                chainListingState === "found" && chainListing?.active
                  ? "is-ready"
                  : "is-warning"
              }
            >
              {chainListingState === "found" && chainListing?.active ? (
                <ShieldCheck size={17} />
              ) : (
                <AlertTriangle size={17} />
              )}
              <span>Registry</span>
              <strong>{chainRegistryLabel}</strong>
            </div>
            <div
              className={
                chainAccessState === "allowed"
                  ? "is-ready"
                  : chainAccessState === "denied" || chainAccessState === "error"
                    ? "is-warning"
                    : ""
              }
            >
              <Wallet size={17} />
              <span>Chain access</span>
              <strong>{chainAccessLabel}</strong>
            </div>
            <div className={unlockState === "authorized" ? "is-ready" : ""}>
              <Wallet size={17} />
              <span>Buyer</span>
              <strong>
                {buyerAddress
                  ? shortenAddress(buyerAddress)
                  : connected
                    ? "Wallet connected"
                    : "Connect wallet"}
              </strong>
            </div>
          </div>
          {isLocked && !accessToken ? (
            <LockedMediaPreview
              accessMode={effectiveAccessMode ?? "free"}
            />
          ) : (
            <MediaPreview url={mediaUrl} title={effectiveTitle} blobName={blobName} />
          )}
          <div className="public-actions">
            {isLocked && !accessToken ? (
              <button
                className="button button-primary"
                type="button"
                disabled={unlockState === "signing"}
                onClick={unlockMedia}
              >
                <Lock size={17} />
                {unlockState === "signing"
                  ? `Processing ${formatElapsed(unlockElapsed)}`
                  : effectiveAccessMode === "paid" && !chainAccessAllowed
                    ? "Purchase and unlock"
                    : "Unlock media"}
              </button>
            ) : (
              <a className="button button-primary" href={mediaUrl} target="_blank" rel="noreferrer">
                <Download size={17} />
                Download blob
              </a>
            )}
            <button
              className="button button-secondary"
              type="button"
              onClick={async () => navigator.clipboard.writeText(window.location.href)}
            >
              <Share2 size={17} />
              Copy link
            </button>
          </div>
          {unlockMessage ? (
            <p className={`inline-status unlock-status is-${unlockState}`}>
              {unlockMessage}
            </p>
          ) : null}
          {visibleReceipt ? <PurchaseReceiptCard receipt={visibleReceipt} /> : null}
        </div>

        <aside className="support-panel public-sidebar">
          <div className="avatar-preview">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <User size={34} />}
          </div>
          <strong>{profile.displayName}</strong>
          <span>@{profile.handle}</span>
          <p>{profile.bio}</p>
          <div className="network-mini-card">
            <span>Access policy</span>
            <strong>{accessLabel}</strong>
            <p>{accessDetail}</p>
          </div>
          <div className="network-mini-card">
            <span>On-chain registry</span>
            <strong>{chainRegistryLabel}</strong>
            <p>
              {chainListing?.found
                ? `${accessModeLabel(policyIdToAccessMode(chainListing.policy))} policy recorded for this Shelby blob.`
                : "Payby checks the marketplace contract before gated retrieval."}
            </p>
          </div>
          <div className="network-mini-card">
            <span>Wallet access proof</span>
            <strong>{chainAccessLabel}</strong>
            <p>
              {buyerAddress
                ? "This status is read from the Payby marketplace can_access view."
                : "Connect a wallet to verify buyer access on Aptos."}
            </p>
          </div>
          {effectivePrice ? (
            <div className="network-mini-card">
              <span>Price intent</span>
              <strong>{effectivePrice}</strong>
              <p>
                Paid media checks the Payby marketplace registry before Payby
                opens the Shelby media.
              </p>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function PaybyRuntime() {
  const [selectedNetwork, setSelectedNetwork] =
    React.useState<PaybyNetwork>(defaultNetwork);
  const network = PAYBY_NETWORKS[selectedNetwork];

  const shelbyClient = React.useMemo(
    () =>
      new ShelbyBrowserClient({
        network: network.shelbyNetwork,
        apiKey: network.apiKey,
      }),
    [network.apiKey, network.shelbyNetwork],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AptosWalletAdapterProvider
        key={selectedNetwork}
        autoConnect={true}
        disableTelemetry={true}
        optInWallets={paybyWallets}
        dappConfig={{
          network: network.walletNetwork,
          aptosApiKeys: network.aptosApiKey
            ? { [network.walletNetwork]: network.aptosApiKey }
            : undefined,
        }}
        onError={(error) => {
          console.error("Aptos wallet adapter error", error);
        }}
      >
        <ShelbyClientProvider client={shelbyClient}>
          <App
            selectedNetwork={selectedNetwork}
            onNetworkChange={setSelectedNetwork}
            shelbyClient={shelbyClient}
          />
        </ShelbyClientProvider>
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  );
}

export default PaybyRuntime;
