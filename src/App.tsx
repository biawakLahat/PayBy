import React from "react";
import {
  Activity,
  ArrowRight,
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Database,
  Download,
  ExternalLink,
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
} from "lucide-react";
import { useWallet, WalletReadyState } from "@aptos-labs/wallet-adapter-react";
import {
  useAccountBlobs,
  useBlobMetadata,
  useDeleteBlobs,
  useUploadBlobs,
} from "@shelby-protocol/react";
import type { BlobMetadata, ShelbyClient } from "@shelby-protocol/sdk/browser";
import { PaybyLogo } from "./components/PaybyLogo";
import { PAYBY_NETWORKS, type PaybyNetwork } from "./config/networks";

type AppProps = {
  selectedNetwork: PaybyNetwork;
  onNetworkChange: (network: PaybyNetwork) => void;
  shelbyClient: ShelbyClient;
};

type RouteName =
  | "landing"
  | "vault"
  | "publish"
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
  type: "upload" | "delete" | "metadata" | "share";
  label: string;
  detail: string;
};

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
  status: TransactionStatus;
  label: string;
  detail: string;
  createdAt: number;
  updatedAt: number;
};

const formatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});
const METADATA_KEY = "payby-media-metadata-v1";
const PROFILE_KEY = "payby-creator-profile-v1";
const ACTIVITY_KEY = "payby-activity-v1";
const PENDING_PUBLISH_KEY = "payby-pending-publishes-v1";
const TRANSACTION_HISTORY_KEY = "payby-transaction-history-v1";
const retrievalGatewayUrl =
  import.meta.env.VITE_PAYBY_RETRIEVAL_GATEWAY_URL?.replace(/\/$/, "") ?? "";
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

function parseAssetUnits(value: string) {
  const normalized = value.trim();
  if (!normalized) return 0;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  return Math.round(parsed * 100_000_000);
}

function marketplaceFunction(
  selectedNetwork: PaybyNetwork,
  functionName: "upsert_listing" | "purchase" | "can_access",
): MoveFunctionId | "" {
  const address = PAYBY_NETWORKS[selectedNetwork].marketplaceContractAddress;
  return address
    ? (`${address}::payby_marketplace::${functionName}` as MoveFunctionId)
    : "";
}

function getAccessRegistryBlocker(
  selectedNetwork: PaybyNetwork,
  accessMode: AccessMode,
) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  if (!CHAIN_SUPPORTED_ACCESS_MODES.has(accessMode)) {
    return "NFT and subscription gates need a verifier contract before they can be published safely.";
  }
  if (accessMode !== "free" && !network.marketplaceContractAddress) {
    return "Set the Payby marketplace contract address before publishing gated media.";
  }
  if (accessMode === "paid" && !network.paymentAssetMetadataAddress) {
    return "Set the payment asset metadata address before publishing paid unlocks.";
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
  const [syncState, setSyncState] = React.useState<
    "local" | "syncing" | "synced" | "offline"
  >(retrievalGatewayUrl ? "syncing" : "local");

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

      if (retrievalGatewayUrl) {
        void fetch(`${retrievalGatewayUrl}/api/metadata`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items }),
        }).catch(() => setSyncState("offline"));
      }
    },
    [],
  );

  const removeMetadata = React.useCallback((key: string) => {
    setMetadata((current) => {
      const item = current[key];
      const next = { ...current };
      delete next[key];
      writeJson(METADATA_KEY, next);
      if (item && retrievalGatewayUrl) {
        void fetch(
          `${retrievalGatewayUrl}/api/metadata/${item.network}/${encodeURIComponent(
            item.owner,
          )}/${encodeBlobPath(item.blobName)}`,
          { method: "DELETE" },
        ).catch(() => setSyncState("offline"));
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    if (!retrievalGatewayUrl) return;

    let cancelled = false;
    async function syncMetadata() {
      setSyncState("syncing");
      try {
        const response = await fetch(`${retrievalGatewayUrl}/api/metadata`);
        const data = (await response.json()) as { metadata?: MediaMetadata[] };
        if (cancelled || !response.ok || !Array.isArray(data.metadata)) return;

        setMetadata((current) => {
          const next = { ...current };
          data.metadata?.forEach((item) => {
            next[createMediaKey(item.owner, item.blobName)] = item;
          });
          writeJson(METADATA_KEY, next);
          return next;
        });
        setSyncState("synced");
      } catch {
        if (!cancelled) setSyncState("offline");
      }
    }

    void syncMetadata();

    return () => {
      cancelled = true;
    };
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

function useActivityFeed() {
  const [activity, setActivity] = React.useState<ActivityItem[]>(() =>
    readJson<ActivityItem[]>(ACTIVITY_KEY, []),
  );

  const addActivity = React.useCallback((item: Omit<ActivityItem, "id" | "at">) => {
    setActivity((current) => {
      const next = [
        {
          id: crypto.randomUUID(),
          at: Date.now(),
          ...item,
        },
        ...current,
      ].slice(0, 80);
      writeJson(ACTIVITY_KEY, next);
      return next;
    });
  }, []);

  return { activity, addActivity };
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

  return { pendingPublishes, upsertPublishes, updatePublishes, markIndexed };
}

function useTransactionHistory() {
  const [transactions, setTransactions] = React.useState<TransactionItem[]>(() =>
    readJson<TransactionItem[]>(TRANSACTION_HISTORY_KEY, []),
  );

  const commit = React.useCallback((next: TransactionItem[]) => {
    const trimmed = next
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 80);
    writeJson(TRANSACTION_HISTORY_KEY, trimmed);
    return trimmed;
  }, []);

  const upsertTransaction = React.useCallback(
    (item: TransactionItem) => {
      setTransactions((current) => {
        const index = current.findIndex((candidate) => candidate.hash === item.hash);
        const next = [...current];
        if (index >= 0) {
          next[index] = { ...next[index], ...item, updatedAt: Date.now() };
        } else {
          next.unshift(item);
        }
        return commit(next);
      });
    },
    [commit],
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

  return { transactions, upsertTransaction, updateTransaction };
}

function getDownloadUrl(network: PaybyNetwork, owner: string, blobName: string) {
  return `${PAYBY_NETWORKS[network].shelbyRpcUrl}/v1/blobs/${owner}/${encodeBlobPath(
    blobName,
  )}`;
}

function getControlledDownloadUrl(
  network: PaybyNetwork,
  owner: string,
  blobName: string,
  accessToken = "",
) {
  if (!retrievalGatewayUrl) {
    return getDownloadUrl(network, owner, blobName);
  }

  const token = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
  return `${retrievalGatewayUrl}/api/media/${network}/${encodeURIComponent(
    owner,
  )}/${encodeBlobPath(blobName)}${token}`;
}

function isGatewayRequired(metadata?: MediaMetadata) {
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

function fileSize(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${formatter.format(bytes / 1024 ** index)} ${units[index]}`;
}

function formatMicros(micros?: number) {
  if (!micros) return "No expiry";
  return new Date(micros / 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const metadataStore = useStoredMetadata();
  const profileStore = useCreatorProfile();
  const activityFeed = useActivityFeed();
  const pendingPublishStore = usePendingPublishes();
  const transactionStore = useTransactionHistory();
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
        <div className="hero-edge hero-edge-left" aria-hidden="true">
          <span className="edge-kicker">Shelby route</span>
          <strong>creator.media</strong>
          <div className="edge-track">
            <i />
            <i />
            <i />
          </div>
          <small>rpc online</small>
        </div>
        <div className="hero-edge hero-edge-right" aria-hidden="true">
          <span className="edge-kicker">Aptos signer</span>
          <strong>wallet proof</strong>
          <div className="edge-orbit">
            <i />
            <i />
          </div>
          <small>shelbynet + testnet</small>
        </div>
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
}) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  const wallet = useWallet();
  const accountAddress = getAccountAddress(wallet.account);
  const currentView = route.name as AppViewName;
  const viewTitle = {
    vault: "Vault library",
    publish: "Publish media",
    network: "Network routes",
    detail: "Media detail",
    profile: "Creator profile",
    activity: "Activity feed",
  }[currentView];
  const viewLabel = {
    vault: "Creator workspace",
    publish: "Shelby upload flow",
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
                ? "Gateway synced"
                : metadataStore.syncState === "syncing"
                  ? "Syncing"
                  : metadataStore.syncState === "offline"
                    ? "Local fallback"
                    : "Local mode"
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
                ? "Gateway online"
                : metadataStore.syncState === "offline"
                  ? "Browser cache"
                  : "Checking"}
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
  addActivity: (item: Omit<ActivityItem, "id" | "at">) => void;
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
  const activePublishRef = React.useRef({ pendingIds: [] as string[], hash: "" });

  const uploadBlobs = useUploadBlobs({
    client: shelbyClient,
    onSuccess: (_data, variables) => {
      if (accountAddress) {
        const tagList = tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        const now = Date.now();
        const items = variables.blobs.map((blob) => ({
          key: createMediaKey(accountAddress, blob.blobName),
          owner: accountAddress,
          blobName: blob.blobName,
          network: selectedNetwork,
          title: title.trim() || blob.blobName,
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
        }));
        saveMetadata(items);
        pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
          status: "indexing",
          error: "",
        });
        transactionStore.updateTransaction(activePublishRef.current.hash, {
          status: "confirmed",
          detail: `Registered ${items.length} ${items.length === 1 ? "blob" : "blobs"} on ${PAYBY_NETWORKS[selectedNetwork].label}`,
        });
        addActivity({
          type: "upload",
          label: `Published ${items.length} media ${items.length === 1 ? "file" : "files"}`,
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
      const message = error instanceof Error ? error.message : "Upload failed.";
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
  );
  const accessRegistryReady = !accessRegistryBlocker;
  const canUpload =
    connected &&
    account &&
    walletNetworkAligned &&
    accessRegistryReady &&
    files.length > 0 &&
    !uploadBlobs.isPending;

  async function registerAccessListings(items: MediaMetadata[]) {
    const restrictedItems = items.filter((item) => item.accessMode !== "free");
    if (restrictedItems.length === 0) return;

    const functionId = marketplaceFunction(selectedNetwork, "upsert_listing");
    if (!functionId || !account) return;

    setPublishPhase("registry");
    pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
      status: "registry",
    });
    setStatusMessage(
      `Shelby storage complete. Registering ${restrictedItems.length} access ${restrictedItems.length === 1 ? "policy" : "policies"} on Aptos.`,
    );

    for (const item of restrictedItems) {
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
            detail: `Registering ${item.title} access policy`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          await waitForTransaction(selectedNetwork, hash);
          transactionStore.updateTransaction(hash, {
            status: "confirmed",
            detail: `${item.title} access policy is registered on-chain.`,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Access registry transaction failed.";
        setPublishPhase("error");
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
    pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
      status: "indexing",
      error: "",
    });
    setStatusMessage("Published to Shelby and registered in Payby access registry.");
    addActivity({
      type: "metadata",
      label: "Registered access policies",
      detail: restrictedItems.map((item) => item.blobName).join(", "),
    });
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

    const blobs = await Promise.all(
      files.map(async (file) => ({
        blobName: file.name,
        blobData: new Uint8Array(await file.arrayBuffer()),
      })),
    );
    const now = Date.now();
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
        const message =
          error instanceof Error
            ? error.message
            : "Wallet rejected or failed to submit the transaction.";
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
              placeholder="Wallet addresses, collection id, or pass notes. Enforcement requires a contract or gateway."
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

        <button
          className="button button-primary publish-button"
          type="button"
          disabled={!canUpload}
          onClick={handleUpload}
        >
          <PlugZap size={18} />
          {uploadBlobs.isPending
            ? "Publishing..."
            : publishPhase === "error" && files.length > 0
              ? "Retry publish"
              : "Publish to Shelby"}
        </button>

        <p className="inline-status">
          {statusMessage ||
            (!walletNetworkAligned && accountAddress
              ? walletNetworkMismatchMessage(walletNetwork, selectedNetwork)
              : accessRegistryBlocker
                ? accessRegistryBlocker
              : accountAddress
              ? "Ready for wallet-approved Shelby upload."
              : "Connect wallet to publish.")}
        </p>
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

  return (
    <div className={`publish-progress ${phase === "error" ? "is-error" : ""}`}>
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
  addActivity: (item: Omit<ActivityItem, "id" | "at">) => void;
}) {
  const {
    account,
    network: walletNetwork,
    changeNetwork,
    signAndSubmitTransaction,
  } = useWallet();
  const [query, setQuery] = React.useState("");
  const [actionMessage, setActionMessage] = React.useState("");
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
      setActionMessage(error instanceof Error ? error.message : "Delete failed.");
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
      </div>

      <label className="search-box">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search blobs"
        />
      </label>

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
        />
      ) : (
        <ul className="blob-list">
          {blobs.map((blob) => {
            const name = blob.blobNameSuffix ?? blob.name ?? blob.blobName ?? "untitled";
            const metadata = metadataStore.metadata[createMediaKey(accountAddress, name)];
            const url = getControlledDownloadUrl(selectedNetwork, accountAddress, name);
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
      )}
    </section>
  );
}

function PendingPublishQueue({
  items,
  selectedNetwork,
  onPublish,
}: {
  items: PendingPublishItem[];
  selectedNetwork: PaybyNetwork;
  onPublish: () => void;
}) {
  return (
    <section className="pending-publish-card" aria-label="Pending publish queue">
      <div className="pending-publish-head">
        <div>
          <span>Publish queue</span>
          <strong>{items.length} waiting for vault sync</strong>
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
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <FileArchive size={30} />
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
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
  addActivity: (item: Omit<ActivityItem, "id" | "at">) => void;
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
      setActionMessage(error instanceof Error ? error.message : "Delete failed.");
    },
  });
  const downloadUrl = getControlledDownloadUrl(selectedNetwork, owner, blobName);
  const shareUrl = getShareUrl(owner, blobName);

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

        <MediaPreview url={downloadUrl} title={metadata?.title || blobName} />

        <div className="detail-meta-grid">
          <DetailItem label="Owner" value={shortenAddress(owner)} />
          <DetailItem label="Blob name" value={blobName} />
          <DetailItem label="Size" value={fileSize(blobQuery.data?.size)} />
          <DetailItem
            label="Expires"
            value={formatMicros(blobQuery.data?.expirationMicros)}
          />
          <DetailItem label="Visibility" value={metadata?.visibility || "Unknown"} />
          <DetailItem label="Access" value={metadata?.accessMode || "Unknown"} />
        </div>

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
        <a className="button button-primary" href={downloadUrl} target="_blank" rel="noreferrer">
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
          <span>Lifecycle</span>
          <strong>Renewal not exposed</strong>
          <p>
            Shelby React currently exposes delete and upload hooks here. Expiry
            extension needs a supported contract method or re-publishing flow.
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

function MediaPreview({ url, title }: { url: string; title: string }) {
  const extension = title.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "avif"].includes(extension);
  const isVideo = ["mp4", "webm", "mov"].includes(extension);
  const isAudio = ["mp3", "wav", "ogg", "m4a"].includes(extension);

  return (
    <div className="media-preview">
      {isImage ? <img src={url} alt={title} /> : null}
      {isVideo ? <video src={url} controls preload="metadata" /> : null}
      {isAudio ? <audio src={url} controls /> : null}
      {!isImage && !isVideo && !isAudio ? (
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
  addActivity: (item: Omit<ActivityItem, "id" | "at">) => void;
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
}: {
  activity: ActivityItem[];
  transactions: TransactionItem[];
}) {
  return (
    <section className="panel activity-panel">
      <div className="panel-header hero-panel-header">
        <div>
          <p className="muted">Recent actions</p>
          <h2>Activity feed</h2>
          <span>Uploads, deletes, share events, and metadata changes in this browser.</span>
        </div>
        <Activity size={24} />
      </div>
      {transactions.length > 0 ? (
        <section className="transaction-history" aria-label="Transaction history">
          <div className="transaction-history-head">
            <span>Transaction history</span>
            <strong>{transactions.length} tracked</strong>
          </div>
          <ul>
            {transactions.slice(0, 8).map((item) => (
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
        </section>
      ) : null}
      {activity.length === 0 ? (
        <EmptyState
          title="No activity yet"
          body="Publish media, copy share links, or update your profile to populate this feed."
        />
      ) : (
        <ul className="activity-list">
          {activity.map((item) => (
            <li key={item.id}>
              <span>{item.type}</span>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
              <time>{new Date(item.at).toLocaleString()}</time>
            </li>
          ))}
        </ul>
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
  const [gatewayStatus, setGatewayStatus] = React.useState<
    "checking" | "online" | "offline"
  >("checking");
  const [gatewayDetail, setGatewayDetail] = React.useState(
    retrievalGatewayUrl ? "Checking retrieval gateway." : "Gateway not configured.",
  );
  const rows = [
    ["Shelby RPC", network.shelbyRpcUrl],
    ["Aptos Full Node", network.fullnodeUrl],
    ["Indexer", network.indexerUrl],
    ["Contract", network.contractAddress],
    [
      "Payby Marketplace",
      network.marketplaceContractAddress || "Not configured",
    ],
    [
      "Payment Asset",
      network.paymentAssetMetadataAddress || "Not configured",
    ],
  ];

  React.useEffect(() => {
    if (!retrievalGatewayUrl) {
      setGatewayStatus("offline");
      setGatewayDetail("Set VITE_PAYBY_RETRIEVAL_GATEWAY_URL to enforce access.");
      return;
    }

    let cancelled = false;

    async function checkGateway() {
      setGatewayStatus("checking");
      try {
        const response = await fetch(`${retrievalGatewayUrl}/health`);
        const data = (await response.json()) as {
          ok?: boolean;
          policyMode?: string;
          signatureVerification?: string;
          marketplaceRegistry?: string;
        };

        if (cancelled) return;

        if (!response.ok || !data.ok) {
          throw new Error("Gateway health check failed.");
        }

        setGatewayStatus("online");
        setGatewayDetail(
          `${data.policyMode ?? "server-policy"} / ${
            data.signatureVerification ?? "signature verification"
          } / ${data.marketplaceRegistry ?? "marketplace unknown"}`,
        );
      } catch {
        if (cancelled) return;
        setGatewayStatus("offline");
        setGatewayDetail("Gateway is not reachable from this browser.");
      }
    }

    void checkGateway();

    return () => {
      cancelled = true;
    };
  }, []);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
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
          {gatewayStatus === "online" ? (
            <ShieldCheck size={18} />
          ) : gatewayStatus === "checking" ? (
            <KeyRound size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>Retrieval gateway</span>
          <strong>
            {gatewayStatus === "online"
              ? "Online"
              : gatewayStatus === "checking"
                ? "Checking"
                : "Offline"}
          </strong>
          <p>{gatewayDetail}</p>
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
              ? "Vault metadata is mirrored through the Payby gateway."
              : "Payby keeps a browser copy and retries gateway sync when available."}
          </p>
        </div>
      </div>
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
        {rows.map(([label, value]) => (
          <div className="endpoint" key={label}>
            <span>{label}</span>
            <code>{value}</code>
            <button
              className="icon-button"
              type="button"
              aria-label={`Copy ${label}`}
              title={`Copy ${label}`}
              onClick={() => copy(value)}
            >
              <Copy size={16} />
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

function LockedMediaPreview({
  accessMode,
  gatewayReady,
}: {
  accessMode: AccessMode;
  gatewayReady: boolean;
}) {
  return (
    <div className="media-preview locked-preview">
      <div>
        <Lock size={42} />
        <strong>Access controlled media</strong>
        <span>
          {gatewayReady
            ? `This ${accessMode} asset requires a signed wallet session.`
            : "Configure the Payby retrieval gateway to enforce this policy."}
        </span>
      </div>
    </div>
  );
}

function PublicMediaPage({
  route,
  selectedNetwork,
  metadataStore,
  profile,
  onOpenApp,
}: {
  route: AppRoute;
  selectedNetwork: PaybyNetwork;
  metadataStore: ReturnType<typeof useStoredMetadata>;
  profile: CreatorProfile;
  onOpenApp: () => void;
}) {
  const { account, connected, signMessage, signAndSubmitTransaction } =
    useWallet();
  const owner = route.owner ?? "";
  const blobName = route.blobName ?? "";
  const metadata = metadataStore.metadata[createMediaKey(owner, blobName)];
  const isLocked = isGatewayRequired(metadata);
  const [unlockState, setUnlockState] = React.useState<UnlockState>("idle");
  const [accessToken, setAccessToken] = React.useState("");
  const [unlockMessage, setUnlockMessage] = React.useState("");
  const mediaUrl =
    isLocked && accessToken
      ? getControlledDownloadUrl(selectedNetwork, owner, blobName, accessToken)
      : getControlledDownloadUrl(selectedNetwork, owner, blobName);

  async function submitPaidUnlockPurchase() {
    if (!metadata) throw new Error("Media metadata is not available.");

    const functionId = marketplaceFunction(selectedNetwork, "purchase");
    if (!functionId) {
      throw new Error("Payby marketplace contract is not configured.");
    }

    setUnlockMessage("Submit the paid unlock transaction from your wallet.");
    const response = await signAndSubmitTransaction({
      data: {
        function: functionId,
        functionArguments: [blobName],
      },
    });
    const hash = getTransactionHash(response);
    setUnlockMessage(
      hash
        ? "Payment submitted. Waiting for Aptos confirmation before unlocking."
        : "Payment submitted. Waiting for Aptos confirmation before unlocking.",
    );
    await waitForTransaction(selectedNetwork, hash);
  }

  async function requestAccessSession() {
    if (!metadata || !account) {
      throw new Error("Connect a wallet before requesting access.");
    }

    const address = getAccountAddress(account);
    const nonce = crypto.randomUUID();
    const message = createUnlockMessage({
      selectedNetwork,
      owner,
      blobName,
      nonce,
    });

    setUnlockMessage("Sign the access request from your wallet.");
    const signed = await signMessage({
      address: true,
      application: true,
      chainId: true,
      message,
      nonce,
    });
    const response = await fetch(`${retrievalGatewayUrl}/api/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address,
        publicKey: account.publicKey?.toString(),
        network: selectedNetwork,
        owner,
        blobName,
        nonce,
        message,
        accessPolicy: {
          mode: metadata.accessMode,
          allowlist: metadata.allowlist,
          price: metadata.price,
          currency: metadata.currency,
        },
        signedMessage: {
          ...signed,
          signature: signed.signature?.toString(),
        },
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      token?: string;
      error?: string;
    };

    if (!response.ok || !data.token) {
      throw new Error(data.error || "Access request was denied.");
    }

    return data.token;
  }

  async function unlockMedia() {
    if (!metadata) {
      setUnlockState("denied");
      setUnlockMessage("Media metadata is not available in this browser.");
      return;
    }

    if (!retrievalGatewayUrl) {
      setUnlockState("denied");
      setUnlockMessage("Controlled retrieval gateway is not configured.");
      return;
    }

    if (!connected || !account) {
      setUnlockState("denied");
      setUnlockMessage("Connect a wallet before requesting access.");
      return;
    }

    try {
      setUnlockState("signing");
      let token = "";

      try {
        token = await requestAccessSession();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Access request was denied.";
        const canPurchase =
          metadata.accessMode === "paid" &&
          Boolean(PAYBY_NETWORKS[selectedNetwork].marketplaceContractAddress) &&
          /purchase|payment|paid/i.test(message);

        if (!canPurchase) throw error;

        await submitPaidUnlockPurchase();
        token = await requestAccessSession();
      }

      setAccessToken(token);
      setUnlockState("authorized");
      setUnlockMessage("Access granted. Download is routed through Payby gateway.");
    } catch (error) {
      setUnlockState("denied");
      setUnlockMessage(
        error instanceof Error ? error.message : "Could not unlock this media.",
      );
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
              <h1>{metadata?.title || blobName}</h1>
              <span>{metadata?.description || "Media shared from a Payby creator vault."}</span>
            </div>
            {isLocked ? <Lock size={24} /> : <FileVideo size={24} />}
          </div>
          {isLocked && !accessToken ? (
            <LockedMediaPreview
              accessMode={metadata?.accessMode ?? "free"}
              gatewayReady={Boolean(retrievalGatewayUrl)}
            />
          ) : (
            <MediaPreview url={mediaUrl} title={metadata?.title || blobName} />
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
                  ? "Processing access..."
                  : metadata?.accessMode === "paid"
                    ? "Verify or purchase"
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
            <strong>{metadata?.accessMode || "Unknown"}</strong>
            <p>
              {isLocked
                ? retrievalGatewayUrl
                  ? "This media requires a signed wallet session through the Payby retrieval gateway."
                  : "This media requires a retrieval gateway before access can be enforced."
                : "This media is marked as free access by the creator metadata."}
            </p>
          </div>
          {metadata?.price ? (
            <div className="network-mini-card">
              <span>Price intent</span>
              <strong>
                {metadata.price} {metadata.currency}
              </strong>
              <p>
                Paid media checks the Payby marketplace registry before the
                gateway releases a download session.
              </p>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

export default App;
