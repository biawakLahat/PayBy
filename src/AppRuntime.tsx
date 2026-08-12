import React from "react";
import {
  ArrowRight,
  Database,
  FileVideo,
  Send,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShelbyClientProvider } from "@shelby-protocol/react";
import type { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { ShelbyClient as ShelbyBrowserClient } from "@shelby-protocol/sdk/browser";
import { PaybyLogo } from "./components/PaybyLogo";
import aptosMark from "../assets/readme/aptos.png";
import shelbyMark from "../assets/readme/shelby.jpg";
import {
  PAYBY_NETWORKS,
  defaultNetwork,
  paybyWallets,
  type PaybyNetwork,
} from "./config/networks";
import type {
  AccessMode,
  ChainListing,
  MediaMetadata,
  PurchaseReceipt,
  VisibilityMode,
} from "./domain/models";
import {
  getAccountAddress,
} from "./services/aptos/wallet";
import {
  policyIdToAccessMode,
  readBuyerPurchaseRecords,
  readChainListing,
  readChainPurchases,
} from "./services/payby/marketplace";
import {
  getShelbyUri,
  resolveShelbyUri,
} from "./services/shelby/storage";
import { useActivityFeed } from "./hooks/useActivityFeed";
import { useCreatorProfile } from "./hooks/useCreatorProfile";
import { usePendingPublishes } from "./hooks/usePendingPublishes";
import { usePurchaseReceipts } from "./hooks/usePurchaseReceipts";
import { useStoredMetadata } from "./hooks/useStoredMetadata";
import { useTransactionHistory } from "./hooks/useTransactionHistory";
import {
  useRoute,
  type AppRoute,
  type AppViewName,
} from "./app/router";
import { WorkspacePage } from "./pages/workspace/WorkspacePage";
import { EmptyState } from "./components/EmptyState";
import { createMediaKey } from "./utils/formatters";
import {
  NetworkSwitch,
  ThemeToggle,
  WalletControl,
  type ThemeName,
} from "./components/workspace/WorkspaceControls";

type AppProps = {
  selectedNetwork: PaybyNetwork;
  onNetworkChange: (network: PaybyNetwork) => void;
  shelbyClient: ShelbyClient | null;
};

const VaultPage = React.lazy(async () => ({
  default: (await import("./pages/workspace/VaultPage")).VaultPage,
}));
const PublishPage = React.lazy(async () => ({
  default: (await import("./pages/workspace/PublishPage")).PublishPage,
}));
const LibraryPage = React.lazy(async () => ({
  default: (await import("./pages/workspace/LibraryPage")).LibraryPage,
}));
const AnalyticsPage = React.lazy(async () => ({
  default: (await import("./pages/workspace/AnalyticsPage")).AnalyticsPage,
}));
const DiscoverPage = React.lazy(async () => ({
  default: (await import("./pages/workspace/DiscoverPage")).DiscoverPage,
}));
const NetworkPage = React.lazy(async () => ({
  default: (await import("./pages/workspace/NetworkPage")).NetworkPage,
}));
const MediaDetailPage = React.lazy(async () => ({
  default: (await import("./pages/workspace/MediaDetailPage")).MediaDetailPage,
}));
const ProfilePage = React.lazy(async () => ({
  default: (await import("./pages/workspace/ProfilePage")).ProfilePage,
}));
const ActivityPage = React.lazy(async () => ({
  default: (await import("./pages/workspace/ActivityPage")).ActivityPage,
}));
const CreatorPage = React.lazy(async () => ({
  default: (await import("./pages/public/CreatorPage")).CreatorPage,
}));
const MediaPage = React.lazy(async () => ({
  default: (await import("./pages/public/MediaPage")).MediaPage,
}));

function PageLoadingState({ label }: { label: string }) {
  return <EmptyState title={label} body="Preparing this Payby route." />;
}

function ShelbyRouteUnavailable({
  selectedNetwork,
  onNetworkChange,
  theme,
  setTheme,
  onHome,
  onNavigate,
}: {
  selectedNetwork: PaybyNetwork;
  onNetworkChange: (network: PaybyNetwork) => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  onHome: () => void;
  onNavigate: (route: AppRoute) => void;
}) {
  return (
    <WorkspacePage
      currentView="network"
      routeTransitionKey="unsupported-shelby-route"
      networkLabel={PAYBY_NETWORKS[selectedNetwork].label}
      onHome={onHome}
      onNavigate={onNavigate}
      networkControl={
        <NetworkSwitch
          selectedNetwork={selectedNetwork}
          onNetworkChange={onNetworkChange}
        />
      }
      themeControl={<ThemeToggle theme={theme} setTheme={setTheme} />}
      walletControl={<WalletControl />}
    >
      <section className="panel route-unavailable" aria-labelledby="route-unavailable-title">
        <div className="route-unavailable-mark" aria-hidden="true">
          <ShieldCheck size={22} />
        </div>
        <p className="eyebrow">Storage route unavailable</p>
        <h2 id="route-unavailable-title">Shelby Testnet requires Early Access</h2>
        <p>
          The current Shelby SDK no longer exposes a supported Testnet client.
          Payby has stopped this route before any indexer request or wallet
          transaction is sent, so it cannot accidentally use Shelbynet data.
        </p>
        <button
          className="button button-primary"
          type="button"
          onClick={() => onNetworkChange("shelbynet")}
        >
          Return to Shelbynet
          <ArrowRight size={16} />
        </button>
      </section>
    </WorkspacePage>
  );
}

type PublishPhase =
  | "idle"
  | "preparing"
  | "wallet"
  | "confirming"
  | "storing"
  | "registry"
  | "success"
  | "error";

type BlobLike = {
  name?: string;
  blobName?: string;
  blobNameSuffix?: string;
  size?: number;
  expirationMicros?: number;
  creationMicros?: number;
  isWritten?: boolean;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
    },
  },
});

function transactionExplorerUrl(
  selectedNetwork: PaybyNetwork,
  transactionHash: string,
) {
  return `https://explorer.aptoslabs.com/txn/${transactionHash}?network=${PAYBY_NETWORKS[selectedNetwork].explorerNetwork}`;
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



function App({ selectedNetwork, onNetworkChange, shelbyClient }: AppProps) {
  const [route, navigate] = useRoute();
  const wallet = useWallet();
  const accountAddress = getAccountAddress(wallet.account);
  const metadataStore = useStoredMetadata();
  const profileStore = useCreatorProfile(accountAddress, selectedNetwork);
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

  if (route.name !== "landing" && !shelbyClient) {
    return (
      <ShelbyRouteUnavailable
        selectedNetwork={selectedNetwork}
        onNetworkChange={onNetworkChange}
        theme={theme}
        setTheme={setTheme}
        onHome={() => navigate({ name: "landing" })}
        onNavigate={navigate}
      />
    );
  }

  if (route.name === "share") {
    return (
      <React.Suspense fallback={<PageLoadingState label="Loading shared media" />}>
        <MediaPage
          route={route}
          selectedNetwork={selectedNetwork}
          metadataStore={metadataStore}
          purchaseStore={purchaseStore}
          transactionStore={transactionStore}
          profile={profileStore.profile}
          profileOwner={accountAddress}
          onOpenApp={() => navigate({ name: "vault" })}
          walletControl={<WalletControl />}
          resolveCommittedMetadata={fetchCommittedMetadata}
          transactionExplorerUrl={transactionExplorerUrl}
        />
      </React.Suspense>
    );
  }

  if (route.name === "creator") {
    return (
      <React.Suspense fallback={<PageLoadingState label="Loading creator vault" />}>
        <CreatorPage
          route={route}
          selectedNetwork={selectedNetwork}
          metadataStore={metadataStore}
          fallbackProfile={profileStore.profile}
          fallbackProfileOwner={accountAddress}
          onOpenApp={() => navigate({ name: "vault" })}
          onNavigate={navigate}
          walletControl={<WalletControl />}
          resolveCommittedMetadata={fetchCommittedMetadata}
        />
      </React.Suspense>
    );
  }

  return route.name === "landing" ? (
    <LandingPage
      theme={theme}
      setTheme={setTheme}
      onLaunch={() => navigate({ name: "vault" })}
    />
  ) : shelbyClient ? (
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
  ) : (
    <ShelbyRouteUnavailable
      selectedNetwork={selectedNetwork}
      onNetworkChange={onNetworkChange}
      theme={theme}
      setTheme={setTheme}
      onHome={() => navigate({ name: "landing" })}
      onNavigate={navigate}
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
    <main className="landing landing-editorial">
      <header className="landing-nav">
        <button className="brand-mark" onClick={onLaunch} type="button" aria-label="Open Payby app">
          <PaybyLogo />
        </button>
        <nav className="landing-links" aria-label="Landing sections">
          <a href="#protocol">Workflow</a>
          <a href="#creator-os">Product</a>
          <a href="#networks">Infrastructure</a>
        </nav>
        <div className="nav-actions">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <button className="button button-secondary" onClick={onLaunch}>
            <span className="landing-nav-label-full">Enter workspace</span>
            <span className="landing-nav-label-compact">Open</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-availability">
            <i aria-hidden="true" />
            Live on Shelbynet
          </div>
          <h1>Payby</h1>
          <p className="landing-hero-lede">
            Publish creator media to Shelby. Set access on Aptos. Share one
            link buyers can unlock with their wallet.
          </p>
          <div className="hero-actions">
            <button className="button button-primary button-xl" onClick={onLaunch}>
              Open workspace
              <ArrowRight size={19} />
            </button>
            <a className="landing-text-link" href="#protocol">
              Review the workflow
              <ArrowRight size={17} />
            </a>
          </div>
        </div>

        <figure
          className="landing-route-map"
          aria-label="Creator media stored on Shelby with its access policy recorded on Aptos"
        >
          <figcaption className="landing-route-caption">
            <span>Publishing route</span>
            <strong>One signature, two network records</strong>
          </figcaption>
          <div className="landing-route-line" />
          <div className="landing-route-node route-file">
            <span className="landing-route-icon">
              <FileVideo size={22} />
            </span>
            <small>Creator media</small>
            <strong>creator-cut.mov</strong>
          </div>
          <div className="landing-route-node route-shelby">
            <span className="landing-route-icon is-image">
              <img src={shelbyMark} alt="" />
            </span>
            <small>Stored on</small>
            <strong>Shelby</strong>
          </div>
          <div className="landing-route-node route-aptos">
            <span className="landing-route-icon is-image">
              <img src={aptosMark} alt="" />
            </span>
            <small>Recorded on</small>
            <strong>Aptos</strong>
          </div>
        </figure>

        <dl className="landing-hero-ledger">
          <div>
            <dt>Storage</dt>
            <dd>Shelby blobs</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Aptos policy</dd>
          </div>
          <div>
            <dt>Ownership</dt>
            <dd>Creator wallet</dd>
          </div>
        </dl>
      </section>

      <section className="landing-section landing-process" id="protocol">
        <header className="landing-section-intro reveal-on-scroll">
          <span>01 / Workflow</span>
          <h2>A direct path from file to buyer.</h2>
          <p>
            Payby keeps storage, policy, and wallet proof in one publishing
            sequence.
          </p>
        </header>
        <ol className="landing-process-list">
          <li className="reveal-on-scroll">
            <span>01</span>
            <div>
              <h3>Prepare the media</h3>
              <p>Select the file, retention period, visibility, and price.</p>
            </div>
            <strong>Local</strong>
          </li>
          <li className="reveal-on-scroll">
            <span>02</span>
            <div>
              <h3>Store the blob</h3>
              <p>Upload the original media directly to the active Shelby route.</p>
            </div>
            <strong>Shelby</strong>
          </li>
          <li className="reveal-on-scroll">
            <span>03</span>
            <div>
              <h3>Record access</h3>
              <p>Sign the listing and buyer access policy with an Aptos wallet.</p>
            </div>
            <strong>Aptos</strong>
          </li>
        </ol>
      </section>

      <section className="landing-section landing-capabilities" id="creator-os">
        <header className="landing-section-intro reveal-on-scroll">
          <span>02 / Product</span>
          <h2>Built around the work creators repeat.</h2>
          <p>
            Publish, manage, sell, and verify media without losing track of the
            wallet or network behind each record.
          </p>
        </header>
        <div className="landing-capability-index">
          <article className="reveal-on-scroll">
            <FileVideo size={22} />
            <span>Vault</span>
            <h3>One library for every Shelby blob.</h3>
            <p>Inspect retention, listing state, access, and public links.</p>
          </article>
          <article className="reveal-on-scroll">
            <Wallet size={22} />
            <span>Commerce</span>
            <h3>Sales belong to the creator wallet.</h3>
            <p>Buyer receipts and creator revenue are read from Aptos.</p>
          </article>
          <article className="reveal-on-scroll">
            <Database size={22} />
            <span>Routes</span>
            <h3>Know where every write is going.</h3>
            <p>Review Shelby RPC, fullnode, indexer, and contract details.</p>
          </article>
        </div>
      </section>

      <section className="landing-infrastructure" id="networks">
        <div className="landing-infrastructure-copy reveal-on-scroll">
          <span>03 / Infrastructure</span>
          <h2>Storage and access live where they belong.</h2>
          <p>
            Shelby stores the media. Aptos records the listing, purchase, and
            access proof. The connected wallet ties both sides together.
          </p>
          <button className="button button-primary button-xl" onClick={onLaunch}>
            Inspect live routes
            <ArrowRight size={19} />
          </button>
        </div>
        <div className="landing-network-ledger reveal-on-scroll">
          <div>
            <img src={shelbyMark} alt="Shelby" />
            <span>
              <small>Media layer</small>
              <strong>Shelby</strong>
            </span>
            <em>Blob storage</em>
          </div>
          <div>
            <img src={aptosMark} alt="Aptos" />
            <span>
              <small>Policy layer</small>
              <strong>Aptos</strong>
            </span>
            <em>Access records</em>
          </div>
          <div className="is-route">
            <ShieldCheck size={24} />
            <span>
              <small>Current route</small>
              <strong>Shelbynet</strong>
            </span>
            <em>Live testing</em>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <div className="landing-footer-brand">
            <button className="brand-mark" onClick={onLaunch} type="button" aria-label="Open Payby app">
              <PaybyLogo />
            </button>
            <p>
              Creator media stored on Shelby, with ownership and buyer access
              recorded on Aptos.
            </p>
          </div>
          <div className="landing-footer-links" aria-label="Payby links">
            <a href="https://x.com/0xLuxee" target="_blank" rel="noreferrer" aria-label="Payby on X">
              <SocialXIcon />
            </a>
            <a href="https://github.com/biawakLahat/PayBy" target="_blank" rel="noreferrer" aria-label="Payby GitHub repository">
              <SocialGitHubIcon />
            </a>
            <a href="https://discord.com" target="_blank" rel="noreferrer" aria-label="Payby community">
              <SocialDiscordIcon />
            </a>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>&copy; 2026 Payby. All rights reserved.</span>
          <span>
            Built by <a href="https://x.com/0xLuxee" target="_blank" rel="noreferrer">Luxe</a>
            <Send size={14} />
          </span>
        </div>
      </footer>
    </main>
  );
}

function SocialXIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        fill="currentColor"
        d="M18.9 2.8h3.3l-7.2 8.2 8.5 11.2h-6.7l-5.2-6.8-6 6.8H2.3l7.7-8.8L1.8 2.8h6.8l4.7 6.2 5.6-6.2Zm-1.2 17.4h1.8L7.6 4.7H5.7l12 15.5Z"
      />
    </svg>
  );
}

function SocialGitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        fill="currentColor"
        d="M12 .9C5.9.9 1 5.8 1 11.9c0 4.9 3.2 9 7.6 10.5.6.1.8-.2.8-.6v-2.1c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1.5 2.1 3.2 1.5.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.2-5.1-5.5 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.5.1-3 0 0 .9-.3 3 1.1.9-.2 1.8-.4 2.7-.4s1.9.1 2.7.4c2.1-1.4 3-1.1 3-1.1.6 1.5.2 2.7.1 3 .7.8 1.1 1.8 1.1 3 0 4.3-2.6 5.2-5.1 5.5.4.3.8 1 .8 2.1v3.1c0 .4.2.7.8.6 4.4-1.5 7.6-5.6 7.6-10.5C23 5.8 18.1.9 12 .9Z"
      />
    </svg>
  );
}

function SocialDiscordIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        fill="currentColor"
        d="M19.5 5.1A17 17 0 0 0 15.3 3l-.5 1.1a15.4 15.4 0 0 0-5.6 0L8.7 3a17 17 0 0 0-4.2 2.1C1.8 9.1 1 13 1.4 16.8A17 17 0 0 0 6.5 19.4l1.1-1.8c-.6-.2-1.1-.5-1.6-.8l.4-.3a12.2 12.2 0 0 0 11.2 0l.4.3c-.5.3-1 .6-1.6.8l1.1 1.8a17 17 0 0 0 5.1-2.6c.5-4.4-.8-8.2-3.1-11.7ZM8.8 14.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.4 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"
      />
    </svg>
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
}: Omit<AppProps, "shelbyClient"> & {
  shelbyClient: ShelbyClient;
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
  const routeTransitionKey = `${route.name}-${route.owner ?? ""}-${route.blobName ?? ""}`;

  return (
    <WorkspacePage
      currentView={currentView}
      routeTransitionKey={routeTransitionKey}
      networkLabel={network.label}
      onHome={onHome}
      onNavigate={onNavigate}
      networkControl={
        <NetworkSwitch
          selectedNetwork={selectedNetwork}
          onNetworkChange={onNetworkChange}
        />
      }
      themeControl={<ThemeToggle theme={theme} setTheme={setTheme} />}
      walletControl={<WalletControl />}
    >
      <React.Suspense fallback={<PageLoadingState label="Loading workspace" />}>
      {currentView === "vault" ? (
            <VaultPage
              accountAddress={accountAddress}
              selectedNetwork={selectedNetwork}
              shelbyClient={shelbyClient}
              metadataStore={metadataStore}
              pendingPublishStore={pendingPublishStore}
              onNavigate={onNavigate}
              addActivity={activityFeed.addActivity}
              resolveCommittedMetadata={fetchCommittedMetadata}
              transactionExplorerUrl={transactionExplorerUrl}
            />
          ) : null}
      {currentView === "publish" ? (
            <PublishPage
              accountAddress={accountAddress}
              selectedNetwork={selectedNetwork}
              shelbyClient={shelbyClient}
              saveMetadata={metadataStore.saveMetadata}
              pendingPublishStore={pendingPublishStore}
              transactionStore={transactionStore}
              addActivity={activityFeed.addActivity}
              transactionExplorerUrl={transactionExplorerUrl}
            />
          ) : null}
      {currentView === "library" ? (
            <LibraryPage
              accountAddress={accountAddress}
              selectedNetwork={selectedNetwork}
              metadata={metadataStore.metadata}
              purchaseStore={purchaseStore}
              onNavigate={onNavigate}
              loadPurchaseIndex={loadOnChainPurchaseIndex}
              getTransactionExplorerUrl={transactionExplorerUrl}
            />
          ) : null}
      {currentView === "analytics" ? (
            <AnalyticsPage
              accountAddress={accountAddress}
              selectedNetwork={selectedNetwork}
              metadata={metadataStore.metadata}
              onNavigate={onNavigate}
              resolveCommittedMetadata={fetchCommittedMetadata}
            />
          ) : null}
      {currentView === "discover" ? (
            <DiscoverPage
              selectedNetwork={selectedNetwork}
              metadata={metadataStore.metadata}
              onNavigate={onNavigate}
              resolveCommittedMetadata={fetchCommittedMetadata}
            />
          ) : null}
      {currentView === "network" ? (
            <NetworkPage
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
            <ProfilePage
              key={`profile-${selectedNetwork}-${accountAddress.toLowerCase() || "disconnected"}`}
              profile={profileStore.profile}
              saveProfile={profileStore.saveProfile}
              accountAddress={accountAddress}
              selectedNetwork={selectedNetwork}
              mediaCount={Object.values(metadataStore.metadata).filter(
                (item) =>
                  item.network === selectedNetwork &&
                  item.owner.toLowerCase() === accountAddress.toLowerCase(),
              ).length}
              onNavigate={onNavigate}
              addActivity={activityFeed.addActivity}
            />
          ) : null}
      {currentView === "activity" ? (
            <ActivityPage
              activity={activityFeed.activity}
              transactions={transactionStore.transactions}
              accountAddress={accountAddress}
              selectedNetwork={selectedNetwork}
              onNavigate={onNavigate}
              onRefreshTransactions={transactionStore.refreshTransactions}
              isRefreshingTransactions={transactionStore.isValidating}
              getTransactionExplorerUrl={transactionExplorerUrl}
            />
          ) : null}
      </React.Suspense>
    </WorkspacePage>
  );
}


function PaybyRuntime() {
  const [selectedNetwork, setSelectedNetwork] =
    React.useState<PaybyNetwork>(defaultNetwork);
  const network = PAYBY_NETWORKS[selectedNetwork];

  const shelbyClient = React.useMemo(() => {
    if (network.shelbyNetwork !== Network.SHELBYNET) return null;

    return new ShelbyBrowserClient({
      network: Network.SHELBYNET,
      apiKey: network.apiKey,
      rpc: {
        baseUrl: network.shelbyRpcUrl,
        apiKey: network.apiKey,
      },
      indexer: {
        baseUrl: network.indexerUrl,
        apiKey: network.apiKey,
      },
      locationHint: network.locationHint,
    });
  }, [
    network.apiKey,
    network.indexerUrl,
    network.locationHint,
    network.shelbyNetwork,
    network.shelbyRpcUrl,
  ]);

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
        {shelbyClient ? (
          <ShelbyClientProvider client={shelbyClient}>
            <App
              selectedNetwork={selectedNetwork}
              onNetworkChange={setSelectedNetwork}
              shelbyClient={shelbyClient}
            />
          </ShelbyClientProvider>
        ) : (
          <App
            selectedNetwork={selectedNetwork}
            onNetworkChange={setSelectedNetwork}
            shelbyClient={null}
          />
        )}
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  );
}

export default PaybyRuntime;
