# Payby

Payby is a Web3-native creator media vault built for Shelby storage and Aptos wallets.

It lets creators publish media to Shelby, register access policy and metadata commitments on Aptos, and share media pages that can be verified through wallet ownership, paid unlock state, and on-chain listing records.

## Product Scope

Payby is designed for creators who need a wallet-native way to publish and manage premium media without relying on a centralized account system.

Core workflows:

- Publish media blobs to Shelby from a connected Aptos wallet.
- Register creator-owned media listings on-chain.
- Store metadata commitments for title, category, visibility, policy, and Shelby URI.
- Support free, paid, private, and allowlist-oriented media policies.
- Transfer paid unlock payments to the creator and record buyer purchase proofs on Aptos.
- Keep vault, activity, and library views scoped to the connected wallet.
- Publish an on-chain creator profile for public creator pages.
- Surface creator sales, listing-level sales, and buyer purchase history from the Move registry.
- Operate across Shelbynet and Shelby Testnet routes.

Current retrieval mode is direct Shelby retrieval while Shelby Early Access is pending. The Move registry is the durable source for listing ownership, access policy, metadata commitments, and purchase proofs.

## Architecture

```text
Creator wallet
  |
  | signs upload / registry transactions
  v
Payby frontend
  |
  | Shelby React SDK + Shelby browser SDK
  v
Shelby storage
  |
  | media blob + Payby metadata blob
  v
Aptos Move registry
  |
  | owner-scoped listings, policy, metadata hash, purchases
  v
Vault / Library / Public media pages
```

Main integration points:

- `@shelby-protocol/react` for the upload flow.
- `@shelby-protocol/sdk` for browser-side Shelby client operations.
- `@aptos-labs/wallet-adapter-react` for wallet connection and signing.
- `@aptos-labs/ts-sdk` for Aptos fullnode reads and transaction finality.
- `contracts/payby_marketplace` for on-chain creator listing and access state.

## Networks

Payby supports two Shelby routes:

| Payby route | Wallet network | Shelby RPC | Purpose |
| --- | --- | --- | --- |
| Shelbynet | `Network.SHELBYNET` | `https://api.shelbynet.shelby.xyz/shelby` | Current primary route for live prototype testing |
| Shelby Testnet | `Network.TESTNET` | `https://api.testnet.shelby.xyz/shelby` | Early Access test route |

Shelbynet data may be wiped by the network. Do not treat prototype network storage as permanent archival storage.

## On-Chain Registry

The Move package lives in:

```text
contracts/payby_marketplace/
```

The registry stores:

- owner-scoped media listings
- blob names and creator addresses
- visibility and access policy
- paid unlock price and payment asset metadata address
- allowlist notes
- metadata URI and metadata hash commitments
- buyer purchase records
- creator sales and revenue summary
- listing-level sales and revenue summary
- creator profile data

Important entry functions:

- `initialize`
- `upsert_listing_for_owner_with_metadata`
- `purchase_from`
- `upsert_creator_profile`
- `delist_for_owner`

Important view functions:

- `get_listing_for_owner`
- `get_listing_metadata_for_owner`
- `get_listing_count_for_owner`
- `get_listing_key_for_owner`
- `get_purchases_from_owner`
- `get_purchase_record_count`
- `get_purchase_record`
- `get_sales_summary`
- `get_listing_sales_summary`
- `get_creator_profile`
- `can_access_for_owner`

The frontend keeps fallback reads for older registry records, but new publishes use the owner-scoped registry path.

## Environment

Create a local `.env` from `.env.example`.

```bash
cp .env.example .env
```

Required frontend variables:

```env
VITE_PAYBY_DEFAULT_NETWORK=shelbynet
VITE_SHELBYNET_API_KEY=
VITE_SHELBY_TESTNET_API_KEY=
VITE_APTOS_SHELBYNET_API_KEY=
VITE_APTOS_TESTNET_API_KEY=
VITE_PAYBY_SHELBYNET_MARKETPLACE_ADDRESS=
VITE_PAYBY_TESTNET_MARKETPLACE_ADDRESS=
VITE_PAYBY_PAYMENT_ASSET_METADATA=
VITE_PAYBY_APT_PAYMENT_ASSET_METADATA=
VITE_PAYBY_SHELBYUSD_PAYMENT_ASSET_METADATA=
```

Use network-specific payment assets when needed:

```env
VITE_PAYBY_SHELBYNET_PAYMENT_ASSET_METADATA=
VITE_PAYBY_TESTNET_PAYMENT_ASSET_METADATA=
VITE_PAYBY_SHELBYNET_APT_PAYMENT_ASSET_METADATA=
VITE_PAYBY_SHELBYNET_SHELBYUSD_PAYMENT_ASSET_METADATA=
VITE_PAYBY_TESTNET_APT_PAYMENT_ASSET_METADATA=
VITE_PAYBY_TESTNET_SHELBYUSD_PAYMENT_ASSET_METADATA=
```

Never commit real API keys, wallet private keys, or local `.env` files.

## Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Vite serves the app at `http://127.0.0.1:5173` or the next available port.

Build and type-check:

```bash
npm run build
```

Community readiness check:

```bash
npm run verify:community
```

The readiness check validates marketplace configuration, callable Move views, payment asset configuration, and current direct Shelby retrieval mode without printing secrets.

## Deploying The Move Package

The helper script publishes and initializes the Payby registry package.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-payby-marketplace.ps1 `
  -Network shelbynet `
  -Profile payby-testnet `
  -Address 0x... `
  -UpdateEnv
```

For Shelby Testnet:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-payby-marketplace.ps1 `
  -Network testnet `
  -Profile payby-testnet `
  -Address 0x... `
  -UpdateEnv
```

The deployer account must have enough gas on the selected network before publishing.

## Project Layout

```text
src/
  App.tsx                 landing shell and lazy runtime loader
  AppRuntime.tsx          dApp routes, Shelby workflows, registry reads/writes
  browser-polyfills.ts    browser polyfills required by Shelby/Aptos packages
  components/
    PaybyLogo.tsx         Payby brand mark
  config/
    networks.ts           Shelbynet, Shelby Testnet, wallet, and RPC config
  styles.css              full application styling and responsive layout

contracts/
  payby_marketplace/      Aptos Move access registry

scripts/
  deploy-payby-marketplace.ps1
  readiness-check.mjs

public/
  payby-icon.svg          browser and app icon
```

## Shelby Implementation Notes

Shelby upload encoding depends on Clay WASM. The Vite config serves:

```text
@shelby-protocol/clay-codes/dist/clay.wasm
```

with `application/wasm` during development. Keep this behavior intact when changing Vite configuration.

Payby currently writes Payby metadata as a Shelby blob and commits its URI/hash on-chain. This keeps user-facing metadata recoverable from Shelby while keeping the ownership and access proof on Aptos.

## Community Beta Checklist

Before inviting external users:

- Verify the production frontend has all required Vercel environment variables.
- Publish one small free media item on Shelbynet from wallet A.
- Confirm wallet A sees only wallet A vault and activity entries.
- Open the public media page and verify the Shelby blob can be previewed or downloaded.
- Publish one paid media item with a non-zero price.
- Connect wallet B and confirm the paid page requests purchase before access.
- Complete purchase from wallet B and verify `purchase_from` records the unlock on-chain.
- Confirm wallet A sees updated creator revenue and listing-level sales.
- Commit the creator profile on-chain and open `/creator/<wallet-address>`.
- Connect wallet C and confirm wallet C does not inherit wallet B activity or purchase state.
- Delete a listing from wallet A and confirm the public page no longer treats it as active.
- Repeat the same path on Shelby Testnet after Early Access is granted.

## Current Status

Payby is ready for real Shelbynet end-to-end testing with the owner-scoped Move registry, paid unlock transfer flow, buyer purchase index, creator revenue summary, listing-level sales, and on-chain creator profile registry deployed and integrated. The remaining production-hardening work is focused on real multi-wallet E2E testing, Early Access validation on Shelby Testnet, contract review, and a future hardened retrieval service if strict server-enforced media gating is required.
