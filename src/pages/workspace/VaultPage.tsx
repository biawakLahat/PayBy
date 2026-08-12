import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Database,
  Download,
  ExternalLink,
  FileArchive,
  ListChecks,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useAccountBlobs, useDeleteObjects } from "@shelby-protocol/react";
import type {
  FullObjectMetadata,
  ShelbyClient,
} from "@shelby-protocol/sdk/browser";
import { PAYBY_NETWORKS, type PaybyNetwork } from "../../config/networks";
import type {
  ActivityInput,
  ChainListing,
  MediaMetadata,
  PendingPublishItem,
  PendingPublishStatus,
} from "../../domain/models";
import type { usePendingPublishes } from "../../hooks/usePendingPublishes";
import type { useStoredMetadata } from "../../hooks/useStoredMetadata";
import {
  isWalletNetworkAligned,
  requestWalletNetworkChange,
  walletNetworkMismatchMessage,
} from "../../services/aptos/wallet";
import {
  metadataFromChainListing,
  readCreatorChainListings,
} from "../../services/payby/marketplace";
import { getDownloadUrl, getShareUrl } from "../../services/shelby/storage";
import { EmptyState } from "../../components/EmptyState";
import { PaginationControls } from "../../components/PaginationControls";
import { Button } from "../../components/workspace/Button";
import { IconButton } from "../../components/workspace/IconButton";
import { PageHeader } from "../../components/workspace/PageHeader";
import {
  accessModeLabel,
  createMediaKey,
  paginateItems,
  shortenAddress,
} from "../../utils/formatters";
import type { AppRoute } from "../../app/router";

type BlobLike = {
  name?: string;
  blobName?: string;
  blobNameSuffix?: string;
  size?: number;
  expirationMicros?: number;
  creationMicros?: number;
  isWritten?: boolean;
};

const VAULT_PAGE_SIZE = 8;
const formatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

function fileSize(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return formatter.format(bytes / 1024 ** index) + " " + units[index];
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
      label: String(remainingDays) + "d left",
      className: "is-danger",
      detail: "Retention is almost over. Re-publish this media to keep access reliable.",
    };
  }

  if (remainingDays <= 14) {
    return {
      label: String(remainingDays) + "d left",
      className: "is-warning",
      detail: "Retention is approaching expiry. Plan an extension or re-publish flow.",
    };
  }

  return {
    label: String(remainingDays) + "d left",
    className: "is-ready",
    detail: "Retention window is healthy for this Shelby blob.",
  };
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
    failed: "Needs attention",
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
    failed: "Publish needs review. Reopen the flow and continue from the last completed step.",
  };

  return details[status];
}

function userFacingError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
export function VaultPage({
  accountAddress,
  selectedNetwork,
  shelbyClient,
  metadataStore,
  pendingPublishStore,
  onNavigate,
  addActivity,
  resolveCommittedMetadata,
  transactionExplorerUrl,
}: {
  accountAddress: string;
  selectedNetwork: PaybyNetwork;
  shelbyClient: ShelbyClient;
  metadataStore: ReturnType<typeof useStoredMetadata>;
  pendingPublishStore: ReturnType<typeof usePendingPublishes>;
  onNavigate: (route: AppRoute) => void;
  addActivity: (item: ActivityInput) => void;
  resolveCommittedMetadata: (
    selectedNetwork: PaybyNetwork,
    owner: string,
    blobName: string,
    listing: ChainListing,
  ) => Promise<MediaMetadata | null>;
  transactionExplorerUrl: (network: PaybyNetwork, hash: string) => string;
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
  const deleteBlobs = useDeleteObjects({
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
      setActionMessage(userFacingError(error, "Delete needs attention."));
    },
  });

  const blobs = ((blobsQuery.data ?? []) as (FullObjectMetadata & BlobLike)[]).filter((blob) => {
    const name = blob.blobNameSuffix ?? blob.name ?? blob.blobName ?? "";
    return name.toLowerCase().includes(query.toLowerCase());
  });
  const indexedBlobNames = React.useMemo(
    () =>
      ((blobsQuery.data ?? []) as (FullObjectMetadata & BlobLike)[])
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
              (await resolveCommittedMetadata(
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
      <PageHeader
        eyebrow="Creator vault"
        title="Vault library"
        description="Manage media stored on Shelby and the access records linked to this creator wallet."
        actions={
          <div className="vault-header-actions">
            <Button variant="primary" compact className="vault-publish-button" onClick={() => onNavigate({ name: "publish" })}>
              <UploadCloud size={16} />
              Publish media
            </Button>
          </div>
        }
      />

      <div className="vault-metrics">
        <div className="vault-metric-card is-primary">
          <FileArchive size={18} />
          <span>Media</span>
          <strong>{blobs.length}</strong>
          <small>Stored to Shelby</small>
        </div>
        <div className="vault-metric-card">
          <Database size={18} />
          <span>Stored size</span>
          <strong>{fileSize(totalBytes)}</strong>
          <small>Total route usage</small>
        </div>
        <div className="vault-metric-card">
          <Clock size={18} />
          <span>Retention</span>
          <strong>{expiringSoonCount}</strong>
          <small>Need renewal soon</small>
        </div>
        <div className="vault-metric-card">
          <ListChecks size={18} />
          <span>Pending</span>
          <strong>{activePendingCount}</strong>
          <small>Waiting for sync</small>
        </div>
      </div>

      <div className="vault-toolbar">
        <label className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title or blob name"
          />
        </label>
        <div className="vault-toolbar-meta">
          <span>{blobs.length} shown</span>
          <strong>{shortenAddress(accountAddress)}</strong>
        </div>
      </div>

      <div className="vault-proof-strip">
        <div className="library-source-banner">
          <ShieldCheck size={18} />
          <div>
            <strong>
              {chainIndexState === "checking"
                ? "Rebuilding creator index from Aptos"
                : chainIndexState === "synced"
                  ? `Creator registry synced - ${chainListingCount} listings`
                  : chainIndexState === "unavailable"
                    ? "Marketplace registry needs setup"
                    : chainIndexState === "error"
                      ? "Creator registry needs refresh"
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
          transactionExplorerUrl={transactionExplorerUrl}
          onPublish={() => onNavigate({ name: "publish" })}
          onDismiss={(id) => pendingPublishStore.removePublishes([id])}
        />
      ) : null}

      {!accountAddress ? (
        <EmptyState
          icon={<Wallet size={20} />}
          title="Wallet required"
          body="Connect an Aptos wallet to load the Shelby blobs registered to your account."
        />
      ) : blobsQuery.isLoading ? (
        <EmptyState title="Loading vault" body="Reading your Shelby media and on-chain registry records." />
      ) : blobsQuery.isError ? (
        <EmptyState
          icon={<AlertTriangle size={20} />}
          title="Vault could not be loaded"
          body={(blobsQuery.error as Error)?.message ?? "The active Shelby route did not return media records."}
        />
      ) : blobs.length === 0 ? (
        <EmptyState
          icon={<UploadCloud size={20} />}
          title="Your vault is empty"
          body="Publish creator media to create the first Shelby record for this wallet."
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
                <div className="blob-main">
                  <div className="blob-title-row">
                    <strong>{metadata?.title || name}</strong>
                    {metadata?.accessMode ? (
                      <span className="blob-access-pill">{accessModeLabel(metadata.accessMode)}</span>
                    ) : null}
                  </div>
                  <span>{name}</span>
                  <div className="blob-meta-row">
                    <small>{fileSize(blob.size)}</small>
                    <small>Expires {formatMicros(blob.expirationMicros)}</small>
                    {metadata?.category ? <small>{metadata.category}</small> : null}
                  </div>
                </div>
                <span className={`expiry-pill ${expiryState.className}`}>
                  {expiryState.label}
                </span>
                <div className="blob-actions">
                  <Button
                    variant="ghost"
                    compact
                    onClick={() =>
                      onNavigate({
                        name: "detail",
                        owner: accountAddress,
                        blobName: name,
                      })
                    }
                  >
                    Detail
                  </Button>
                  <IconButton
                    label={`Share ${name}`}
                    icon={<Share2 size={17} />}
                    onClick={async () => {
                      await navigator.clipboard.writeText(getShareUrl(accountAddress, name));
                      addActivity({
                        type: "share",
                        label: "Copied share link",
                        detail: name,
                      });
                    }}
                  />
                  <a className="icon-button" href={url} target="_blank" rel="noreferrer">
                    <Download size={17} />
                  </a>
                  <IconButton
                    className="danger-button"
                    label={`Delete ${name}`}
                    icon={<Trash2 size={17} />}
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
                  />
                </div>
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
  transactionExplorerUrl,
  onPublish,
  onDismiss,
}: {
  items: PendingPublishItem[];
  selectedNetwork: PaybyNetwork;
  transactionExplorerUrl: (network: PaybyNetwork, hash: string) => string;
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
        <Button variant="ghost" compact onClick={onPublish}>
          Publish
          <ArrowRight size={15} />
        </Button>
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
                aria-label={`Dismiss publish item ${item.title}`}
                title="Dismiss publish item"
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
