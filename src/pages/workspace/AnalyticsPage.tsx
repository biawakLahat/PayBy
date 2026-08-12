import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Wallet,
} from "lucide-react";
import { type PaybyNetwork } from "../../config/networks";
import type {
  ChainListing,
  CreatorSalesSummary,
  ListingSalesSummary,
  MediaMetadata,
} from "../../domain/models";
import { EmptyState } from "../../components/EmptyState";
import type { useStoredMetadata } from "../../hooks/useStoredMetadata";
import {
  metadataFromChainListing,
  readCreatorChainListings,
  readCreatorSalesSummary,
  readListingSalesSummary,
} from "../../services/payby/marketplace";
import {
  accessModeLabel,
  createMediaKey,
  formatAssetUnits,
} from "../../utils/formatters";
import type { AppRoute } from "../../app/router";
import { PageHeader } from "../../components/workspace/PageHeader";

export function AnalyticsPage({
  accountAddress,
  selectedNetwork,
  metadata,
  onNavigate,
  resolveCommittedMetadata,
}: {
  accountAddress: string;
  selectedNetwork: PaybyNetwork;
  metadata: ReturnType<typeof useStoredMetadata>["metadata"];
  onNavigate: (route: AppRoute) => void;
  resolveCommittedMetadata: (
    selectedNetwork: PaybyNetwork,
    owner: string,
    blobName: string,
    listing: ChainListing,
  ) => Promise<MediaMetadata | null>;
}) {
  const [summary, setSummary] = React.useState<CreatorSalesSummary>({
    saleCount: 0,
    revenue: "0",
  });
  const [rows, setRows] = React.useState<
    Array<{ metadata: MediaMetadata; sales: ListingSalesSummary }>
  >([]);
  const [state, setState] = React.useState<"idle" | "loading" | "ready" | "error">(
    accountAddress ? "loading" : "idle",
  );

  React.useEffect(() => {
    if (!accountAddress) {
      setState("idle");
      return;
    }

    let cancelled = false;
    setState("loading");
    void Promise.all([
      readCreatorSalesSummary(selectedNetwork, accountAddress).catch(() => null),
      readCreatorChainListings(selectedNetwork, accountAddress).catch(() => []),
    ])
      .then(async ([salesSummary, listings]) => {
        if (cancelled) return;
        setSummary(salesSummary ?? { saleCount: 0, revenue: "0" });
        const nextRows = (
          await Promise.all(
            listings.map(async ({ blobName, listing }) => {
              const nextMetadata =
                metadata[createMediaKey(accountAddress, blobName)] ??
                (await resolveCommittedMetadata(
                  selectedNetwork,
                  accountAddress,
                  blobName,
                  listing,
                ).catch(() => null)) ??
                metadataFromChainListing(selectedNetwork, blobName, listing);
              const listingSales =
                (await readListingSalesSummary(
                  selectedNetwork,
                  accountAddress,
                  blobName,
                ).catch(() => null)) ?? { saleCount: 0, revenue: "0" };
              return { metadata: nextMetadata, sales: listingSales };
            }),
          )
        ).sort((a, b) => b.sales.saleCount - a.sales.saleCount);
        setRows(nextRows);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [accountAddress, metadata, resolveCommittedMetadata, selectedNetwork]);

  const paidRows = rows.filter((row) => row.metadata.accessMode === "paid");
  const activeMediaCount = rows.length;

  return (
    <section className="panel analytics-panel">
      <PageHeader
        eyebrow="Creator revenue"
        title="Analytics"
        description="Track paid unlocks and creator proceeds recorded by the Payby contract."
        icon={<CreditCard size={24} />}
      />

      <div className="analytics-overview">
        <div className="analytics-primary-metric">
          <span>Creator revenue</span>
          <strong>{formatAssetUnits(summary.revenue)}</strong>
          <small>Proceeds recorded for the connected wallet.</small>
        </div>
        <dl className="analytics-secondary-metrics">
          <div>
            <dt>Sales</dt>
            <dd>{summary.saleCount}</dd>
          </div>
          <div>
            <dt>Listed media</dt>
            <dd>{activeMediaCount}</dd>
          </div>
          <div>
            <dt>Paid media</dt>
            <dd>{paidRows.length}</dd>
          </div>
        </dl>
      </div>

      <div className="section-index">
        <span>Media performance</span>
        <strong>{rows.length} listings</strong>
      </div>

      {state === "idle" ? (
        <EmptyState
          icon={<Wallet size={20} />}
          title="Wallet required"
          body="Connect the creator wallet to load analytics."
        />
      ) : state === "loading" ? (
        <EmptyState title="Loading analytics" body="Reading listing sales and revenue from Aptos." />
      ) : state === "error" ? (
        <EmptyState
          icon={<AlertTriangle size={20} />}
          title="Analytics needs refresh"
          body="The active fullnode did not return creator sales data. Try again after finality."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No creator listings yet"
          body="Publish media to start building analytics."
          actionLabel="Publish media"
          onAction={() => onNavigate({ name: "publish" })}
        />
      ) : (
        <ul className="analytics-list">
          {rows.map(({ metadata: item, sales }) => (
            <li key={createMediaKey(item.owner, item.blobName)}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.category} - {accessModeLabel(item.accessMode)}</p>
              </div>
              <span>{sales.saleCount} sales</span>
              <span>{formatAssetUnits(sales.revenue, item.currency)}</span>
              <button
                className="button button-secondary compact-button"
                type="button"
                onClick={() =>
                  onNavigate({
                    name: "detail",
                    owner: item.owner,
                    blobName: item.blobName,
                  })
                }
              >
                Detail
                <ArrowRight size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
