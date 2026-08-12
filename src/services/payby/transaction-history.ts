import type { PaybyNetwork } from "../../config/networks";
import type { ActivityItem, TransactionItem } from "../../domain/models";
import {
  mapWithConcurrency,
  readLiveTransaction,
  type LiveTransactionState,
} from "../aptos/fullnode";

export const TRANSACTION_HISTORY_KEY = "payby-transaction-history-v1";
export const ACTIVITY_HISTORY_KEY = "payby-activity-v1";

function isWalletScoped(
  item: { wallet?: string; network?: PaybyNetwork },
  accountAddress: string,
  selectedNetwork: PaybyNetwork,
) {
  return (
    Boolean(accountAddress) &&
    item.wallet?.toLowerCase() === accountAddress.toLowerCase() &&
    item.network === selectedNetwork
  );
}

export function readTransactionHistory(storage: Storage = localStorage) {
  try {
    const raw = storage.getItem(TRANSACTION_HISTORY_KEY);
    const items = raw ? (JSON.parse(raw) as TransactionItem[]) : [];
    return items.map((item) => ({
      ...item,
      verification: item.verification ?? "checking",
    }));
  } catch {
    return [] as TransactionItem[];
  }
}

export function commitTransactionHistory(
  next: TransactionItem[],
  storage: Storage = localStorage,
) {
  const trimmed = next
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 80);
  storage.setItem(TRANSACTION_HISTORY_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function scopeTransactionHistory(
  items: TransactionItem[],
  accountAddress: string,
  selectedNetwork: PaybyNetwork,
) {
  return items.filter((item) =>
    isWalletScoped(item, accountAddress, selectedNetwork),
  );
}

export async function verifyTransactionHistory(
  items: TransactionItem[],
  selectedNetwork: PaybyNetwork,
) {
  const liveResults = await mapWithConcurrency(
    items,
    4,
    async (item) => [
      item.hash,
      await readLiveTransaction(selectedNetwork, item.hash),
    ] as const,
  );
  return new Map<string, LiveTransactionState>(liveResults);
}

export function clearWalletActivity(
  accountAddress: string,
  selectedNetwork: PaybyNetwork,
  storage: Storage = localStorage,
) {
  try {
    const raw = storage.getItem(ACTIVITY_HISTORY_KEY);
    const current = raw ? (JSON.parse(raw) as ActivityItem[]) : [];
    const next = current.filter(
      (item) => !isWalletScoped(item, accountAddress, selectedNetwork),
    );
    if (next.length !== current.length) {
      storage.setItem(ACTIVITY_HISTORY_KEY, JSON.stringify(next));
    }
    return next.length !== current.length;
  } catch {
    return false;
  }
}

export function applyLiveTransactionState(
  items: TransactionItem[],
  accountAddress: string,
  selectedNetwork: PaybyNetwork,
  resultByHash: Map<string, LiveTransactionState>,
) {
  return items.flatMap((item) => {
    if (!isWalletScoped(item, accountAddress, selectedNetwork)) return [item];

    const result = resultByHash.get(item.hash);
    if (result === "missing") return [];
    if (result === "confirmed" || result === "failed") {
      return [{ ...item, status: result, verification: "live" as const }];
    }
    if (result === "pending") {
      return [{ ...item, status: "pending" as const, verification: "live" as const }];
    }
    return [{ ...item, verification: "unavailable" as const }];
  });
}
