import { PAYBY_NETWORKS, type PaybyNetwork } from "../../config/networks";
import type {
  AccessMode,
  ChainListing,
  ChainPurchaseRecord,
  CreatorProfile,
  CreatorSalesSummary,
  ListingSalesSummary,
  MediaMetadata,
  MoveFunctionId,
} from "../../domain/models";

const ACCESS_POLICY_IDS: Record<AccessMode, number> = {
  free: 0,
  allowlist: 1,
  paid: 2,
  nft: 3,
  subscription: 4,
};

const CHAIN_SUPPORTED_ACCESS_MODES = new Set<AccessMode>([
  "free",
  "allowlist",
  "paid",
]);

type MarketplaceFunctionName =
  | "upsert_listing"
  | "purchase"
  | "purchase_from"
  | "can_access"
  | "can_access_for_owner"
  | "get_listing"
  | "get_listing_for_owner"
  | "get_listing_metadata"
  | "get_listing_metadata_for_owner"
  | "get_listing_count"
  | "get_listing_count_for_owner"
  | "get_listing_key"
  | "get_listing_key_for_owner"
  | "get_purchases"
  | "get_purchases_from_owner"
  | "get_purchase_record_count"
  | "get_purchase_record"
  | "get_sales_summary"
  | "get_listing_sales_summary"
  | "get_creator_profile"
  | "get_creator_profile_v2"
  | "upsert_creator_profile"
  | "upsert_creator_profile_v2"
  | "upsert_listing_metadata"
  | "upsert_listing_metadata_for_owner"
  | "upsert_listing_with_metadata"
  | "upsert_listing_for_owner_with_metadata";

export function marketplaceFunction(
  selectedNetwork: PaybyNetwork,
  functionName: MarketplaceFunctionName,
): MoveFunctionId | "" {
  const address = PAYBY_NETWORKS[selectedNetwork].marketplaceContractAddress;
  return address
    ? (`${address}::payby_marketplace::${functionName}` as MoveFunctionId)
    : "";
}

export function policyIdToAccessMode(policy: number): AccessMode {
  if (policy === ACCESS_POLICY_IDS.allowlist) return "allowlist";
  if (policy === ACCESS_POLICY_IDS.paid) return "paid";
  if (policy === ACCESS_POLICY_IDS.nft) return "nft";
  if (policy === ACCESS_POLICY_IDS.subscription) return "subscription";
  return "free";
}

export async function callMarketplaceView(
  selectedNetwork: PaybyNetwork,
  functionId: MoveFunctionId,
  args: unknown[],
) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  const fullnode = network.fullnodeUrl.replace(/\/$/, "");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (network.aptosApiKey) headers.authorization = `Bearer ${network.aptosApiKey}`;

  const response = await fetch(`${fullnode}/view`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      function: functionId,
      type_arguments: [],
      arguments: args,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not read marketplace state from Aptos.");
  }

  return (await response.json()) as unknown[];
}

function parseChainListing(data: unknown[]): ChainListing {
  const [owner, title, policy, price, paymentMetadata, active] = data;
  const ownerString = owner?.toString() ?? "";
  const found =
    Boolean(ownerString) &&
    ownerString !== "0x0" &&
    !/^0x0+$/.test(ownerString);

  return {
    found,
    owner: ownerString,
    title: title?.toString() ?? "",
    policy: Number(policy ?? 0),
    price: price?.toString() ?? "0",
    paymentMetadata: paymentMetadata?.toString() ?? "",
    metadataUri: "",
    metadataHash: "",
    active: Boolean(active),
  };
}

type ListingMetadataCommitment = {
  metadataUri: string;
  metadataHash: string;
};

async function readChainListingMetadata(
  selectedNetwork: PaybyNetwork,
  owner: string,
  blobName: string,
): Promise<ListingMetadataCommitment | null> {
  const ownerFunctionId = marketplaceFunction(
    selectedNetwork,
    "get_listing_metadata_for_owner",
  );
  const legacyFunctionId = marketplaceFunction(selectedNetwork, "get_listing_metadata");
  if (!ownerFunctionId && !legacyFunctionId) return null;

  let data: unknown[];
  try {
    if (!ownerFunctionId || !owner) {
      throw new Error("Marketplace metadata view is not available on this route.");
    }
    data = await callMarketplaceView(selectedNetwork, ownerFunctionId, [owner, blobName]);
    const [ownerMetadataUri, ownerMetadataHash, ownerFound] = data;
    if (ownerFound || !legacyFunctionId) {
      if (!ownerFound) return null;
      return {
        metadataUri: ownerMetadataUri?.toString() ?? "",
        metadataHash: ownerMetadataHash?.toString() ?? "",
      };
    }
  } catch {
    if (!legacyFunctionId) return null;
  }

  data = await callMarketplaceView(selectedNetwork, legacyFunctionId, [blobName]);
  const [metadataUri, metadataHash, found] = data;
  if (!found) return null;
  return {
    metadataUri: metadataUri?.toString() ?? "",
    metadataHash: metadataHash?.toString() ?? "",
  };
}

export async function readChainListing(
  selectedNetwork: PaybyNetwork,
  owner: string,
  blobName: string,
): Promise<ChainListing | null> {
  const ownerFunctionId = marketplaceFunction(selectedNetwork, "get_listing_for_owner");
  const legacyFunctionId = marketplaceFunction(selectedNetwork, "get_listing");
  if (!ownerFunctionId && !legacyFunctionId) return null;

  let data: unknown[];
  try {
    if (!ownerFunctionId || !owner) {
      throw new Error("Marketplace listing view is not available on this route.");
    }
    data = await callMarketplaceView(selectedNetwork, ownerFunctionId, [owner, blobName]);
    const ownerListing = parseChainListing(data);
    if (ownerListing.found || !legacyFunctionId) {
      if (!ownerListing.found) return ownerListing;
      try {
        const metadata = await readChainListingMetadata(selectedNetwork, owner, blobName);
        if (metadata) {
          ownerListing.metadataUri = metadata.metadataUri;
          ownerListing.metadataHash = metadata.metadataHash;
        }
      } catch {
        // Older deployments may not expose metadata commitment views yet.
      }
      return ownerListing;
    }
  } catch {
    if (!legacyFunctionId) return null;
  }

  data = await callMarketplaceView(selectedNetwork, legacyFunctionId, [blobName]);
  const listing = parseChainListing(data);
  if (!listing.found) return listing;

  try {
    const metadata = await readChainListingMetadata(selectedNetwork, owner, blobName);
    if (metadata) {
      listing.metadataUri = metadata.metadataUri;
      listing.metadataHash = metadata.metadataHash;
    }
  } catch {
    // Older deployments may not expose metadata commitment views yet.
  }

  return listing;
}

export async function readChainAccess(
  selectedNetwork: PaybyNetwork,
  owner: string,
  user: string,
  blobName: string,
): Promise<boolean | null> {
  const ownerFunctionId = marketplaceFunction(selectedNetwork, "can_access_for_owner");
  const legacyFunctionId = marketplaceFunction(selectedNetwork, "can_access");
  if (!ownerFunctionId && !legacyFunctionId) return null;

  let data: unknown[];
  try {
    if (!ownerFunctionId || !owner) {
      throw new Error("Marketplace access view is not available on this route.");
    }
    data = await callMarketplaceView(selectedNetwork, ownerFunctionId, [
      owner,
      user,
      blobName,
    ]);
    const ownerAllowed = Boolean(data[0]);
    if (ownerAllowed || !legacyFunctionId) return ownerAllowed;
  } catch {
    if (!legacyFunctionId) return null;
  }

  data = await callMarketplaceView(selectedNetwork, legacyFunctionId, [user, blobName]);
  return Boolean(data[0]);
}

export async function readChainPurchases(
  selectedNetwork: PaybyNetwork,
  buyer: string,
  owner: string,
): Promise<string[] | null> {
  const ownerFunctionId = marketplaceFunction(selectedNetwork, "get_purchases_from_owner");
  const legacyFunctionId = marketplaceFunction(selectedNetwork, "get_purchases");
  if (!ownerFunctionId && !legacyFunctionId) return null;

  let data: unknown[];
  try {
    if (!ownerFunctionId || !owner) {
      throw new Error("Marketplace purchase index is not available on this route.");
    }
    data = await callMarketplaceView(selectedNetwork, ownerFunctionId, [buyer, owner]);
    const ownerPurchases = Array.isArray(data[0]) ? data[0] : data;
    if (ownerPurchases.length > 0 || !legacyFunctionId) {
      return ownerPurchases.map((item) => item?.toString() ?? "").filter(Boolean);
    }
  } catch {
    if (!legacyFunctionId) return null;
  }

  data = await callMarketplaceView(selectedNetwork, legacyFunctionId, [buyer]);
  const purchases = Array.isArray(data[0]) ? data[0] : data;
  return purchases.map((item) => item?.toString() ?? "").filter(Boolean);
}

export async function readChainPurchaseRecordCount(
  selectedNetwork: PaybyNetwork,
  buyer: string,
) {
  const functionId = marketplaceFunction(selectedNetwork, "get_purchase_record_count");
  if (!functionId || !buyer) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [buyer]);
  return Number(data[0] ?? 0);
}

export async function readChainPurchaseRecord(
  selectedNetwork: PaybyNetwork,
  buyer: string,
  index: number,
): Promise<ChainPurchaseRecord | null> {
  const functionId = marketplaceFunction(selectedNetwork, "get_purchase_record");
  if (!functionId || !buyer) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [buyer, String(index)]);
  const [owner, blobName, price, paymentMetadata, purchasedAtSecs, found] = data;
  return {
    owner: owner?.toString() ?? "",
    blobName: blobName?.toString() ?? "",
    price: price?.toString() ?? "0",
    paymentMetadata: paymentMetadata?.toString() ?? "",
    purchasedAtSecs: Number(purchasedAtSecs ?? 0),
    found: Boolean(found),
  };
}

export async function readBuyerPurchaseRecords(
  selectedNetwork: PaybyNetwork,
  buyer: string,
  limit = 120,
) {
  const count = await readChainPurchaseRecordCount(selectedNetwork, buyer).catch(
    () => null,
  );
  if (!count) return null;

  const records: ChainPurchaseRecord[] = [];
  const capped = Math.min(count, limit);
  for (let index = 0; index < capped; index += 1) {
    const record = await readChainPurchaseRecord(selectedNetwork, buyer, index).catch(
      () => null,
    );
    if (record?.found && record.owner && record.blobName) records.push(record);
  }
  return records;
}

export async function readCreatorSalesSummary(
  selectedNetwork: PaybyNetwork,
  owner: string,
): Promise<CreatorSalesSummary | null> {
  const functionId = marketplaceFunction(selectedNetwork, "get_sales_summary");
  if (!functionId || !owner) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [owner]);
  return {
    saleCount: Number(data[0] ?? 0),
    revenue: data[1]?.toString() ?? "0",
  };
}

export async function readListingSalesSummary(
  selectedNetwork: PaybyNetwork,
  owner: string,
  blobName: string,
): Promise<ListingSalesSummary | null> {
  const functionId = marketplaceFunction(selectedNetwork, "get_listing_sales_summary");
  if (!functionId || !owner || !blobName) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [owner, blobName]);
  return {
    saleCount: Number(data[0] ?? 0),
    revenue: data[1]?.toString() ?? "0",
  };
}

export async function readCreatorProfile(
  selectedNetwork: PaybyNetwork,
  owner: string,
): Promise<CreatorProfile | null> {
  const v2FunctionId = marketplaceFunction(selectedNetwork, "get_creator_profile_v2");
  if (v2FunctionId && owner) {
    try {
      const data = await callMarketplaceView(selectedNetwork, v2FunctionId, [owner]);
      const [
        displayName,
        handle,
        bio,
        avatarUrl,
        website,
        xHandle,
        xVerified,
        updatedAtSecs,
        found,
      ] = data;
      if (found) {
        return {
          displayName: displayName?.toString() || "Payby Creator",
          handle: handle?.toString() || "payby",
          bio: bio?.toString() || "Premium media publishing on Shelby and Aptos.",
          avatarUrl: avatarUrl?.toString() || "",
          website: website?.toString() || "",
          xHandle: xHandle?.toString() || "",
          xVerified: Boolean(xVerified),
          updatedAt: Number(updatedAtSecs ?? 0) * 1000,
        };
      }
    } catch {
      // Older deployments may only expose the first profile registry.
    }
  }

  const functionId = marketplaceFunction(selectedNetwork, "get_creator_profile");
  if (!functionId || !owner) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [owner]);
  const [displayName, handle, bio, avatarUrl, website, updatedAtSecs, found] = data;
  if (!found) return null;
  return {
    displayName: displayName?.toString() || "Payby Creator",
    handle: handle?.toString() || "payby",
    bio: bio?.toString() || "Premium media publishing on Shelby and Aptos.",
    avatarUrl: avatarUrl?.toString() || "",
    website: website?.toString() || "",
    updatedAt: Number(updatedAtSecs ?? 0) * 1000,
  };
}

export async function readChainListingCount(selectedNetwork: PaybyNetwork) {
  const functionId = marketplaceFunction(selectedNetwork, "get_listing_count");
  if (!functionId) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, []);
  return Number(data[0] ?? 0);
}

export async function readChainListingKey(
  selectedNetwork: PaybyNetwork,
  index: number,
) {
  const functionId = marketplaceFunction(selectedNetwork, "get_listing_key");
  if (!functionId) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [String(index)]);
  return data[0]?.toString() || "";
}

export async function readOwnerChainListingCount(
  selectedNetwork: PaybyNetwork,
  owner: string,
) {
  const functionId = marketplaceFunction(selectedNetwork, "get_listing_count_for_owner");
  if (!functionId || !owner) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [owner]);
  return Number(data[0] ?? 0);
}

export async function readOwnerChainListingKey(
  selectedNetwork: PaybyNetwork,
  owner: string,
  index: number,
) {
  const functionId = marketplaceFunction(selectedNetwork, "get_listing_key_for_owner");
  if (!functionId || !owner) return null;

  const data = await callMarketplaceView(selectedNetwork, functionId, [owner, String(index)]);
  return data[0]?.toString() || "";
}

export async function readCreatorChainListings(
  selectedNetwork: PaybyNetwork,
  owner: string,
  limit = 120,
) {
  const ownerCount = await readOwnerChainListingCount(selectedNetwork, owner).catch(
    () => null,
  );
  const count =
    ownerCount && ownerCount > 0
      ? ownerCount
      : await readChainListingCount(selectedNetwork);
  if (count === null) return [];

  const capped = Math.min(count, limit);
  const listings: Array<{ blobName: string; listing: ChainListing }> = [];
  for (let index = 0; index < capped; index += 1) {
    const blobName =
      !ownerCount || ownerCount <= 0
        ? await readChainListingKey(selectedNetwork, index)
        : await readOwnerChainListingKey(selectedNetwork, owner, index);
    if (!blobName) continue;
    const listing = await readChainListing(selectedNetwork, owner, blobName);
    if (listing?.found && listing.owner.toLowerCase() === owner.toLowerCase()) {
      listings.push({ blobName, listing });
    }
  }
  return listings;
}

function createMediaKey(owner: string, blobName: string) {
  return `${owner.toLowerCase()}::${blobName}`;
}

export function metadataFromChainListing(
  selectedNetwork: PaybyNetwork,
  blobName: string,
  listing: ChainListing,
): MediaMetadata {
  const accessMode = policyIdToAccessMode(listing.policy);
  return {
    key: createMediaKey(listing.owner, blobName),
    owner: listing.owner,
    blobName,
    metadataUri: listing.metadataUri,
    metadataHash: listing.metadataHash,
    network: selectedNetwork,
    title: listing.title || blobName,
    description: "Recovered from the Payby marketplace registry.",
    category: "On-chain media",
    tags: ["on-chain"],
    coverUrl: "",
    visibility: "unlisted",
    accessMode,
    price: listing.price === "0" ? "" : listing.price,
    currency: "APT",
    allowlist: "",
    createdAt: Date.now(),
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

export function getAccessRegistryBlocker(
  selectedNetwork: PaybyNetwork,
  accessMode: AccessMode,
  price = "",
  currency: "APT" | "SHELBYUSD" = "APT",
) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  if (!CHAIN_SUPPORTED_ACCESS_MODES.has(accessMode)) {
    return "NFT and subscription gates need a verifier contract before they can be published safely.";
  }
  if (!network.marketplaceContractAddress) {
    return "Set the Payby marketplace contract address before publishing Web3-native media.";
  }
  if (accessMode === "paid" && !getPaymentAssetAddress(selectedNetwork, currency)) {
    return `Set the ${currency} payment asset metadata address before publishing paid unlocks.`;
  }
  if (accessMode === "paid" && parseAssetUnits(price) <= 0) {
    return "Set a paid unlock price greater than 0 before registering on-chain access.";
  }
  return "";
}
