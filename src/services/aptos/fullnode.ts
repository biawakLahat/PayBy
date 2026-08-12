import {
  Aptos,
  AptosConfig,
  type AccountAuthenticator,
  type AnyRawTransaction,
  type InputEntryFunctionData,
} from "@aptos-labs/ts-sdk";
import { PAYBY_NETWORKS, type PaybyNetwork } from "../../config/networks";

export type LiveTransactionState =
  | "confirmed"
  | "pending"
  | "failed"
  | "missing"
  | "unavailable";

type TransactionResponse = {
  type?: string;
  success?: boolean;
  vm_status?: string;
};

export function fullnodeRequestHeaders(selectedNetwork: PaybyNetwork) {
  const apiKey = PAYBY_NETWORKS[selectedNetwork].aptosApiKey;
  return apiKey ? { authorization: `Bearer ${apiKey}` } : undefined;
}

type WalletSignTransaction = (args: {
  transactionOrPayload: AnyRawTransaction;
}) => Promise<{
  authenticator: AccountAuthenticator;
  rawTransaction: Uint8Array;
}>;

/**
 * Builds the transaction against the selected Aptos fullnode, asks the wallet
 * to sign it, then submits the returned authenticator. Petra may still run its
 * own simulation before approval; a dapp cannot bypass that wallet check.
 */
export async function signAndSubmitEntryFunction({
  selectedNetwork,
  sender,
  data,
  signTransaction,
}: {
  selectedNetwork: PaybyNetwork;
  sender: string;
  data: InputEntryFunctionData;
  signTransaction: WalletSignTransaction;
}) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  const aptos = new Aptos(
    new AptosConfig({
      network: network.walletNetwork,
      fullnode: network.fullnodeUrl,
      fullnodeConfig: network.aptosApiKey
        ? {
            HEADERS: {
              Authorization: `Bearer ${network.aptosApiKey}`,
            },
          }
        : undefined,
    }),
  );
  const transaction = await aptos.transaction.build.simple({
    sender,
    data,
  });
  const signed = await signTransaction({ transactionOrPayload: transaction });
  const submitted = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator: signed.authenticator,
  });
  return submitted.hash;
}

type LedgerInfo = {
  chain_id?: number | string;
};

/** Reads the chain ID from the exact fullnode configured for the active route. */
export async function readLiveChainId(selectedNetwork: PaybyNetwork) {
  const network = PAYBY_NETWORKS[selectedNetwork];
  const baseUrl = network.fullnodeUrl.replace(/\/$/, "");
  const response = await fetch(baseUrl, {
    headers: fullnodeRequestHeaders(selectedNetwork),
  });

  if (!response.ok) {
    throw new Error(
      `The ${network.label} fullnode returned HTTP ${response.status} while checking its chain ID.`,
    );
  }

  const data = (await response.json()) as LedgerInfo;
  const chainId = Number(data.chain_id);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error(`The ${network.label} fullnode did not return a valid chain ID.`);
  }

  return chainId;
}

export async function readLiveTransaction(
  selectedNetwork: PaybyNetwork,
  hash: string,
): Promise<LiveTransactionState> {
  if (!hash) return "unavailable";

  const baseUrl = PAYBY_NETWORKS[selectedNetwork].fullnodeUrl.replace(/\/$/, "");
  try {
    const response = await fetch(
      `${baseUrl}/transactions/by_hash/${encodeURIComponent(hash)}`,
      { headers: fullnodeRequestHeaders(selectedNetwork) },
    );

    if (response.status === 404 || response.status === 410) return "missing";
    if (!response.ok) return "unavailable";

    const data = (await response.json()) as TransactionResponse;
    if (data.type === "pending_transaction") return "pending";
    return data.success === false ? "failed" : "confirmed";
  } catch {
    return "unavailable";
  }
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await mapper(item);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, worker),
  );
  return results;
}

export async function waitForTransaction(
  selectedNetwork: PaybyNetwork,
  hash: string,
) {
  if (!hash) return;

  const baseUrl = PAYBY_NETWORKS[selectedNetwork].fullnodeUrl.replace(/\/$/, "");
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const response = await fetch(
      `${baseUrl}/transactions/by_hash/${encodeURIComponent(hash)}`,
      { headers: fullnodeRequestHeaders(selectedNetwork) },
    );

    if (response.ok) {
      const data = (await response.json()) as TransactionResponse;

      if (data.type !== "pending_transaction") {
        if (data.success === false) {
          throw new Error(data.vm_status || "Transaction failed on-chain.");
        }
        return;
      }
    }

    await new Promise((resolve) => window.setTimeout(resolve, 2_000));
  }

  throw new Error("Transaction confirmation timed out. Check Aptos Explorer.");
}
