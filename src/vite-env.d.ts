/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYBY_DEFAULT_NETWORK?: string;
  readonly VITE_SHELBY_TESTNET_API_KEY?: string;
  readonly VITE_SHELBYNET_API_KEY?: string;
  readonly VITE_APTOS_TESTNET_API_KEY?: string;
  readonly VITE_APTOS_SHELBYNET_API_KEY?: string;
  readonly VITE_PAYBY_RETRIEVAL_GATEWAY_URL?: string;
  readonly VITE_PAYBY_MARKETPLACE_ADDRESS?: string;
  readonly VITE_PAYBY_TESTNET_MARKETPLACE_ADDRESS?: string;
  readonly VITE_PAYBY_SHELBYNET_MARKETPLACE_ADDRESS?: string;
  readonly VITE_PAYBY_PAYMENT_ASSET_METADATA?: string;
  readonly VITE_PAYBY_TESTNET_PAYMENT_ASSET_METADATA?: string;
  readonly VITE_PAYBY_SHELBYNET_PAYMENT_ASSET_METADATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
