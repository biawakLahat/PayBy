import type { AvailableWallets } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

export type PaybyNetwork = "shelbynet" | "shelby-testnet";

export type PaybyNetworkConfig = {
  label: string;
  walletNetwork: Network;
  // The current Shelby SDK supports Shelbynet and local only. Testnet remains
  // in Payby's product configuration until Early Access restores a supported
  // SDK route, but it must never be cast into a live Shelbynet client.
  shelbyNetwork: Network.SHELBYNET | Network.TESTNET;
  apiKey: string | undefined;
  aptosApiKey: string | undefined;
  indexerUrl: string;
  shelbyRpcUrl: string;
  // Required when the account has no stored Shelby location preference.
  locationHint?: string;
  fullnodeUrl: string;
  contractAddress: string;
  marketplaceContractAddress: string;
  paymentAssetMetadataAddress: string;
  paymentAssets: Record<"APT" | "SHELBYUSD", string>;
  explorerNetwork: string;
  permanenceNote: string;
};

// Public deployment addresses are safe client configuration. Environment values
// remain supported so a future redeploy can be selected without a code change.
const PAYBY_SHELBYNET_MARKETPLACE_ADDRESS =
  "0x962ebbcf81cbc5dc0950a8ca036d54828481043f1df8960a2ec4d50fae8c3a12";

const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env ?? {};

export const PAYBY_NETWORKS: Record<PaybyNetwork, PaybyNetworkConfig> = {
  shelbynet: {
    label: "Shelbynet",
    walletNetwork: Network.SHELBYNET,
    shelbyNetwork: Network.SHELBYNET,
    apiKey: viteEnv.VITE_SHELBYNET_API_KEY,
    aptosApiKey:
      viteEnv.VITE_APTOS_SHELBYNET_API_KEY ||
      viteEnv.VITE_SHELBYNET_API_KEY,
    // Shelby SDK 0.7 uses the Aptos-hosted Shelby indexer schema. The older
    // no-code alias only exposes processor_status and rejects blob queries.
    indexerUrl: "https://api.shelbynet.aptoslabs.com/v1/graphql",
    shelbyRpcUrl: "https://api.shelbynet.shelby.xyz/shelby",
    locationHint: viteEnv.VITE_SHELBYNET_LOCATION_HINT || "shelbynet-1",
    fullnodeUrl: "https://api.shelbynet.shelby.xyz/v1",
    contractAddress:
      "0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a",
    marketplaceContractAddress:
      viteEnv.VITE_PAYBY_SHELBYNET_MARKETPLACE_ADDRESS ||
      PAYBY_SHELBYNET_MARKETPLACE_ADDRESS,
    paymentAssetMetadataAddress:
      viteEnv.VITE_PAYBY_SHELBYNET_PAYMENT_ASSET_METADATA ||
      viteEnv.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
      "",
    paymentAssets: {
      APT:
        viteEnv.VITE_PAYBY_SHELBYNET_APT_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_APT_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_SHELBYNET_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
        "",
      SHELBYUSD:
        viteEnv.VITE_PAYBY_SHELBYNET_SHELBYUSD_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_SHELBYUSD_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_SHELBYNET_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
        "",
    },
    explorerNetwork: "shelbynet",
    permanenceNote: "Primary Shelby route for community publishing and media operations.",
  },
  "shelby-testnet": {
    label: "Shelby Testnet",
    walletNetwork: Network.TESTNET,
    shelbyNetwork: Network.TESTNET,
    apiKey: viteEnv.VITE_SHELBY_TESTNET_API_KEY,
    aptosApiKey:
      viteEnv.VITE_APTOS_TESTNET_API_KEY ||
      viteEnv.VITE_SHELBY_TESTNET_API_KEY,
    indexerUrl: "https://api.testnet.aptoslabs.com/v1/graphql",
    shelbyRpcUrl: "https://api.testnet.shelby.xyz/shelby",
    locationHint: viteEnv.VITE_SHELBY_TESTNET_LOCATION_HINT,
    fullnodeUrl: "https://api.testnet.aptoslabs.com/v1",
    contractAddress:
      "0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a",
    marketplaceContractAddress:
      viteEnv.VITE_PAYBY_TESTNET_MARKETPLACE_ADDRESS || "",
    paymentAssetMetadataAddress:
      viteEnv.VITE_PAYBY_TESTNET_PAYMENT_ASSET_METADATA ||
      viteEnv.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
      "",
    paymentAssets: {
      APT:
        viteEnv.VITE_PAYBY_TESTNET_APT_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_APT_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_TESTNET_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
        "",
      SHELBYUSD:
        viteEnv.VITE_PAYBY_TESTNET_SHELBYUSD_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_SHELBYUSD_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_TESTNET_PAYMENT_ASSET_METADATA ||
        viteEnv.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
        "",
    },
    explorerNetwork: "testnet",
    permanenceNote: "Shelby Testnet route for Early Access validation and release checks.",
  },
};

export const defaultNetwork = (
  viteEnv.VITE_PAYBY_DEFAULT_NETWORK === "shelby-testnet"
    ? "shelby-testnet"
    : "shelbynet"
) satisfies PaybyNetwork;

export const paybyWallets = [
  "Continue with Google",
  "Continue with Apple",
  "Petra",
  "OKX Wallet",
  "Nightly",
  "Pontem Wallet",
  "Backpack",
  "Bitget Wallet",
  "Gate Wallet",
  "Cosmostation Wallet",
] satisfies readonly AvailableWallets[];
