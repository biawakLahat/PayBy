import * as React from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  FileArchive,
  ReceiptText,
  Share2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { type PaybyNetwork } from "../../config/networks";
import type {
  ChainAccessProofState,
  PurchaseReceipt,
} from "../../domain/models";
import { EmptyState } from "../../components/EmptyState";
import { PaginationControls } from "../../components/PaginationControls";
import type { AppRoute } from "../../app/router";
import { readChainAccess } from "../../services/payby/marketplace";
import { getShareUrl } from "../../services/shelby/storage";
import type { usePurchaseReceipts } from "../../hooks/usePurchaseReceipts";
import {
  accessModeLabel,
  createMediaKey,
  formatAssetUnits,
  paginateItems,
  shortenAddress,
} from "../../utils/formatters";
import { createReceiptKey } from "../../hooks/usePurchaseReceipts";
import { PageHeader } from "../../components/workspace/PageHeader";

const LIBRARY_PAGE_SIZE = 8;

export function LibraryPage({
  accountAddress,
  selectedNetwork,
  metadata,
  purchaseStore,
  onNavigate,
  loadPurchaseIndex,
  getTransactionExplorerUrl,
}: {
  accountAddress: string;
  selectedNetwork: PaybyNetwork;
  metadata: Record<string, { title: string }>;
  purchaseStore: ReturnType<typeof usePurchaseReceipts>;
  onNavigate: (route: AppRoute) => void;
  loadPurchaseIndex: (
    buyer: string,
    network: PaybyNetwork,
  ) => Promise<PurchaseReceipt[]>;
  getTransactionExplorerUrl: (
    network: PaybyNetwork,
    transactionHash: string,
  ) => string;
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
  } = paginateItems(receipts, libraryPage, LIBRARY_PAGE_SIZE);

  React.useEffect(() => {
    if (!accountAddress) {
      setIndexState("idle");
      return;
    }

    let cancelled = false;
    setIndexState("checking");
    void loadPurchaseIndex(accountAddress, selectedNetwork)
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
  }, [accountAddress, loadPurchaseIndex, selectedNetwork, upsertReceipt]);

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
    if (state === "error") return "Refresh proof";
    if (state === "unconfigured") return "Registry setup needed";
    return "Proof not checked";
  }

  return (
    <section className="panel buyer-library-panel">
      <PageHeader
        eyebrow="Buyer workspace"
        title="Buyer library"
        description="Review unlocked media and the access proof held by this buyer wallet."
        icon={<ReceiptText size={24} />}
      />

      <div className="library-overview" aria-label="Buyer library summary">
        <div className="library-primary-metric">
          <span>Unlocked media</span>
          <strong>{receipts.length}</strong>
          <small>Items available to this buyer wallet.</small>
        </div>
        <dl className="library-secondary-metrics">
          <div>
            <dt>Purchases</dt>
            <dd>{purchaseCount}</dd>
          </div>
          <div>
            <dt>Wallet sessions</dt>
            <dd>{sessionCount}</dd>
          </div>
          <div>
            <dt>Last unlock</dt>
            <dd>{lastReceipt ? new Date(lastReceipt.confirmedAt).toLocaleDateString() : "None"}</dd>
          </div>
        </dl>
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
          icon={<Wallet size={20} />}
          title="Wallet required"
          body="Connect the buyer wallet to load purchases and unlocked media."
        />
      ) : receipts.length === 0 ? (
        <EmptyState
          icon={<ReceiptText size={20} />}
          title="No buyer media yet"
          body="Unlock a shared Payby media link and it will appear here for this wallet."
        />
      ) : (
        <>
          <ul className="buyer-library-list">
            {paginatedReceipts.map((receipt) => {
              const itemMetadata = metadata[createMediaKey(receipt.creator, receipt.blobName)];
              const title = itemMetadata?.title || receipt.title || receipt.blobName;
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
                    onClick={() => void refreshReceiptProof(receipt)}
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
                      href={getTransactionExplorerUrl(receipt.network, receipt.hash)}
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
                    onClick={() => void copyShareLink(receipt)}
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
            pageSize={LIBRARY_PAGE_SIZE}
            onPageChange={setLibraryPage}
          />
        </>
      )}
    </section>
  );
}
