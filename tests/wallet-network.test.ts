import test from "node:test";
import assert from "node:assert/strict";
import {
  getAccountAddress,
  getExpectedWalletNetworkName,
  getWalletChainId,
  getWalletNetworkName,
  isWalletNetworkAligned,
  normalizeEntryFunctionTransaction,
  requestWalletNetworkChange,
  walletNetworkChainMismatchMessage,
  walletNetworkMismatchMessage,
} from "../src/services/aptos/wallet";

test("extracts wallet addresses from adapter account shapes", () => {
  assert.equal(getAccountAddress({ address: "0xabc" }), "0xabc");
  assert.equal(
    getAccountAddress({ accountAddress: { toString: () => "0xdef" } }),
    "0xdef",
  );
  assert.equal(getAccountAddress(undefined), "");
});

test("normalizes non-generic entry functions for Petra wallet prompts", () => {
  const input = {
    data: {
      function: "0x1::example::entry",
      functionArguments: ["blob"],
    },
  };

  assert.deepEqual(normalizeEntryFunctionTransaction(input).data, {
    function: "0x1::example::entry",
    functionArguments: ["blob"],
    typeArguments: [],
  });
});

test("normalizes wallet network names and accepts Petra custom Shelbynet", () => {
  assert.equal(getWalletNetworkName({ name: "TESTNET" }), "testnet");
  assert.equal(getExpectedWalletNetworkName("shelby-testnet"), "testnet");
  assert.equal(isWalletNetworkAligned({ name: "testnet" }, "shelby-testnet"), true);
  assert.equal(isWalletNetworkAligned({ name: "custom" }, "shelbynet"), true);
  assert.equal(isWalletNetworkAligned({ name: "custom" }, "shelby-testnet"), false);
  assert.match(
    walletNetworkMismatchMessage({ name: "testnet" }, "shelbynet"),
    /switch wallet network to shelbynet/i,
  );
});

test("reads wallet chain IDs and explains a live chain mismatch", () => {
  assert.equal(getWalletChainId({ name: "shelbynet", chainId: 59 }), 59);
  assert.equal(getWalletChainId({ name: "custom", chain_id: "118" }), 118);
  assert.equal(getWalletChainId({ name: "shelbynet" }), null);
  assert.match(
    walletNetworkChainMismatchMessage(
      { name: "shelbynet", chainId: 59 },
      "shelbynet",
      118,
    ),
    /chain ID 59.*chain ID 118/i,
  );
});

test("requests a network change only when the wallet is misaligned", async () => {
  let calls = 0;
  let status = "";
  const changeNetwork = async () => {
    calls += 1;
  };

  const aligned = await requestWalletNetworkChange({
    changeNetwork,
    network: { name: "testnet" },
    selectedNetwork: "shelby-testnet",
    setStatusMessage: (message) => {
      status = message;
    },
  });
  assert.equal(aligned, true);
  assert.equal(calls, 0);
  assert.equal(status, "");

  const switched = await requestWalletNetworkChange({
    changeNetwork,
    network: { name: "testnet" },
    selectedNetwork: "shelbynet",
    setStatusMessage: (message) => {
      status = message;
    },
  });
  assert.equal(switched, false);
  assert.equal(calls, 1);
  assert.match(status, /switch requested/i);
});

test("surfaces a rejected network switch without throwing", async () => {
  let status = "";
  const result = await requestWalletNetworkChange({
    changeNetwork: async () => {
      throw new Error("User rejected the network switch.");
    },
    network: { name: "testnet" },
    selectedNetwork: "shelbynet",
    setStatusMessage: (message) => {
      status = message;
    },
  });

  assert.equal(result, false);
  assert.equal(status, "User rejected the network switch.");
});
