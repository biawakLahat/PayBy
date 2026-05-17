import type { AvailableWallets } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

export type PaybyNetwork = "shelbynet" | "shelby-testnet";

export type PaybyNetworkConfig = {
  label: string;
  walletNetwork: Network;
  shelbyNetwork: Network.TESTNET | Network.SHELBYNET;
  apiKey: string | undefined;
  aptosApiKey: string | undefined;
  indexerUrl: string;
  shelbyRpcUrl: string;
  fullnodeUrl: string;
  contractAddress: string;
  marketplaceContractAddress: string;
  paymentAssetMetadataAddress: string;
  paymentAssets: Record<"APT" | "SHELBYUSD", string>;
  explorerNetwork: string;
  permanenceNote: string;
};

export const PAYBY_NETWORKS: Record<PaybyNetwork, PaybyNetworkConfig> = {
  shelbynet: {
    label: "Shelbynet",
    walletNetwork: Network.SHELBYNET,
    shelbyNetwork: Network.SHELBYNET,
    apiKey: import.meta.env.VITE_SHELBYNET_API_KEY,
    aptosApiKey:
      import.meta.env.VITE_APTOS_SHELBYNET_API_KEY ||
      import.meta.env.VITE_SHELBYNET_API_KEY,
    indexerUrl:
      "https://api.shelbynet.aptoslabs.com/nocode/v1/public/alias/shelby/shelbynet/v1/graphql",
    shelbyRpcUrl: "https://api.shelbynet.shelby.xyz/shelby",
    fullnodeUrl: "https://api.shelbynet.shelby.xyz/v1",
    contractAddress:
      "0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a",
    marketplaceContractAddress:
      import.meta.env.VITE_PAYBY_SHELBYNET_MARKETPLACE_ADDRESS || "",
    paymentAssetMetadataAddress:
      import.meta.env.VITE_PAYBY_SHELBYNET_PAYMENT_ASSET_METADATA ||
      import.meta.env.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
      "",
    paymentAssets: {
      APT:
        import.meta.env.VITE_PAYBY_SHELBYNET_APT_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_APT_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_SHELBYNET_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
        "",
      SHELBYUSD:
        import.meta.env.VITE_PAYBY_SHELBYNET_SHELBYUSD_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_SHELBYUSD_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_SHELBYNET_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
        "",
    },
    explorerNetwork: "shelbynet",
    permanenceNote: "Prototype network. Data may be wiped roughly weekly.",
  },
  "shelby-testnet": {
    label: "Shelby Testnet",
    walletNetwork: Network.TESTNET,
    shelbyNetwork: Network.TESTNET,
    apiKey: import.meta.env.VITE_SHELBY_TESTNET_API_KEY,
    aptosApiKey:
      import.meta.env.VITE_APTOS_TESTNET_API_KEY ||
      import.meta.env.VITE_SHELBY_TESTNET_API_KEY,
    indexerUrl: "https://api.testnet.aptoslabs.com/v1/graphql",
    shelbyRpcUrl: "https://api.testnet.shelby.xyz/shelby",
    fullnodeUrl: "https://api.testnet.aptoslabs.com/v1",
    contractAddress:
      "0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a",
    marketplaceContractAddress:
      import.meta.env.VITE_PAYBY_TESTNET_MARKETPLACE_ADDRESS || "",
    paymentAssetMetadataAddress:
      import.meta.env.VITE_PAYBY_TESTNET_PAYMENT_ASSET_METADATA ||
      import.meta.env.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
      "",
    paymentAssets: {
      APT:
        import.meta.env.VITE_PAYBY_TESTNET_APT_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_APT_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_TESTNET_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
        "",
      SHELBYUSD:
        import.meta.env.VITE_PAYBY_TESTNET_SHELBYUSD_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_SHELBYUSD_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_TESTNET_PAYMENT_ASSET_METADATA ||
        import.meta.env.VITE_PAYBY_PAYMENT_ASSET_METADATA ||
        "",
    },
    explorerNetwork: "testnet",
    permanenceNote: "Shelby public testnet integration.",
  },
};

export const defaultNetwork = (
  import.meta.env.VITE_PAYBY_DEFAULT_NETWORK === "shelby-testnet"
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
