import * as React from "react";
import { AlertTriangle, ArrowRight, User } from "lucide-react";
import { type PaybyNetwork } from "../../config/networks";
import type { ChainListing, CreatorProfile, CreatorSalesSummary, MediaMetadata } from "../../domain/models";
import type { useStoredMetadata } from "../../hooks/useStoredMetadata";
import {
  metadataFromChainListing,
  readCreatorChainListings,
  readCreatorProfile,
  readCreatorSalesSummary,
} from "../../services/payby/marketplace";
import { accessModeLabel, createMediaKey, formatAssetUnits, shortenAddress } from "../../utils/formatters";
import { EmptyState } from "../../components/EmptyState";
import { PaybyLogo } from "../../components/PaybyLogo";
import type { AppRoute } from "../../app/router";
export function CreatorPage({
  route,
  selectedNetwork,
  metadataStore,
  fallbackProfile,
  onOpenApp,
  onNavigate,
  walletControl,
  resolveCommittedMetadata,
}: {
  route: AppRoute;
  selectedNetwork: PaybyNetwork;
  metadataStore: ReturnType<typeof useStoredMetadata>;
  fallbackProfile: CreatorProfile;
  onOpenApp: () => void;
  onNavigate: (route: AppRoute) => void;
  walletControl: React.ReactNode;
  resolveCommittedMetadata: (
    selectedNetwork: PaybyNetwork,
    owner: string,
    blobName: string,
    listing: ChainListing,
  ) => Promise<MediaMetadata | null>;
}) {
  const owner = route.owner ?? "";
  const [profile, setProfile] = React.useState<CreatorProfile>({
    displayName: fallbackProfile.displayName || "Payby Creator",
    handle: fallbackProfile.handle || "payby",
    bio: fallbackProfile.bio || "Creator media published through Shelby and Aptos.",
    avatarUrl: fallbackProfile.avatarUrl || "",
    website: fallbackProfile.website || "",
  });
  const [items, setItems] = React.useState<MediaMetadata[]>([]);
  const [loadState, setLoadState] = React.useState<
    "checking" | "ready" | "empty" | "error"
  >("checking");
  const [creatorSales, setCreatorSales] = React.useState<CreatorSalesSummary>({
    saleCount: 0,
    revenue: "0",
  });
  const storedMetadata = metadataStore.metadata;

  React.useEffect(() => {
    if (!owner) {
      setLoadState("empty");
      return;
    }

    let cancelled = false;
    setLoadState("checking");
    void Promise.all([
      readCreatorProfile(selectedNetwork, owner).catch(() => null),
      readCreatorChainListings(selectedNetwork, owner).catch(() => []),
      readCreatorSalesSummary(selectedNetwork, owner).catch(() => null),
    ])
      .then(async ([chainProfile, listings, sales]) => {
        if (cancelled) return;
        if (chainProfile) setProfile(chainProfile);
        if (sales) setCreatorSales(sales);

        const recovered = (
          await Promise.all(
            listings
              .filter(({ listing }) => listing.active)
              .map(async ({ blobName, listing }) => {
                const cached =
                  storedMetadata[createMediaKey(owner, blobName)];
                const metadata =
                  cached ??
                  (await resolveCommittedMetadata(
                    selectedNetwork,
                    owner,
                    blobName,
                    listing,
                  ).catch(() => null)) ??
                  metadataFromChainListing(selectedNetwork, blobName, listing);
                return metadata.visibility === "private" ? null : metadata;
              }),
          )
        ).filter((item): item is MediaMetadata => Boolean(item));

        setItems(recovered);
        setLoadState(recovered.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [owner, selectedNetwork, storedMetadata]);

  return (
    <main className="public-page creator-public-page">
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

      <section className="public-creator-shell">
        <div className="panel public-creator-hero">
          <div className="avatar-preview">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <User size={34} />}
          </div>
          <div>
            <p className="muted">Payby creator</p>
            <h1>{profile.displayName || shortenAddress(owner)}</h1>
            <span>@{profile.handle || shortenAddress(owner)}</span>
            <p>{profile.bio || "Creator media published through Shelby and Aptos."}</p>
          </div>
          <div className="public-creator-stats">
            <div>
              <span>Media</span>
              <strong>{items.length}</strong>
            </div>
            <div>
              <span>Sales</span>
              <strong>{creatorSales.saleCount}</strong>
            </div>
            <div>
              <span>Revenue</span>
              <strong>{formatAssetUnits(creatorSales.revenue)}</strong>
            </div>
          </div>
        </div>

        {loadState === "checking" ? (
        <EmptyState title="Loading creator vault" body="Reading creator listings from the Payby marketplace registry." />
      ) : loadState === "error" ? (
          <EmptyState icon={<AlertTriangle size={20} />} title="Creator vault needs refresh" body="The active fullnode did not return this creator registry. Refresh the route and reopen this creator." />
        ) : items.length === 0 ? (
          <EmptyState title="No public media" body="This creator has no public or unlisted Payby media on the active route." />
        ) : (
          <ul className="public-creator-grid">
            {items.map((item) => (
              <li key={createMediaKey(item.owner, item.blobName)}>
                <div>
                  <span>{item.category}</span>
                  <strong>{item.title}</strong>
                  <p>{item.description || "Shelby media with Aptos access proof."}</p>
                </div>
                <div className="public-creator-card-meta">
                  <span>{accessModeLabel(item.accessMode)}</span>
                  <span>{item.accessMode === "paid" ? `${item.price} ${item.currency}` : item.visibility}</span>
                </div>
                <button
                  className="button button-primary compact-button"
                  type="button"
                  onClick={() =>
                    onNavigate({
                      name: "share",
                      owner: item.owner,
                      blobName: item.blobName,
                    })
                  }
                >
                  Open media
                  <ArrowRight size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
