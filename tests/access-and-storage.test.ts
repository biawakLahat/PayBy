import test from "node:test";
import assert from "node:assert/strict";
import { AccountAddress, Network } from "@aptos-labs/ts-sdk";
import {
  ShelbyBlobClient,
  ShelbyClient,
} from "@shelby-protocol/sdk/browser";
import { PAYBY_NETWORKS } from "../src/config/networks";
import {
  getAccessRegistryBlocker,
  metadataFromChainListing,
  policyIdToAccessMode,
} from "../src/services/payby/marketplace";
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
