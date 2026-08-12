import * as React from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  Clock,
  Database,
  ExternalLink,
  Filter,
  Loader2,
  ReceiptText,
  RefreshCw,
  Share2,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { PAYBY_NETWORKS, type PaybyNetwork } from "../../config/networks";
import type {
  ActivityItem,
  TransactionItem,
  TransactionStatus,
} from "../../domain/models";
import { EmptyState } from "../../components/EmptyState";
import { PaginationControls } from "../../components/PaginationControls";
import { Button } from "../../components/workspace/Button";
import { StatusPill } from "../../components/workspace/StatusPill";
import { shelbyBlobExplorerUrl } from "../../services/shelby/storage";
import { paginateItems } from "../../utils/formatters";
import type { AppRoute } from "../../app/router";
import { PageHeader } from "../../components/workspace/PageHeader";

const ACTIVITY_PAGE_SIZE = 8;

export function ActivityPage({
  activity,
  transactions,
  accountAddress,
  selectedNetwork,
  onNavigate,
  onRefreshTransactions,
  isRefreshingTransactions,
  getTransactionExplorerUrl,
}: {
  activity: ActivityItem[];
  transactions: TransactionItem[];
  accountAddress: string;
  selectedNetwork: PaybyNetwork;
  onNavigate: (route: AppRoute) => void;
  onRefreshTransactions: () => Promise<void>;
  isRefreshingTransactions: boolean;
  getTransactionExplorerUrl: (
    network: PaybyNetwork,
    transactionHash: string,
  ) => string;
}) {
  const [filter, setFilter] = React.useState<
    "all" | TransactionStatus | "local"
  >("all");
  const [transactionPage, setTransactionPage] = React.useState(1);
  const [localPage, setLocalPage] = React.useState(1);
  const confirmedCount = transactions.filter(
    (item) => item.status === "confirmed" && item.verification === "live",
  ).length;
  const pendingCount = transactions.filter((item) => item.status === "pending").length;
  const failedCount = transactions.filter((item) => item.status === "failed").length;
  const cachedCount = transactions.filter(
    (item) => item.verification === "unavailable",
  ).length;
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
    { value: "pending", label: "In progress" },
    { value: "failed", label: "Needs attention" },
    { value: "local", label: "Local events" },
  ];

  React.useEffect(() => {
    setTransactionPage(1);
    setLocalPage(1);
  }, [accountAddress, filter, selectedNetwork]);

  function getActivityBlobNames(item: ActivityItem) {
    if (item.blobNames?.length) return item.blobNames;
    if (!["upload", "metadata", "share", "delete"].includes(item.type)) return [];
    if (!item.detail || item.detail.startsWith("Stored on ")) return [];
    return item.detail
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith("0x") && /[./_-]/.test(part))
      .slice(0, 4);
  }

  function activityIcon(type: ActivityItem["type"]) {
    if (type === "upload") return <UploadCloud size={17} />;
    if (type === "delete") return <Trash2 size={17} />;
    if (type === "share") return <Share2 size={17} />;
    return <Database size={17} />;
  }

  return (
    <section className="panel activity-panel">
      <PageHeader
        eyebrow="Recent actions"
        title="Activity feed"
        description={<>Transactions and product actions for this wallet on {PAYBY_NETWORKS[selectedNetwork].label}.</>}
        icon={<Activity size={24} />}
      />

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
          <span>Attention</span>
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

      <div className="activity-sync-status" role="status" aria-live="polite">
        <div>
          {isRefreshingTransactions ? (
            <Loader2 className="button-spinner" size={16} />
          ) : (
            <ShieldCheck size={16} />
          )}
          <span>
            {isRefreshingTransactions
              ? `Checking transaction records against ${PAYBY_NETWORKS[selectedNetwork].label}...`
              : cachedCount > 0
                ? `${cachedCount} cached record${cachedCount === 1 ? "" : "s"} could not be verified. They are kept locally and are not presented as current chain proof.`
                : `Transaction history is checked against ${PAYBY_NETWORKS[selectedNetwork].label} when this view opens.`}
          </span>
        </div>
        <Button
          variant="secondary"
          disabled={isRefreshingTransactions || transactions.length === 0}
          onClick={() => void onRefreshTransactions()}
        >
          <RefreshCw size={15} />
          Refresh proof
        </Button>
      </div>

      {filteredTransactions.length > 0 ? (
        <section className="transaction-history" aria-label="Transaction history">
          <div className="transaction-history-head">
            <span>Transaction history</span>
            <strong>{filteredTransactions.length} shown</strong>
          </div>
          <ul>
            {paginatedTransactions.map((item) => (
              <li
                className={`is-${item.status} is-verification-${item.verification ?? "checking"}`}
                key={item.id}
              >
                <StatusPill
                  className="tx-status-pill"
                  tone={
                    item.status === "failed"
                      ? "danger"
                      : item.status === "confirmed"
                        ? "positive"
                        : item.status === "pending"
                          ? "warning"
                          : "neutral"
                  }
                  label={
                    item.verification === "checking"
                      ? "checking"
                      : item.verification === "unavailable"
                        ? "cached"
                        : item.status === "failed"
                          ? "needs attention"
                          : item.status === "pending"
                            ? "in progress"
                            : item.status
                  }
                />
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                  <time>{new Date(item.updatedAt).toLocaleString()}</time>
                </div>
                <div className="activity-row-actions">
                  {item.owner && item.blobNames?.[0] ? (
                    <a
                      className="transaction-link shelby-link"
                      href={shelbyBlobExplorerUrl(item.network, item.owner, item.blobNames[0])}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Shelby blob
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                  <a
                    className="transaction-link"
                    href={getTransactionExplorerUrl(item.network, item.hash)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Aptos tx
                    <ExternalLink size={14} />
                  </a>
                </div>
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
          icon={<Activity size={20} />}
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
            {paginatedActivity.map((item) => {
              const blobNames = getActivityBlobNames(item);
              return (
                <li key={item.id}>
                  <div className="activity-event-icon">{activityIcon(item.type)}</div>
                  <div className="activity-event-copy">
                    <span>{item.type}</span>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                    <time>{new Date(item.at).toLocaleString()}</time>
                  </div>
                  <div className="activity-row-actions">
                    {blobNames[0] ? (
                      <a
                        className="transaction-link shelby-link"
                        href={shelbyBlobExplorerUrl(selectedNetwork, accountAddress, blobNames[0])}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Shelby blob
                        <ExternalLink size={14} />
                      </a>
                    ) : null}
                    {blobNames.length > 1 ? <em>{blobNames.length} blobs</em> : null}
                  </div>
                </li>
              );
            })}
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
