import * as React from "react";
import type { PaybyNetwork } from "../config/networks";
import type { TransactionItem } from "../domain/models";
import {
  applyLiveTransactionState,
  clearWalletActivity,
  commitTransactionHistory,
  readTransactionHistory,
  scopeTransactionHistory,
  verifyTransactionHistory,
} from "../services/payby/transaction-history";

export function useTransactionHistory(
  accountAddress: string,
  selectedNetwork: PaybyNetwork,
) {
  const [transactions, setTransactions] = React.useState<TransactionItem[]>(
    () => readTransactionHistory(),
  );
  const transactionsRef = React.useRef(transactions);
  const validationRunRef = React.useRef(0);
  const [isValidating, setIsValidating] = React.useState(false);

  React.useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  const walletTransactions = React.useMemo(
    () => scopeTransactionHistory(transactions, accountAddress, selectedNetwork),
    [accountAddress, selectedNetwork, transactions],
  );

  const commit = React.useCallback(
    (next: TransactionItem[]) => commitTransactionHistory(next),
    [],
  );

  const upsertTransaction = React.useCallback(
    (item: Omit<TransactionItem, "wallet"> & { wallet?: string }) => {
      if (!accountAddress) return;
      setTransactions((current) => {
        const index = current.findIndex((candidate) => candidate.hash === item.hash);
        const scopedItem = {
          ...item,
          wallet: item.wallet || accountAddress,
          verification: item.verification ?? "checking",
        };
        const next = [...current];
        if (index >= 0) {
          next[index] = { ...next[index], ...scopedItem, updatedAt: Date.now() };
        } else {
          next.unshift(scopedItem);
        }
        return commit(next);
      });
    },
    [accountAddress, commit],
  );

  const updateTransaction = React.useCallback(
    (hash: string, patch: Partial<TransactionItem>) => {
      if (!hash) return;
      setTransactions((current) =>
        commit(
          current.map((item) =>
            item.hash === hash
              ? { ...item, ...patch, updatedAt: Date.now() }
              : item,
          ),
        ),
      );
    },
    [commit],
  );

  const refreshTransactions = React.useCallback(async () => {
    const validationRun = ++validationRunRef.current;
    const scopedTransactions = scopeTransactionHistory(
      transactionsRef.current,
      accountAddress,
      selectedNetwork,
    );

    if (!accountAddress || scopedTransactions.length === 0) {
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    const resultByHash = await verifyTransactionHistory(
      scopedTransactions,
      selectedNetwork,
    );

    if (validationRun !== validationRunRef.current) {
      setIsValidating(false);
      return;
    }

    const missingTransactions = scopedTransactions.filter(
      (item) => resultByHash.get(item.hash) === "missing",
    );
    if (missingTransactions.length > 0) {
      if (clearWalletActivity(accountAddress, selectedNetwork)) {
        window.dispatchEvent(
          new CustomEvent("payby-network-reset", {
            detail: { wallet: accountAddress, network: selectedNetwork },
          }),
        );
      }
    }

    setTransactions((current) =>
      commit(
        applyLiveTransactionState(
          current,
          accountAddress,
          selectedNetwork,
          resultByHash,
        ),
      ),
    );
    setIsValidating(false);
  }, [accountAddress, commit, selectedNetwork]);

  React.useEffect(() => {
    void refreshTransactions();
  }, [refreshTransactions]);

  return {
    transactions: walletTransactions,
    upsertTransaction,
    updateTransaction,
    refreshTransactions,
    isValidating,
  };
}
