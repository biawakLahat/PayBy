import * as React from "react";
import type { PaybyNetwork } from "../config/networks";
import type { PurchaseReceipt } from "../domain/models";
import {
  readLocalJson,
  writeLocalJson,
} from "../services/storage/local";

export const PURCHASE_RECEIPTS_KEY = "payby-purchase-receipts-v1";

export function createReceiptKey(
  buyer: string,
  network: PaybyNetwork,
  creator: string,
  blobName: string,
) {
  return [
    buyer.toLowerCase(),
    network,
    creator.toLowerCase(),
    blobName.toLowerCase(),
  ].join("::");
}

export function usePurchaseReceipts() {
  const [receipts, setReceipts] = React.useState<PurchaseReceipt[]>(() =>
    readLocalJson<PurchaseReceipt[]>(PURCHASE_RECEIPTS_KEY, []),
  );

  const commit = React.useCallback((next: PurchaseReceipt[]) => {
    const deduped = new Map<string, PurchaseReceipt>();
    next.forEach((receipt) => {
      deduped.set(
        createReceiptKey(
          receipt.buyer,
          receipt.network,
          receipt.creator,
          receipt.blobName,
        ),
        receipt,
      );
    });
    const trimmed = Array.from(deduped.values())
      .sort((a, b) => b.confirmedAt - a.confirmedAt)
      .slice(0, 120);
    writeLocalJson(PURCHASE_RECEIPTS_KEY, trimmed);
    return trimmed;
  }, []);

  const upsertReceipt = React.useCallback(
    (receipt: PurchaseReceipt) => {
      setReceipts((current) => commit([receipt, ...current]));
    },
    [commit],
  );

  const getReceipt = React.useCallback(
    (
      buyer: string,
      network: PaybyNetwork,
      creator: string,
      blobName: string,
    ) => {
      if (!buyer || !creator || !blobName) return null;
      const key = createReceiptKey(buyer, network, creator, blobName);
      return (
        receipts.find(
          (receipt) =>
            createReceiptKey(
              receipt.buyer,
              receipt.network,
              receipt.creator,
              receipt.blobName,
            ) === key,
        ) ?? null
      );
    },
    [receipts],
  );

  return { receipts, upsertReceipt, getReceipt };
}
