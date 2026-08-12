import * as React from "react";
import {
  ArrowRight,
  Clock,
  Database,
  Download,
  ExternalLink,
  FileVideo,
  PlugZap,
  Share2,
  ShieldCheck,
  Tag,
  Trash2,
} from "lucide-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  useDeleteObjects,
  useFullObjectMetadata,
} from "@shelby-protocol/react";
import type {
  FullObjectMetadata,
  ShelbyClient,
} from "@shelby-protocol/sdk/browser";
import { PAYBY_NETWORKS, type PaybyNetwork } from "../../config/networks";
import type {
  AccessMode,
  ActivityInput,
  ChainListing,
  ListingSalesSummary,
  MetadataSyncState,
  RepublishDraft,
} from "../../domain/models";
import type { useStoredMetadata } from "../../hooks/useStoredMetadata";
import { waitForTransaction } from "../../services/aptos/fullnode";
import {
  getAccountAddress,
  isWalletNetworkAligned,
  requestWalletNetworkChange,
  walletNetworkMismatchMessage,
} from "../../services/aptos/wallet";
import {
  marketplaceFunction,
  policyIdToAccessMode,
  readChainListing,
  readListingSalesSummary,
} from "../../services/payby/marketplace";
import { getDownloadUrl, getShareUrl } from "../../services/shelby/storage";
import { writeLocalJson } from "../../services/storage/local";
import {
  accessModeLabel,
  createMediaKey,
  formatAssetUnits,
  shortenAddress,
} from "../../utils/formatters";
import type { AppRoute } from "../../app/router";
import { MediaPreview } from "../../components/MediaPreview";
import { PageHeader } from "../../components/workspace/PageHeader";

type BlobLike = {
  name?: string;
  blobName?: string;
  blobNameSuffix?: string;
  size?: number;
  expirationMicros?: number;
  creationMicros?: number;
  isWritten?: boolean;
};

const REPUBLISH_DRAFT_KEY = "payby-republish-draft-v1";
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const ACCESS_POLICY_IDS: Record<AccessMode, number> = {
  free: 0,
  allowlist: 1,
  paid: 2,
  nft: 3,
  subscription: 4,
};
const formatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

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

function getPaymentAssetAddress(
  selectedNetwork: PaybyNetwork,
  currency: "APT" | "SHELBYUSD",
) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  return network.paymentAssets[currency] || network.paymentAssetMetadataAddress;
}

function userFacingError(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : "";
  const message = raw || fallback;
  const lower = message.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("rejected")) {
    return "Wallet approval was rejected.";
  }
  if (lower.includes("insufficient") || lower.includes("balance")) {
    return "Wallet balance is not enough for this transaction.";
  }
  if (lower.includes("simulation") || lower.includes("vmstatus")) {
    return "Aptos rejected the transaction during validation. Check network, balance, and listing state.";
  }
  return message;
}

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

function metadataRegistryLabel(syncState: MetadataSyncState) {
  if (syncState === "synced") return "Synced";
  if (syncState === "syncing") return "Checking";
  if (syncState === "offline") return "Offline cache";
  return "Ready";
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
export function MediaDetailPage({
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
  const blobQuery = useFullObjectMetadata({
    client: shelbyClient,
    account: owner,
    name: blobName,
    enabled: Boolean(owner && blobName),
  });
  const [chainListing, setChainListing] = React.useState<ChainListing | null>(null);
  const [listingSales, setListingSales] = React.useState<ListingSalesSummary>({
    saleCount: 0,
    revenue: "0",
  });
  const [chainListingState, setChainListingState] = React.useState<
    "checking" | "found" | "missing" | "error" | "unconfigured"
  >("checking");
  const [registryRepairing, setRegistryRepairing] = React.useState(false);
  const [allowlistDraft, setAllowlistDraft] = React.useState("");
  const [allowlistSaving, setAllowlistSaving] = React.useState(false);
  const deleteBlobs = useDeleteObjects({
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
      setActionMessage(userFacingError(error, "Delete needs attention."));
    },
  });
  const shelbyBlobUrl = getDownloadUrl(selectedNetwork, owner, blobName);
  const shareUrl = getShareUrl(owner, blobName);
  const blobData = blobQuery.data as (FullObjectMetadata & BlobLike) | null;
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
          ? "Registry setup needed"
          : chainListingState === "error"
            ? "Refresh needed"
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

  React.useEffect(() => {
    if (!owner || !blobName || !PAYBY_NETWORKS[selectedNetwork].marketplaceContractAddress) {
      setListingSales({ saleCount: 0, revenue: "0" });
      return;
    }

    let cancelled = false;
    void readListingSalesSummary(selectedNetwork, owner, blobName)
      .then((summary) => {
        if (!cancelled) setListingSales(summary ?? { saleCount: 0, revenue: "0" });
      })
      .catch(() => {
        if (!cancelled) setListingSales({ saleCount: 0, revenue: "0" });
      });

    return () => {
      cancelled = true;
    };
  }, [blobName, owner, selectedNetwork]);

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
          typeArguments: [],
          functionArguments: [
            blobName,
            metadata.title || blobName,
            ACCESS_POLICY_IDS[metadata.accessMode],
            parseAssetUnits(metadata.price),
            getPaymentAssetAddress(selectedNetwork, metadata.currency) ||
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
      setActionMessage(userFacingError(error, "Registry repair needs attention."));
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
          typeArguments: [],
          functionArguments: [
            blobName,
            nextMetadata.title || blobName,
            ACCESS_POLICY_IDS.allowlist,
            parseAssetUnits(nextMetadata.price),
            getPaymentAssetAddress(selectedNetwork, nextMetadata.currency) ||
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
      setActionMessage(userFacingError(error, "Allowlist update needs attention."));
    } finally {
      setAllowlistSaving(false);
    }
  }

  return (
    <section className="workspace-layout detail-layout">
      <div className="panel detail-panel">
        <PageHeader
          eyebrow={metadata?.category || "Media detail"}
          title={metadata?.title || blobName}
          description={metadata?.description || "Media stored on Shelby and managed by this wallet."}
          icon={<FileVideo size={24} />}
        />

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
            onClick={() => {
              if (metadata) {
                writeLocalJson<RepublishDraft>(REPUBLISH_DRAFT_KEY, {
                  metadata,
                  sourceBlobName: blobName,
                  createdAt: Date.now(),
                });
              }
              onNavigate({ name: "publish" });
            }}
          >
            Renew storage
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
          <DetailItem label="Sales" value={`${listingSales.saleCount}`} />
          <DetailItem label="Revenue" value={formatAssetUnits(listingSales.revenue, metadata?.currency ?? "APT")} />
          <DetailItem label="Shelby route" value={PAYBY_NETWORKS[selectedNetwork].label} />
          <DetailItem label="Registry state" value={registryState} />
          <DetailItem label="Chain policy" value={chainRegistryLabel} />
        </div>

        <section className="media-proof-card" aria-label="Shelby media proof">
          <div className="media-proof-head">
            <div>
              <span>Shelby media proof</span>
              <strong>Storage route and on-chain access evidence</strong>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="media-proof-grid">
            <div>
              <span>Shelby RPC</span>
              <code>{PAYBY_NETWORKS[selectedNetwork].shelbyRpcUrl}</code>
            </div>
            <div>
              <span>Media route</span>
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
                  "Setup needed"}
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
                  "Setup needed"}
              </code>
            </div>
            <div>
              <span>Retrieval</span>
              <strong>Shelby route</strong>
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
                ? "This Shelby media exists, but Payby did not find its marketplace policy yet."
                : chainListingState === "unconfigured"
                  ? "Add the marketplace contract address to verify policy state."
                  : chainListingState === "error"
                    ? "Payby could not read the listing view from the active fullnode. Refresh after a moment."
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
            {expiryState.detail} Use renewal when a media record needs a fresh
            Shelby storage window.
          </p>
        </div>
      </aside>
    </section>
  );
}
