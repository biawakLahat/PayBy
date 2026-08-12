import * as React from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  CreditCard,
  ExternalLink,
  FileVideo,
  Loader2,
  PlugZap,
  UploadCloud,
  X,
} from "lucide-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useUploadBlobs } from "@shelby-protocol/react";
import type { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { PAYBY_NETWORKS, type PaybyNetwork } from "../../config/networks";
import type {
  AccessMode,
  ActivityInput,
  MediaMetadata,
  PendingPublishStatus,
  RepublishDraft,
  VisibilityMode,
} from "../../domain/models";
import type { usePendingPublishes } from "../../hooks/usePendingPublishes";
import type { useTransactionHistory } from "../../hooks/useTransactionHistory";
import {
  readLiveChainId,
  signAndSubmitEntryFunction,
  waitForTransaction,
} from "../../services/aptos/fullnode";
import {
  getWalletChainId,
  isWalletNetworkAligned,
  normalizeEntryFunctionTransaction,
  requestWalletNetworkChange,
  walletNetworkChainMismatchMessage,
  walletNetworkMismatchMessage,
} from "../../services/aptos/wallet";
import {
  getAccessRegistryBlocker,
  marketplaceFunction,
} from "../../services/payby/marketplace";
import { getShelbyUri } from "../../services/shelby/storage";
import { readLocalJson } from "../../services/storage/local";
import {
  createMediaKey,
  formatAssetUnits,
} from "../../utils/formatters";
import { PageHeader } from "../../components/workspace/PageHeader";
import { FormField } from "../../components/workspace/FormField";

type PublishPhase =
  | "idle"
  | "preparing"
  | "wallet"
  | "confirming"
  | "storing"
  | "registry"
  | "success"
  | "error";

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
export function PublishPage({
  accountAddress,
  selectedNetwork,
  shelbyClient,
  saveMetadata,
  pendingPublishStore,
  transactionStore,
  addActivity,
  transactionExplorerUrl,
}: {
  accountAddress: string;
  selectedNetwork: PaybyNetwork;
  shelbyClient: ShelbyClient;
  saveMetadata: (items: MediaMetadata[]) => void;
  pendingPublishStore: ReturnType<typeof usePendingPublishes>;
  transactionStore: ReturnType<typeof useTransactionHistory>;
  addActivity: (item: ActivityInput) => void;
  transactionExplorerUrl: (network: PaybyNetwork, hash: string) => string;
}) {
  const {
    connected,
    account,
    network: walletNetwork,
    changeNetwork,
    signAndSubmitTransaction,
    signTransaction,
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
  const [republishDraft, setRepublishDraft] = React.useState<RepublishDraft | null>(
    null,
  );
  const activePublishRef = React.useRef({
    pendingIds: [] as string[],
    hash: "",
    mediaItems: [] as MediaMetadata[],
  });

  React.useEffect(() => {
    const draft = readLocalJson<RepublishDraft | null>(REPUBLISH_DRAFT_KEY, null);
    if (!draft || draft.metadata.network !== selectedNetwork) return;

    setRepublishDraft(draft);
    setTitle(draft.metadata.title);
    setDescription(draft.metadata.description);
    setCategory(draft.metadata.category);
    setTags(draft.metadata.tags.join(", "));
    setCoverUrl(draft.metadata.coverUrl);
    setVisibility(draft.metadata.visibility);
    setAccessMode(draft.metadata.accessMode);
    setPrice(draft.metadata.price);
    setCurrency(draft.metadata.currency);
    setAllowlist(draft.metadata.allowlist);
    setRetentionDays(30);
    setStatusMessage(
      "Renewal policy loaded. Select the media file again to renew Shelby storage.",
    );
  }, [selectedNetwork]);

  const uploadBlobs = useUploadBlobs({
    client: shelbyClient,
    onSuccess: (_data, variables) => {
      const items = activePublishRef.current.mediaItems;
      const uploadedNames = new Set(variables.blobs.map((blob) => blob.blobName));
      const mediaItems = items.filter((item) => uploadedNames.has(item.blobName));
      if (!accountAddress || mediaItems.length === 0) {
        const message = "Shelby storage completed, but no creator listing was prepared for the access registry.";
        pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
          status: "failed",
          error: message,
        });
        setPublishPhase("error");
        setStatusMessage(message);
        return;
      }

      saveMetadata(items);
      pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
        status: "registry",
        error: "",
      });
      transactionStore.updateTransaction(activePublishRef.current.hash, {
        status: "confirmed",
        detail: `Shelby storage completed for ${mediaItems.length} ${mediaItems.length === 1 ? "blob" : "blobs"}; waiting for the on-chain access registry.`,
        owner: accountAddress,
        blobNames: mediaItems.map((item) => item.blobName),
      });
      addActivity({
        type: "upload",
        label: `Stored ${mediaItems.length} media ${mediaItems.length === 1 ? "file" : "files"} on Shelby`,
        detail: `Waiting for the Aptos access registry on ${PAYBY_NETWORKS[selectedNetwork].label}`,
        blobNames: mediaItems.map((item) => item.blobName),
      });
      void registerAccessListings(mediaItems);
    },
    onError: (error) => {
      const message = userFacingError(error, "Upload needs attention.");
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
    currency,
  );
  const selectedPaymentAsset = getPaymentAssetAddress(selectedNetwork, currency);
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
        ? "Publish needs attention"
        : publishNoticeTone === "warning"
          ? "Action needed"
          : publishPhase === "idle"
            ? "Ready state"
            : "Publish in progress";

  async function getLiveWalletChainError() {
    let liveChainId: number;
    try {
      liveChainId = await readLiveChainId(selectedNetwork);
    } catch (error) {
      return error instanceof Error
        ? error.message
        : `Unable to verify the ${PAYBY_NETWORKS[selectedNetwork].label} chain before signing.`;
    }

    const walletChainId = getWalletChainId(walletNetwork);
    if (walletChainId !== null && walletChainId !== liveChainId) {
      return walletNetworkChainMismatchMessage(
        walletNetwork,
        selectedNetwork,
        liveChainId,
      );
    }

    return null;
  }

  async function registerAccessListings(items: MediaMetadata[]) {
    const registryItems = items;
    if (registryItems.length === 0) return;

    const functionId = marketplaceFunction(
      selectedNetwork,
      "upsert_listing_for_owner_with_metadata",
    );
    if (!functionId || !account) {
      const message = "The Aptos access registry is not configured for this network.";
      setPublishPhase("error");
      setRegistryRetryItems(registryItems);
      pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
        status: "failed",
        error: message,
      });
      setStatusMessage(message);
      return;
    }

    const chainError = await getLiveWalletChainError();
    if (chainError) {
      setPublishPhase("error");
      setRegistryRetryItems(registryItems);
      pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
        status: "failed",
        error: chainError,
      });
      setStatusMessage(chainError);
      return;
    }

    setPublishPhase("registry");
    pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
      status: "registry",
    });
    setStatusMessage(
      `Shelby storage complete. Registering ${registryItems.length} on-chain ${registryItems.length === 1 ? "listing" : "listings"} with metadata commitments.`,
    );

    for (const item of registryItems) {
      let registryHash = "";
      try {
        const metadataUri = item.metadataUri?.trim();
        const metadataHash = item.metadataHash?.trim();
        if (!metadataUri || !metadataHash) {
          throw new Error(
            `Metadata commitment is missing for ${item.title || item.blobName}. Retry the publish from the selected file.`,
          );
        }

        const hash = await signAndSubmitEntryFunction({
          selectedNetwork,
          sender: account.address.toString(),
          signTransaction,
          data: {
            function: functionId,
            typeArguments: [],
            functionArguments: [
              item.blobName,
              item.title,
              ACCESS_POLICY_IDS[item.accessMode],
              parseAssetUnits(item.price),
              getPaymentAssetAddress(selectedNetwork, item.currency) ||
                ZERO_ADDRESS,
              parseAllowlistAddresses(item.allowlist),
              metadataUri,
              metadataHash,
            ],
          },
        });
        if (!hash) {
          throw new Error(
            "Wallet submitted the access registry request, but no transaction hash was returned.",
          );
        }
        registryHash = hash;
        setTransactionHash(hash);
        transactionStore.upsertTransaction({
          id: crypto.randomUUID(),
          hash,
          network: selectedNetwork,
          status: "pending",
          label: "Payby access registry",
          detail: `Registering ${item.title} listing and metadata commitment`,
          owner: item.owner,
          blobNames: [item.blobName],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await waitForTransaction(selectedNetwork, hash);
        transactionStore.updateTransaction(hash, {
          status: "confirmed",
          detail: `${item.title} listing and metadata commitment are registered on-chain.`,
        });
      } catch (error) {
        const message = userFacingError(
          error,
          "Access registry transaction needs attention.",
        );
        setPublishPhase("error");
        setRegistryRetryItems(registryItems);
        pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
          status: "failed",
          error: message,
        });
        if (registryHash) {
          transactionStore.updateTransaction(registryHash, {
            status: "failed",
            detail: message,
          });
        }
        setStatusMessage(message);
        addActivity({
          type: "metadata",
          label: "Access registry needs attention",
          detail: item.blobName,
          blobNames: [item.blobName],
        });
        return;
      }
    }

    setPublishPhase("success");
    setFiles([]);
    setRegistryRetryItems([]);
    localStorage.removeItem(REPUBLISH_DRAFT_KEY);
    setRepublishDraft(null);
    pendingPublishStore.updatePublishes(activePublishRef.current.pendingIds, {
      status: "indexing",
      error: "",
    });
    setStatusMessage("Publish complete. Shelby storage and the Aptos access registry are both finalized.");
    addActivity({
      type: "metadata",
      label: "Registered on-chain listings",
      detail: registryItems.map((item) => item.blobName).join(", "),
      blobNames: registryItems.map((item) => item.blobName),
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
    const chainError = await getLiveWalletChainError();
    if (chainError) {
      setPublishPhase("error");
      setStatusMessage(chainError);
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

    const chainError = await getLiveWalletChainError();
    if (chainError) {
      setPublishPhase("error");
      setStatusMessage(chainError);
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
        const response = await signAndSubmitTransaction(
          normalizeEntryFunctionTransaction(args[0]) as typeof args[0],
        );
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
            owner: accountAddress,
            blobNames: mediaItems.map((item) => item.blobName),
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
          "Wallet rejected the request or did not submit the transaction.",
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
      // Accounts without a stored Shelby placement preference must receive a
      // resolvable location hint in register_multiple_blobs.
      options: {
        locationHint: PAYBY_NETWORKS[selectedNetwork].locationHint,
      },
      maxConcurrentUploads: 3,
    });
  }

  return (
    <section className="workspace-layout publish-layout" id="publish">
      <div className="panel publish-panel">
        <PageHeader
          eyebrow={`Publish to ${PAYBY_NETWORKS[selectedNetwork].label}`}
          title="Publish media"
          description="Store media on Shelby, then publish its access policy and listing on Aptos."
          icon={<UploadCloud size={24} />}
        />

        {republishDraft ? (
          <div className="library-source-banner renewal-draft-banner">
            <Clock size={18} />
            <div>
              <strong>Renew media retention</strong>
              <p>
                Payby carried over the access policy from {republishDraft.sourceBlobName}.
                Select the replacement file to renew storage and register the
                updated listing on-chain.
              </p>
            </div>
            <button
              className="button button-secondary compact-button"
              type="button"
              onClick={() => {
                localStorage.removeItem(REPUBLISH_DRAFT_KEY);
                setRepublishDraft(null);
                setStatusMessage("");
              }}
            >
              Clear renewal
              <X size={15} />
            </button>
          </div>
        ) : null}

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

        <div className="form-section-heading">
          <span>01</span>
          <div>
            <strong>Media details</strong>
            <p>Name and describe what buyers will receive.</p>
          </div>
        </div>
        <div className="metadata-form">
          <FormField label="Title">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled media uses the file name"
            />
          </FormField>
          <FormField label="Category">
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Premium media"
            />
          </FormField>
          <FormField className="form-wide" label="Description">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What buyers or members should know about this media."
            />
          </FormField>
          <FormField label="Tags">
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="video, course, archive"
            />
          </FormField>
          <FormField label="Cover URL">
            <input
              value={coverUrl}
              onChange={(event) => setCoverUrl(event.target.value)}
              placeholder="https://..."
            />
          </FormField>
        </div>

        <div className="form-section-heading">
          <span>02</span>
          <div>
            <strong>Access and price</strong>
            <p>Choose who can open the media and how access is recorded.</p>
          </div>
        </div>
        <div className="access-grid">
          <FormField label="Visibility">
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as VisibilityMode)}
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private metadata</option>
            </select>
          </FormField>
          <FormField label="Access policy">
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
          </FormField>
          <FormField label="Price">
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Currency">
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as "APT" | "SHELBYUSD")}
            >
              <option value="APT">APT</option>
              <option value="SHELBYUSD">ShelbyUSD</option>
            </select>
          </FormField>
          {accessMode === "paid" ? (
            <div className="payment-asset-card form-wide">
              <CreditCard size={18} />
              <div>
                <span>{currency} payment asset</span>
                <code>{selectedPaymentAsset || "Setup needed"}</code>
              </div>
              <strong>
                {price ? formatAssetUnits(parseAssetUnits(price), currency) : `0 ${currency}`}
              </strong>
            </div>
          ) : null}
          <FormField className="form-wide" label="Allowlist wallets or NFT collection">
            <textarea
              value={allowlist}
              onChange={(event) => setAllowlist(event.target.value)}
              placeholder="Wallet addresses, collection id, or access notes. Payby records wallet allowlists on-chain."
            />
          </FormField>
        </div>

        <div className="form-section-heading">
          <span>03</span>
          <div>
            <strong>Retention and files</strong>
            <p>Review storage duration and the final upload payload.</p>
          </div>
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
            transactionExplorerUrl={transactionExplorerUrl}
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
          className={`button button-primary publish-button ${
            uploadBlobs.isPending ||
            publishPhase === "wallet" ||
            publishPhase === "confirming" ||
            publishPhase === "storing" ||
            publishPhase === "registry"
              ? "is-busy"
              : ""
          }`}
          type="button"
          disabled={registryRetryItems.length > 0 ? false : !canUpload}
          onClick={registryRetryItems.length > 0 ? handleRetryRegistry : handleUpload}
        >
          {uploadBlobs.isPending ||
          publishPhase === "wallet" ||
          publishPhase === "confirming" ||
          publishPhase === "storing" ||
          publishPhase === "registry" ? (
            <Loader2 className="button-spinner" size={18} />
          ) : (
            <PlugZap size={18} />
          )}
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
        <dl className="publish-context-list">
          <div>
            <dt>Storage route</dt>
            <dd>{PAYBY_NETWORKS[selectedNetwork].label}</dd>
          </div>
          <div>
            <dt>Access record</dt>
            <dd>
              {accessMode === "free"
                ? "Direct Shelby"
                : accessRegistryReady
                  ? "Aptos registry"
                  : "Setup needed"}
            </dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>{accessMode === "paid" ? currency : "No payment"}</dd>
          </div>
        </dl>
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
          ? "Still waiting on network finality. The transaction link remains available once a hash is returned."
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
  transactionExplorerUrl,
  transactionHash,
}: {
  phase: PublishPhase;
  selectedNetwork: PaybyNetwork;
  transactionExplorerUrl: (network: PaybyNetwork, hash: string) => string;
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
                : "Ready"}
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
