import { PAYBY_NETWORKS, type PaybyNetwork } from "../../config/networks";

export function encodeBlobPath(blobName: string) {
  return blobName.split("/").map(encodeURIComponent).join("/");
}

export function shelbyExplorerNetwork(network: PaybyNetwork) {
  return network === "shelby-testnet" ? "testnet" : "shelbynet";
}

export function shelbyBlobExplorerUrl(
  network: PaybyNetwork,
  owner: string,
  blobName: string,
) {
  const params = new URLSearchParams({
    owner,
    blobName,
  });
  return `https://explorer.shelby.xyz/${shelbyExplorerNetwork(network)}/blobs?${params.toString()}`;
}

export function getShelbyUri(
  network: PaybyNetwork,
  owner: string,
  blobName: string,
) {
  return `shelby://${network}/${owner}/${encodeBlobPath(blobName)}`;
}

export function getDownloadUrl(
  network: PaybyNetwork,
  owner: string,
  blobName: string,
) {
  return `${PAYBY_NETWORKS[network].shelbyRpcUrl}/v1/blobs/${owner}/${encodeBlobPath(
    blobName,
  )}`;
}

export function resolveShelbyUri(uri: string) {
  if (!uri.startsWith("shelby://")) return uri;
  const parsed = new URL(uri);
  const network = parsed.hostname as PaybyNetwork;
  const [owner = "", ...blobParts] = parsed.pathname
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);
  if (!owner || !blobParts.length || !PAYBY_NETWORKS[network]) return "";
  return getDownloadUrl(network, owner, blobParts.join("/"));
}

export function getShareUrl(owner: string, blobName: string) {
  return `${window.location.origin}/media/${encodeURIComponent(owner)}/${encodeBlobPath(
    blobName,
  )}`;
}
