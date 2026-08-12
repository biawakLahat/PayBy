import { ExternalLink, ReceiptText } from "lucide-react";
import { PAYBY_NETWORKS, type PaybyNetwork } from "../config/networks";
import type { PurchaseReceipt } from "../domain/models";
import { formatAssetUnits, shortenAddress } from "../utils/formatters";

export function PurchaseReceiptCard({
  receipt,
  transactionExplorerUrl,
}: {
  receipt: PurchaseReceipt;
  transactionExplorerUrl: (network: PaybyNetwork, hash: string) => string;
}) {
  const hasTransaction = Boolean(receipt.hash);

  return (
    <section className="purchase-receipt" aria-label="Purchase receipt">
      <div className="purchase-receipt-head">
        <span>
          <ReceiptText size={16} />
          {receipt.accessType === "purchase" ? "Purchase receipt" : "Access receipt"}
        </span>
        <strong>{hasTransaction ? "Confirmed" : "Session"}</strong>
      </div>
      <div className="receipt-grid">
        <div>
          <span>Network</span>
          <strong>{PAYBY_NETWORKS[receipt.network].label}</strong>
        </div>
        <div>
          <span>Price</span>
          <strong>{formatAssetUnits(receipt.price || "0", receipt.currency)}</strong>
        </div>
        <div>
          <span>Buyer</span>
          <strong>{shortenAddress(receipt.buyer)}</strong>
        </div>
        <div>
          <span>Creator</span>
          <strong>{shortenAddress(receipt.creator)}</strong>
        </div>
      </div>
      {hasTransaction ? (
        <a
          className="transaction-link"
          href={transactionExplorerUrl(receipt.network, receipt.hash)}
          rel="noreferrer"
          target="_blank"
        >
          View purchase transaction
          <ExternalLink size={14} />
        </a>
      ) : (
        <p className="muted">Access was unlocked from the on-chain policy state.</p>
      )}
    </section>
  );
}
