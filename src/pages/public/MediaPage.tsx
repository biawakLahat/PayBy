import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Database,
  Download,
  FileVideo,
  Lock,
  Share2,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { PaybyLogo } from "../../components/PaybyLogo";
import { LockedMediaPreview, MediaPreview } from "../../components/MediaPreview";
import { PurchaseReceiptCard } from "../../components/PurchaseReceiptCard";
import { PAYBY_NETWORKS, type PaybyNetwork } from "../../config/networks";
import type {
  ChainAccessProofState,
  ChainListing,
  CreatorProfile,
  MediaMetadata,
  PurchaseReceipt,
  UnlockState,
} from "../../domain/models";
import type { usePurchaseReceipts } from "../../hooks/usePurchaseReceipts";
import type { useStoredMetadata } from "../../hooks/useStoredMetadata";
import type { useTransactionHistory } from "../../hooks/useTransactionHistory";
import { getAccountAddress } from "../../services/aptos/wallet";
import { waitForTransaction } from "../../services/aptos/fullnode";
import {
  marketplaceFunction,
  getPaymentAssetAddress,
  paymentAssetMatches,
  paymentCurrencyForAddress,
  policyIdToAccessMode,
  readChainAccess,
  readChainListing,
  readCreatorProfile,
} from "../../services/payby/marketplace";
import { getDownloadUrl } from "../../services/shelby/storage";
import {
  accessModeLabel,
  createMediaKey,
  formatAssetUnits,
  shortenAddress,
} from "../../utils/formatters";
import type { AppRoute } from "../../app/router";

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
  if (
    lower.includes("e_payment_asset_required") ||
    lower.includes("payment_asset_required")
  ) {
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

function isRestrictedMedia(metadata?: MediaMetadata) {
  return Boolean(metadata?.accessMode && metadata.accessMode !== "free");
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

function accessModeDetail(mode?: MediaMetadata["accessMode"]) {
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

const DEFAULT_PUBLIC_PROFILE: CreatorProfile = {
  displayName: "Payby Creator",
  handle: "payby",
  bio: "Creator media published through Shelby and Aptos.",
  avatarUrl: "",
  website: "",
  xHandle: "",
  xVerified: false,
};

export function MediaPage({
  route,
  selectedNetwork,
  metadataStore,
  purchaseStore,
  transactionStore,
  profile,
  profileOwner,
  onOpenApp,
  walletControl,
  resolveCommittedMetadata,
  transactionExplorerUrl,
}: {
  route: AppRoute;
  selectedNetwork: PaybyNetwork;
  metadataStore: ReturnType<typeof useStoredMetadata>;
  purchaseStore: ReturnType<typeof usePurchaseReceipts>;
  transactionStore: ReturnType<typeof useTransactionHistory>;
  profile: CreatorProfile;
  profileOwner: string;
  onOpenApp: () => void;
  walletControl: React.ReactNode;
  resolveCommittedMetadata: (
    selectedNetwork: PaybyNetwork,
    owner: string,
    blobName: string,
    listing: ChainListing,
  ) => Promise<MediaMetadata | null>;
  transactionExplorerUrl: (network: PaybyNetwork, hash: string) => string;
}) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const owner = route.owner ?? "";
  const blobName = route.blobName ?? "";
  const isViewerProfile =
    Boolean(owner && profileOwner) &&
    owner.toLowerCase() === profileOwner.toLowerCase();
  const fallbackPublicProfile = isViewerProfile ? profile : DEFAULT_PUBLIC_PROFILE;
  const cachedMetadata = metadataStore.metadata[createMediaKey(owner, blobName)];
  const [committedMetadata, setCommittedMetadata] =
    React.useState<MediaMetadata | null>(null);
  const metadata = committedMetadata ?? cachedMetadata;
  const [publicProfile, setPublicProfile] =
    React.useState(fallbackPublicProfile);
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
  const chainCurrency = chainListing?.found
    ? paymentCurrencyForAddress(selectedNetwork, chainListing.paymentMetadata)
    : undefined;
  const effectiveCurrency = metadata?.currency ?? chainCurrency ?? "APT";
  const paymentAssetMismatch = Boolean(
    chainListing?.found &&
      !paymentAssetMatches(
        selectedNetwork,
        chainListing.paymentMetadata,
        effectiveCurrency,
      ),
  );
  const isLocked = effectiveAccessMode
    ? effectiveAccessMode !== "free"
    : isRestrictedMedia(metadata);
  const effectiveTitle =
    chainListing?.found && chainListing.title
      ? chainListing.title
      : metadata?.title || blobName;
  const effectivePrice =
    chainListing?.found && chainListing.price !== "0"
      ? formatAssetUnits(chainListing.price, effectiveCurrency)
      : metadata?.price
        ? `${metadata.price} ${effectiveCurrency}`
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
            ? "Registry setup needed"
            : "Refresh needed";
  const chainAccessLabel =
    chainAccessState === "checking"
      ? "Checking"
      : chainAccessState === "allowed"
        ? "Allowed"
        : chainAccessState === "denied"
          ? "Denied"
          : chainAccessState === "unconfigured"
            ? "Registry setup needed"
            : chainAccessState === "error"
              ? "Refresh needed"
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
    if (!owner || !marketplaceConfigured) {
      setPublicProfile(fallbackPublicProfile);
      return;
    }

    let cancelled = false;
    void readCreatorProfile(selectedNetwork, owner)
      .then((nextProfile) => {
        if (!cancelled) setPublicProfile(nextProfile ?? fallbackPublicProfile);
      })
      .catch(() => {
        if (!cancelled) setPublicProfile(fallbackPublicProfile);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackPublicProfile, marketplaceConfigured, owner, profileOwner, selectedNetwork]);

  React.useEffect(() => {
    if (!chainListing?.found || !chainListing.metadataUri || !chainListing.metadataHash) {
      setCommittedMetadata(null);
      return;
    }

    let cancelled = false;
    void resolveCommittedMetadata(selectedNetwork, owner, blobName, chainListing)
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

    if (paymentAssetMismatch) {
      throw new Error(
        `This listing's on-chain payment asset does not match its metadata. Re-publish the listing with ${effectiveCurrency} before purchasing.`,
      );
    }

    const expectedPaymentAsset = getPaymentAssetAddress(
      selectedNetwork,
      effectiveCurrency,
    );
    if (
      !expectedPaymentAsset ||
      !paymentAssetMatches(
        selectedNetwork,
        chainListing?.paymentMetadata ?? "",
        effectiveCurrency,
      )
    ) {
      throw new Error(
        `This listing is configured with a different payment asset. The creator must update the listing to use ${effectiveCurrency}.`,
      );
    }

    setUnlockMessage("Confirm the paid unlock transaction in your wallet.");
    const response = await signAndSubmitTransaction({
      data: {
        function: functionId,
        typeArguments: [],
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
            : "Paid unlock transaction needs attention.",
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
      currency: effectiveCurrency,
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
            throw new Error("Purchase confirmed, but Aptos access proof is still indexing. Wait a few seconds, then refresh access.");
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
          {walletControl}
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
              <strong>Shelby route</strong>
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
          {visibleReceipt ? <PurchaseReceiptCard receipt={visibleReceipt} transactionExplorerUrl={transactionExplorerUrl} /> : null}
        </div>

        <aside className="support-panel public-sidebar">
          <div className="avatar-preview">
            {publicProfile.avatarUrl ? <img src={publicProfile.avatarUrl} alt="" /> : <User size={34} />}
          </div>
          <strong>{publicProfile.displayName}</strong>
          <span>@{publicProfile.handle}</span>
          <p>{publicProfile.bio}</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              window.history.pushState({}, "", `/creator/${encodeURIComponent(owner)}`);
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          >
            <User size={17} />
            View creator vault
          </button>
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
