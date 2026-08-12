import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  FileArchive,
  Search,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { type PaybyNetwork } from "../../config/networks";
import type {
  ChainListing,
  CreatorProfile,
  CreatorSalesSummary,
  KnownCreator,
  MediaMetadata,
} from "../../domain/models";
import { EmptyState } from "../../components/EmptyState";
import { Button } from "../../components/workspace/Button";
import type { AppRoute } from "../../app/router";
import { readCreatorChainListings, readCreatorProfile, readCreatorSalesSummary, metadataFromChainListing } from "../../services/payby/marketplace";
import { readLocalJson, writeLocalJson } from "../../services/storage/local";
import {
  accessModeLabel,
  createMediaKey,
  shortenAddress,
} from "../../utils/formatters";
import { PageHeader } from "../../components/workspace/PageHeader";

const DISCOVERY_CREATOR_KEY = "payby-discovery-creator-v1";
const KNOWN_CREATORS_KEY = "payby-known-creators-v1";

export function DiscoverPage({
  selectedNetwork,
  metadata,
  onNavigate,
  resolveCommittedMetadata,
}: {
  selectedNetwork: PaybyNetwork;
  metadata: Record<string, MediaMetadata>;
  onNavigate: (route: AppRoute) => void;
  resolveCommittedMetadata: (
    selectedNetwork: PaybyNetwork,
    owner: string,
    blobName: string,
    listing: ChainListing,
  ) => Promise<MediaMetadata | null>;
}) {
  const [creatorAddress, setCreatorAddress] = React.useState(() =>
    localStorage.getItem(DISCOVERY_CREATOR_KEY) || "",
  );
  const [submittedCreator, setSubmittedCreator] = React.useState(() =>
    localStorage.getItem(DISCOVERY_CREATOR_KEY) || "",
  );
  const [profile, setProfile] = React.useState<CreatorProfile | null>(null);
  const [items, setItems] = React.useState<MediaMetadata[]>([]);
  const [salesSummary, setSalesSummary] = React.useState<CreatorSalesSummary>({
    saleCount: 0,
    revenue: "0",
  });
  const [loadState, setLoadState] = React.useState<
    "idle" | "checking" | "ready" | "empty" | "error"
  >(submittedCreator ? "checking" : "idle");
  const [message, setMessage] = React.useState("");
  const [knownCreators, setKnownCreators] = React.useState<KnownCreator[]>(() =>
    readLocalJson<KnownCreator[]>(KNOWN_CREATORS_KEY, []),
  );

  const normalizedCreator = submittedCreator.trim();
  const knownForNetwork = React.useMemo(
    () => knownCreators.filter((item) => item.network === selectedNetwork),
    [knownCreators, selectedNetwork],
  );

  React.useEffect(() => {
    if (!normalizedCreator) {
      setLoadState("idle");
      return;
    }

    let cancelled = false;
    setLoadState("checking");
    setMessage("");

    void Promise.all([
      readCreatorProfile(selectedNetwork, normalizedCreator).catch(() => null),
      readCreatorChainListings(selectedNetwork, normalizedCreator).catch(() => []),
      readCreatorSalesSummary(selectedNetwork, normalizedCreator).catch(() => null),
    ])
      .then(async ([chainProfile, listings, sales]) => {
        if (cancelled) return;
        setProfile(chainProfile);
        setSalesSummary(sales ?? { saleCount: 0, revenue: "0" });

        const recovered = (
          await Promise.all(
            listings
              .filter(({ listing }) => listing.active)
              .map(async ({ blobName, listing }) => {
                const cached = metadata[createMediaKey(normalizedCreator, blobName)];
                const nextMetadata =
                  cached ??
                  (await resolveCommittedMetadata(
                    selectedNetwork,
                    normalizedCreator,
                    blobName,
                    listing,
                  ).catch(() => null)) ??
                  metadataFromChainListing(selectedNetwork, blobName, listing);
                return nextMetadata.visibility === "private" ? null : nextMetadata;
              }),
          )
        ).filter((item): item is MediaMetadata => Boolean(item));

        setItems(recovered);
        const creatorRecord: KnownCreator = {
          owner: normalizedCreator,
          network: selectedNetwork,
          displayName: chainProfile?.displayName || shortenAddress(normalizedCreator),
          handle: chainProfile?.handle || shortenAddress(normalizedCreator),
          avatarUrl: chainProfile?.avatarUrl || "",
          mediaCount: recovered.length,
          savedAt: Date.now(),
        };
        setKnownCreators((current) => {
          const next = [
            creatorRecord,
            ...current.filter(
              (item) =>
                !(
                  item.owner.toLowerCase() === normalizedCreator.toLowerCase() &&
                  item.network === selectedNetwork
                ),
            ),
          ].slice(0, 18);
          writeLocalJson(KNOWN_CREATORS_KEY, next);
          return next;
        });
        setLoadState(recovered.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [metadata, normalizedCreator, resolveCommittedMetadata, selectedNetwork]);

  function openCreator() {
    const nextCreator = creatorAddress.trim();
    if (!nextCreator || !nextCreator.startsWith("0x")) {
      setMessage("Enter a valid Aptos creator address beginning with 0x.");
      return;
    }
    localStorage.setItem(DISCOVERY_CREATOR_KEY, nextCreator);
    setSubmittedCreator(nextCreator);
  }

  return (
    <section className="workspace-layout discover-layout">
      <div className="panel discover-panel">
        <PageHeader
          eyebrow="Buyer discovery"
          title="Discover creators"
          description="Find a creator by Aptos address and browse media available on this route."
          icon={<Search size={24} />}
        />

        <div className="creator-search-card">
          <label className="search-box">
            <Search size={17} />
            <input
              value={creatorAddress}
              onChange={(event) => setCreatorAddress(event.target.value)}
              placeholder="Paste creator wallet address"
              onKeyDown={(event) => {
                if (event.key === "Enter") openCreator();
              }}
            />
          </label>
          <Button variant="primary" onClick={openCreator}>
            Explore creator
            <ArrowRight size={17} />
          </Button>
        </div>

        {message ? <p className="inline-status">{message}</p> : null}

        <section className="discovery-feed" aria-label="Discovery feed">
          <div className="transaction-history-head">
            <span>Discovery feed</span>
            <strong>{knownForNetwork.length ? "Recent creators" : "Start browsing"}</strong>
          </div>
          {knownForNetwork.length > 0 ? (
            <div className="discovery-feed-grid">
              {knownForNetwork.map((creator) => (
                <article key={`${creator.network}-${creator.owner}`} className="creator-feed-card">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatorAddress(creator.owner);
                      setSubmittedCreator(creator.owner);
                      localStorage.setItem(DISCOVERY_CREATOR_KEY, creator.owner);
                    }}
                  >
                    <span className="avatar-preview">
                      {creator.avatarUrl ? <img src={creator.avatarUrl} alt="" /> : <User size={20} />}
                    </span>
                    <span>
                      <strong>{creator.displayName}</strong>
                      <small>@{creator.handle}</small>
                    </span>
                    <em>{creator.mediaCount} media</em>
                  </button>
                  <button
                    className="button button-secondary compact-button"
                    type="button"
                    onClick={() => onNavigate({ name: "creator", owner: creator.owner })}
                  >
                    Public page
                    <ExternalLink size={15} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="discovery-empty-card">
              <Sparkles size={20} />
              <div>
                <strong>Open a creator to start your feed</strong>
                <p>Recently opened creators stay here for quick access on this network.</p>
              </div>
            </div>
          )}
        </section>

        {normalizedCreator ? (
          <div className="library-source-banner">
            <ShieldCheck size={18} />
            <div>
              <strong>{profile?.displayName || shortenAddress(normalizedCreator)}</strong>
              <p>
                {profile?.bio ||
                  "Payby is reading this creator's owner-scoped listings from Aptos. Purchases happen from your connected wallet on each media page."}
              </p>
            </div>
            <div className="discovery-creator-actions">
              <span>
                <strong>{salesSummary.saleCount}</strong>
                on-chain sales
              </span>
              <button
                className="button button-secondary compact-button"
                type="button"
                onClick={() => onNavigate({ name: "creator", owner: normalizedCreator })}
              >
                Public page
                <ExternalLink size={15} />
              </button>
            </div>
          </div>
        ) : null}

        {loadState === "idle" ? (
          <EmptyState
            icon={<Search size={20} />}
            title="Find a creator"
            body="Paste a creator wallet address to browse their public Payby media without switching away from your buyer wallet."
          />
        ) : loadState === "checking" ? (
          <EmptyState
            title="Reading creator registry"
            body="Payby is loading public listings, profile, and sales proof from the marketplace contract."
          />
        ) : loadState === "error" ? (
          <EmptyState
            icon={<AlertTriangle size={20} />}
            title="Creator lookup needs refresh"
            body="Payby could not read this creator registry from the active route. Check the address, then refresh."
          />
        ) : loadState === "empty" ? (
          <EmptyState
            icon={<FileArchive size={20} />}
            title="No public media"
            body="This creator has no active public or unlisted Payby listings on the selected route."
          />
        ) : (
          <ul className="creator-discovery-list">
            {items.map((item) => (
              <li key={createMediaKey(item.owner, item.blobName)}>
                <div className="blob-icon">
                  <FileArchive size={18} />
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description || "Shelby media with Aptos access proof."}</p>
                  <span>
                    {accessModeLabel(item.accessMode)}
                    {item.accessMode === "paid" && item.price
                      ? ` - ${item.price} ${item.currency}`
                      : ` - ${item.visibility}`}
                  </span>
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
      </div>
    </section>
  );
}
