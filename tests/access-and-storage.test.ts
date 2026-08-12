import test from "node:test";
import assert from "node:assert/strict";
import { AccountAddress, Network } from "@aptos-labs/ts-sdk";
import {
  ShelbyBlobClient,
  ShelbyClient,
} from "@shelby-protocol/sdk/browser";
import { PAYBY_NETWORKS } from "../src/config/networks";
import {
  buildOwnerListingTransactionData,
  buildOwnerMetadataTransactionData,
  buildOwnerRegistryTransactionPlan,
  getPaymentAssetAddress,
  getAccessRegistryBlocker,
  paymentAssetMatches,
  metadataFromChainListing,
  paymentCurrencyForAddress,
  policyIdToAccessMode,
} from "../src/services/payby/marketplace";
import { assertSuccessfulTransactionSimulation } from "../src/services/aptos/fullnode";
import { getCreatorProfileStorageKey } from "../src/hooks/useCreatorProfile";
import {
  encodeBlobPath,
  getShelbyUri,
  resolveShelbyUri,
  shelbyBlobExplorerUrl,
} from "../src/services/shelby/storage";

test("maps on-chain policy ids to supported access modes", () => {
  assert.equal(policyIdToAccessMode(0), "free");
  assert.equal(policyIdToAccessMode(1), "allowlist");
  assert.equal(policyIdToAccessMode(2), "paid");
  assert.equal(policyIdToAccessMode(3), "nft");
  assert.equal(policyIdToAccessMode(4), "subscription");
  assert.equal(policyIdToAccessMode(99), "free");
});

test("recovers a usable media record from a chain listing", () => {
  const metadata = metadataFromChainListing("shelbynet", "course/lesson.mp4", {
    found: true,
    owner: "0xABC",
    title: "Lesson one",
    policy: 2,
    price: "1.5",
    paymentMetadata: "0xapt",
    metadataUri: "shelby://shelbynet/0xABC/course/lesson.json",
    metadataHash: "0xhash",
    active: true,
  });

  assert.equal(metadata.key, "0xabc::course/lesson.mp4");
  assert.equal(metadata.accessMode, "paid");
  assert.equal(metadata.price, "1.5");
  assert.deepEqual(metadata.tags, ["on-chain"]);
  assert.equal(metadata.currency, "APT");
});

test("keeps ShelbyUSD listings on the ShelbyUSD asset and never falls back to APT", () => {
  const shelbyUsd = getPaymentAssetAddress("shelbynet", "SHELBYUSD");
  const apt = getPaymentAssetAddress("shelbynet", "APT");
  assert.ok(shelbyUsd);
  assert.notEqual(shelbyUsd, apt);
  assert.equal(
    paymentCurrencyForAddress("shelbynet", shelbyUsd),
    "SHELBYUSD",
  );
  assert.equal(
    paymentAssetMatches("shelbynet", `0x${shelbyUsd.slice(2).padStart(64, "0")}`, "SHELBYUSD"),
    true,
  );
});

test("scopes creator profile drafts by wallet and network", () => {
  const walletA = "0xABCDEF";
  const walletB = "0x123456";
  assert.equal(
    getCreatorProfileStorageKey(walletA, "shelbynet"),
    "payby-creator-profile-v1:shelbynet:0xabcdef",
  );
  assert.notEqual(
    getCreatorProfileStorageKey(walletA, "shelbynet"),
    getCreatorProfileStorageKey(walletB, "shelbynet"),
  );
  assert.notEqual(
    getCreatorProfileStorageKey(walletA, "shelbynet"),
    getCreatorProfileStorageKey(walletA, "shelby-testnet"),
  );
});

test("blocks access policies that the current contract cannot enforce", () => {
  assert.match(
    getAccessRegistryBlocker("shelbynet", "nft"),
    /verifier contract/i,
  );
  assert.match(
    getAccessRegistryBlocker("shelbynet", "subscription"),
    /verifier contract/i,
  );
});

test("encodes Shelby paths without destroying blob folder boundaries", () => {
  assert.equal(
    encodeBlobPath("folder/lesson one #1.mp4"),
    "folder/lesson%20one%20%231.mp4",
  );
  assert.equal(
    getShelbyUri("shelbynet", "0xabc", "folder/lesson one.mp4"),
    "shelby://shelbynet/0xabc/folder/lesson%20one.mp4",
  );
});

test("resolves Shelby URIs and generates network-aware explorer links", () => {
  const uri = "shelby://shelby-testnet/0xabc/folder/lesson%20one.mp4";
  assert.equal(
    resolveShelbyUri(uri),
    `${PAYBY_NETWORKS["shelby-testnet"].shelbyRpcUrl}/v1/blobs/0xabc/folder/lesson%20one.mp4`,
  );
  assert.match(
    shelbyBlobExplorerUrl("shelby-testnet", "0xabc", "folder/lesson one.mp4"),
    /^https:\/\/explorer\.shelby\.xyz\/testnet\/blobs\?owner=0xabc&blobName=folder%2Flesson\+one\.mp4$/,
  );
  assert.equal(resolveShelbyUri("https://example.com/blob"), "https://example.com/blob");
  assert.equal(resolveShelbyUri("shelby://unknown/0xabc/file"), "");
});

test("includes the live Shelbynet location hint in blob registration payloads", () => {
  const client = new ShelbyClient({
    network: Network.SHELBYNET,
    locationHint: PAYBY_NETWORKS.shelbynet.locationHint,
  });
  const payload = ShelbyBlobClient.createBatchRegisterBlobsPayload({
    deployer: client.coordination.deployer,
    account: AccountAddress.fromString("0x1"),
    locationHint: client.coordination.defaultOptions.locationHint,
    expirationMicros: Date.now() * 1000 + 86_400_000_000,
    blobs: [
      {
        blobName: "proof.bin",
        blobSize: 1,
        blobMerkleRoot: `0x${"00".repeat(32)}`,
        numChunksets: 1,
      },
    ],
    encoding: 0,
  });

  assert.equal(payload.functionArguments[2], "shelbynet-1");
});

const registryMedia = {
  blobName: "creator/media.mov",
  title: "Creator media",
  accessMode: "allowlist" as const,
  price: "0",
  currency: "APT" as const,
  allowlist: "0x1, 0x2\n0x3",
  metadataUri: "  shelby://shelbynet/0xabc/creator/media.json  ",
  metadataHash: "  abc123  ",
};

test("builds separate owner listing and metadata registry payloads", () => {
  const plan = buildOwnerRegistryTransactionPlan("shelbynet", registryMedia);

  assert.match(plan.listing.function, /::upsert_listing_for_owner$/);
  assert.deepEqual(plan.listing.typeArguments, []);
  assert.equal(plan.listing.functionArguments?.length, 6);
  assert.deepEqual(plan.listing.functionArguments?.[5], ["0x1", "0x2", "0x3"]);

  assert.match(
    plan.metadata.function,
    /::upsert_listing_metadata_for_owner$/,
  );
  assert.deepEqual(plan.metadata.typeArguments, []);
  assert.deepEqual(plan.metadata.functionArguments, [
    "creator/media.mov",
    "shelby://shelbynet/0xabc/creator/media.json",
    "abc123",
  ]);
});

test("rejects incomplete metadata before a registry transaction plan is used", () => {
  assert.throws(
    () =>
      buildOwnerRegistryTransactionPlan("shelbynet", {
        ...registryMedia,
        metadataHash: "",
      }),
    /metadata commitment is missing/i,
  );
});

test("keeps listing-only policy updates independent from metadata", () => {
  const data = buildOwnerListingTransactionData("shelbynet", {
    ...registryMedia,
    metadataUri: undefined,
    metadataHash: undefined,
  });
  assert.match(data.function, /::upsert_listing_for_owner$/);
  assert.equal(data.functionArguments?.length, 6);

  assert.throws(
    () =>
      buildOwnerMetadataTransactionData("shelbynet", {
        ...registryMedia,
        metadataUri: undefined,
      }),
    /metadata commitment is missing/i,
  );
});

test("fails closed when Aptos preflight simulation rejects a payload", () => {
  assert.doesNotThrow(() =>
    assertSuccessfulTransactionSimulation({ success: true }),
  );
  assert.throws(
    () =>
      assertSuccessfulTransactionSimulation({
        success: false,
        vm_status: "Move abort in payby_marketplace",
      }),
    /Move abort in payby_marketplace/,
  );
});
