import { PAYBY_NETWORKS, type PaybyNetwork } from "../../config/networks";

type AccountLike = {
  address?: string;
  accountAddress?: string | { toString: () => string };
};

type WalletNetworkLike = {
  name?: string;
  chainId?: number | string;
  chain_id?: number | string;
};

/**
 * Keep entry-function payloads explicit at the adapter boundary. Some wallet
 * implementations require `typeArguments` to be present even for a
 * non-generic Move function.
 */
export function normalizeEntryFunctionTransaction<T extends { data: unknown }>(
  input: T,
) {
  const data = input.data;
  if (!data || typeof data !== "object" || !("function" in data)) {
    return input;
  }

  const entryFunctionData = data as { typeArguments?: unknown[] };
  return {
    ...input,
    data: {
      ...(data as object),
      typeArguments: entryFunctionData.typeArguments ?? [],
    },
  } as T;
}

export function getAccountAddress(account: unknown) {
  const candidate = account as AccountLike | null | undefined;
  const raw = candidate?.accountAddress ?? candidate?.address;
  return typeof raw === "string" ? raw : raw?.toString() ?? "";
}

export function getWalletNetworkName(network: unknown) {
  const candidate = network as WalletNetworkLike | null | undefined;
  return candidate?.name?.toString().toLowerCase() ?? "";
}

export function getWalletChainId(network: unknown) {
  const candidate = network as WalletNetworkLike | null | undefined;
  const raw = candidate?.chainId ?? candidate?.chain_id;
  if (typeof raw !== "number" && typeof raw !== "string") return null;

  const chainId = Number(raw);
  return Number.isInteger(chainId) && chainId > 0 ? chainId : null;
}

export function getExpectedWalletNetworkName(selectedNetwork: PaybyNetwork) {
  return PAYBY_NETWORKS[selectedNetwork].walletNetwork.toString().toLowerCase();
}

export function isWalletNetworkAligned(
  network: unknown,
  selectedNetwork: PaybyNetwork,
) {
  const current = getWalletNetworkName(network);
  const expected = getExpectedWalletNetworkName(selectedNetwork);

  if (!current || current === expected) return true;

  // Petra reports Shelbynet as a custom network even when the wallet UI shows
  // the active chain as Shelbynet. Treat that as aligned for Shelby's route.
  return selectedNetwork === "shelbynet" && current === "custom";
}

export function walletNetworkMismatchMessage(
  network: unknown,
  selectedNetwork: PaybyNetwork,
) {
  const current = getWalletNetworkName(network) || "unknown";
  const expected = getExpectedWalletNetworkName(selectedNetwork);
  if (selectedNetwork === "shelbynet" && current === "custom") {
    return "Wallet is connected to a custom Shelbynet route.";
  }
  return `Wallet is on ${current}. Switch wallet network to ${expected} before signing this ${PAYBY_NETWORKS[selectedNetwork].label} transaction.`;
}

export function walletNetworkChainMismatchMessage(
  network: unknown,
  selectedNetwork: PaybyNetwork,
  liveChainId: number,
) {
  const walletChainId = getWalletChainId(network);
  const label = PAYBY_NETWORKS[selectedNetwork].label;
  return `Wallet reports chain ID ${walletChainId ?? "unknown"}, but live ${label} reports chain ID ${liveChainId}. Update Petra or use a wallet network profile configured for chain ID ${liveChainId}, then reconnect before signing.`;
}

export async function requestWalletNetworkChange({
  changeNetwork,
  network,
  selectedNetwork,
  setStatusMessage,
}: {
  changeNetwork: (
    network: (typeof PAYBY_NETWORKS)[PaybyNetwork]["walletNetwork"],
  ) => Promise<unknown>;
  network: unknown;
  selectedNetwork: PaybyNetwork;
  setStatusMessage: (message: string) => void;
}) {
  if (isWalletNetworkAligned(network, selectedNetwork)) return true;

  try {
    await changeNetwork(PAYBY_NETWORKS[selectedNetwork].walletNetwork);
    setStatusMessage("Wallet network switch requested. Approve it, then publish again.");
  } catch (error) {
    setStatusMessage(
      error instanceof Error
        ? error.message
        : walletNetworkMismatchMessage(network, selectedNetwork),
    );
  }

  return false;
}
