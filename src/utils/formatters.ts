import type { AccessMode } from "../domain/models";

export function createMediaKey(owner: string, blobName: string) {
  return `${owner.toLowerCase()}::${blobName}`;
}

export function formatAssetUnits(
  value: string | number,
  currency: "APT" | "SHELBYUSD" = "APT",
) {
  const units = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(units) || units <= 0) return `0 ${currency}`;
  const amount = units / 100_000_000;
  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits: 8,
  }).format(amount)} ${currency}`;
}

export function accessModeLabel(mode?: AccessMode) {
  const labels: Record<AccessMode, string> = {
    free: "Free access",
    allowlist: "Wallet allowlist",
    nft: "NFT holder",
    paid: "Paid unlock",
    subscription: "Subscriber only",
  };

  return mode ? labels[mode] : "Unknown policy";
}

export function shortenAddress(address: string) {
  if (!address) return "Connect wallet";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  return {
    pageCount,
    safePage,
    pageItems: items.slice((safePage - 1) * pageSize, safePage * pageSize),
  };
}
