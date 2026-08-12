import test from "node:test";
import assert from "node:assert/strict";
import type { ActivityItem, TransactionItem } from "../src/domain/models";
import {
  ACTIVITY_HISTORY_KEY,
  applyLiveTransactionState,
  clearWalletActivity,
  commitTransactionHistory,
  readTransactionHistory,
  scopeTransactionHistory,
} from "../src/services/payby/transaction-history";
import { readLiveTransaction } from "../src/services/aptos/fullnode";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

function transaction(
  id: string,
  wallet = "0xA",
  network: TransactionItem["network"] = "shelbynet",
): TransactionItem {
  return {
    id,
    hash: `0x${id}`,
    network,
    wallet,
    status: "confirmed",
    label: id,
    detail: id,
    createdAt: Number(id),
    updatedAt: Number(id),
  };
}

function activity(
  id: string,
  wallet: string,
  network: ActivityItem["network"],
): ActivityItem {
  return {
    id,
    at: Number(id),
    wallet,
    network,
    type: "metadata",
    label: id,
    detail: id,
  };
}

test("scopes transaction history by wallet and network", () => {
  const items = [
    transaction("1", "0xA", "shelbynet"),
    transaction("2", "0xB", "shelbynet"),
    transaction("3", "0xA", "shelby-testnet"),
  ];

  assert.deepEqual(
    scopeTransactionHistory(items, "0xa", "shelbynet").map((item) => item.id),
    ["1"],
  );
  assert.deepEqual(
    scopeTransactionHistory(items, "0xb", "shelbynet").map((item) => item.id),
    ["2"],
  );
});

test("reads malformed cache safely and marks old records as checking", () => {
  const storage = new MemoryStorage();
  storage.setItem("payby-transaction-history-v1", "not-json");
  assert.deepEqual(readTransactionHistory(storage as unknown as Storage), []);

  storage.setItem(
    "payby-transaction-history-v1",
    JSON.stringify([transaction("1")]),
  );
  assert.equal(
    readTransactionHistory(storage as unknown as Storage)[0]?.verification,
    "checking",
  );
});

test("commits transaction history in newest-first order with a bounded cache", () => {
  const storage = new MemoryStorage();
  const items = Array.from({ length: 85 }, (_, index) =>
    transaction(String(index), "0xA"),
  );
  const committed = commitTransactionHistory(
    items,
    storage as unknown as Storage,
  );

  assert.equal(committed.length, 80);
  assert.equal(committed[0]?.id, "84");
  assert.equal(committed.at(-1)?.id, "5");
});

test("clears only the wallet and network affected by a definitive wipe", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    ACTIVITY_HISTORY_KEY,
    JSON.stringify([
      activity("1", "0xA", "shelbynet"),
      activity("2", "0xB", "shelbynet"),
      activity("3", "0xA", "shelby-testnet"),
    ]),
  );

  assert.equal(clearWalletActivity("0xa", "shelbynet", storage as unknown as Storage), true);
  assert.deepEqual(
    JSON.parse(storage.getItem(ACTIVITY_HISTORY_KEY) ?? "[]").map(
      (item: ActivityItem) => item.id,
    ),
    ["2", "3"],
  );
});

test("applies all live transaction lifecycle states without touching another wallet", () => {
  const items = [
    transaction("pending", "0xA"),
    transaction("confirmed", "0xA"),
    transaction("failed", "0xA"),
    transaction("missing", "0xA"),
    transaction("unavailable", "0xA"),
    transaction("other", "0xB"),
  ];
  const states = new Map([
    ["0xpending", "pending"],
    ["0xconfirmed", "confirmed"],
    ["0xfailed", "failed"],
    ["0xmissing", "missing"],
    ["0xunavailable", "unavailable"],
  ] as const);

  const next = applyLiveTransactionState(items, "0xA", "shelbynet", states);
  assert.deepEqual(
    next.map((item) => `${item.id}:${item.status}:${item.verification}`),
    [
      "pending:pending:live",
      "confirmed:confirmed:live",
      "failed:failed:live",
      "unavailable:confirmed:unavailable",
      "other:confirmed:undefined",
    ],
  );
});

test("maps fullnode responses to current transaction states", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("pending")) {
        return { ok: true, status: 200, json: async () => ({ type: "pending_transaction" }) } as Response;
      }
      if (url.includes("failed")) {
        return { ok: true, status: 200, json: async () => ({ success: false }) } as Response;
      }
      if (url.includes("missing")) return { ok: false, status: 404 } as Response;
      if (url.includes("gone")) return { ok: false, status: 410 } as Response;
      if (url.includes("rate-limited")) return { ok: false, status: 429 } as Response;
      if (url.includes("offline")) throw new Error("offline");
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    };

    assert.equal(await readLiveTransaction("shelbynet", "pending"), "pending");
    assert.equal(await readLiveTransaction("shelbynet", "confirmed"), "confirmed");
    assert.equal(await readLiveTransaction("shelbynet", "failed"), "failed");
    assert.equal(await readLiveTransaction("shelbynet", "missing"), "missing");
    assert.equal(await readLiveTransaction("shelbynet", "gone"), "missing");
    assert.equal(await readLiveTransaction("shelbynet", "rate-limited"), "unavailable");
    assert.equal(await readLiveTransaction("shelbynet", "offline"), "unavailable");
    assert.equal(await readLiveTransaction("shelbynet", ""), "unavailable");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
