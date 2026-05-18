# Payby

<p align="center">
  <img src="public/payby-icon.svg" width="72" alt="Payby logo" />
</p>

<h3 align="center">Creator media vault for Shelby storage and Aptos access records.</h3>

<p align="center">
  Payby lets creators publish media to Shelby, register listing and access policy on Aptos,
  and share wallet-aware media pages buyers can unlock from their own account.
</p>

<p align="center">
  <a href="https://payby-pi.vercel.app"><strong>Live app</strong></a>
  |
  <a href="contracts/payby_marketplace">Move registry</a>
  |
  <a href="scripts/readiness-check.mjs">Community readiness check</a>
</p>

<p align="center">
  <img src="assets/readme/shelby.svg" width="32" alt="Shelby" />
  &nbsp;
  <strong>Shelby media storage</strong>
  &nbsp;&nbsp;&nbsp;
  <img src="assets/readme/aptos.svg" width="32" alt="Aptos" />
  &nbsp;
  <strong>Aptos wallet registry</strong>
</p>

![Payby landing page](assets/readme/payby-landing-page.png)

## What Payby Does

Payby is a Web3-native creator media vault for premium media, creator archives, gated drops, and wallet-scoped buyer access.

Creators can:

- Publish media blobs to Shelby from an Aptos wallet.
- Register owner-scoped media listings on-chain.
- Commit metadata, access policy, visibility, price, and Shelby URI.
- Share public media pages and public creator pages.
- Track creator sales, listing sales, revenue, and activity.
- Manage free, paid, private, and allowlist-oriented media policies.

Buyers can:

- Open media pages from their own wallet.
- Purchase paid media and record purchase proof on Aptos.
- Reopen unlocked media from a wallet-scoped buyer library.
- Verify access without inheriting another wallet's activity.

## Integration Focus

| Layer | Role |
| --- | --- |
| Shelby | Media blob publishing, storage route, retrieval route, metadata blob storage |
| Aptos / Shelbynet | Wallet signing, owner-scoped registry, access policy, purchase receipts, creator profile records |
| Payby frontend | Creator workspace, buyer library, public media pages, discovery, analytics, route inspection |
| Local cache | UI recovery cache only; canonical listing and access state is intended to live on-chain |

Payby currently uses direct Shelby retrieval while Early Access validation is pending. The Move registry remains the durable source for listing ownership, metadata commitments, policy, purchases, and creator profile state.

## Core Features

- **Creator Vault**: wallet-scoped Shelby media library with search, registry recovery, route proof, share links, expiry status, and download actions.
- **Publish Flow**: media upload, metadata entry, retention selection, visibility, access policy, pricing, and wallet-signed registry writes.
- **On-Chain Registry**: owner-scoped listings, creator profiles, paid unlock receipts, revenue summaries, and access checks.
- **Public Media Pages**: shareable pages that read listing state and verify buyer access before unlock.
- **Creator Pages**: `/creator/<wallet-address>` pages for public creator identity and listed media.
- **Buyer Library**: wallet-scoped purchase receipts and unlocked media.
- **Analytics**: creator revenue, listing sales, buyer receipts, and activity surfaces.
- **Network Routes**: Shelbynet and Shelby Testnet configuration with Shelby RPC, Aptos fullnode, indexer, contract, and payment asset visibility.

## Architecture

```text
Creator wallet
  |
  | signs upload and registry transactions
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
  | listings, policies, profiles, purchases, revenue
  v
Vault / Buyer Library / Creator Pages / Public Media Pages
```

Main integration points:

- `@shelby-protocol/react` for upload mutations.
- `@shelby-protocol/sdk` for browser-side Shelby client operations.
- `@aptos-labs/wallet-adapter-react` for wallet connection and signing.
- `@aptos-labs/ts-sdk` for fullnode reads, view calls, and transaction finality.
- `contracts/payby_marketplace` for Move-based media listing and access state.

## Networks

| Payby route | Wallet network | Shelby RPC | Purpose |
| --- | --- | --- | --- |
| Shelbynet | `Network.SHELBYNET` | `https://api.shelbynet.shelby.xyz/shelby` | Primary community testing route |
| Shelby Testnet | `Network.TESTNET` | `https://api.testnet.shelby.xyz/shelby` | Early Access validation route |

Shelbynet is a prototype network. Treat it as a live integration route, not permanent archival storage.

## Move Registry

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
- `upsert_creator_profile_v2`
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
- `get_creator_profile_v2`
- `can_access_for_owner`

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

Optional network-specific payment assets:

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

Run locally:

```bash
npm run dev
```

Build and type-check:

```bash
npm run build
```

Run the community readiness check:

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

assets/readme/
  payby-landing-page.png  README landing page screenshot
  aptos.svg               Aptos README icon
  shelby.svg              Shelby README icon

public/
  payby-icon.svg          browser and app icon
```

## Shelby Notes

Shelby upload encoding depends on Clay WASM. The Vite config serves:

```text
@shelby-protocol/clay-codes/dist/clay.wasm
```

with `application/wasm` during development. Keep this behavior intact when changing Vite configuration.

Payby writes Payby metadata as a Shelby blob and commits its URI/hash on-chain. This keeps user-facing metadata recoverable from Shelby while keeping ownership and access proof on Aptos.

## Community Beta Checklist

Before inviting external users:

- Verify production Vercel environment variables.
- Publish one small free media item on Shelbynet from wallet A.
- Confirm wallet A sees only wallet A vault and activity.
- Open the public media page and verify the Shelby blob can be previewed or downloaded.
- Publish one paid media item with a non-zero price.
- Connect wallet B and complete a paid unlock.
- Verify `purchase_from` records buyer access on-chain.
- Confirm wallet A sees updated creator revenue and listing-level sales.
- Commit the creator profile on-chain and open `/creator/<wallet-address>`.
- Open `/app/discover`, browse an external creator wallet, and verify wallet scope stays isolated.
- Connect wallet C and confirm wallet C does not inherit wallet B activity or purchase state.
- Repeat the same path on Shelby Testnet after Early Access is granted.

## Current Status

Payby is ready for real Shelbynet end-to-end testing with the owner-scoped Move registry, paid unlock transfer flow, buyer purchase index, creator revenue summary, listing-level sales, and on-chain creator profile registry deployed and integrated.

Remaining production-hardening work is focused on multi-wallet E2E testing, Shelby Testnet validation through Early Access, contract review, and a future hardened retrieval service if strict server-enforced media gating is required.
