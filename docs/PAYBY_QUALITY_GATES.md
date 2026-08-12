# Payby Quality Gates

This document records the repeatable checks for the Payby workspace. It is intentionally separate from the landing page contract: landing files must remain unchanged while workspace and integration work evolves.

## Local Commands

```text
npm.cmd run test
npm.cmd run build
npm.cmd run check:readiness
```

`npm.cmd run verify` is the build-only gate. Run the test command separately because Windows can deny the nested Vite/esbuild child process when the build is invoked from another npm script.

## Automated Coverage

- Route parsing and URL serialization for workspace, creator, public media, and media detail routes.
- Wallet address extraction, network normalization, Shelbynet custom-network compatibility, and network switch rejection.
- Wallet/network transaction scoping so one wallet cannot render another wallet's history.
- Transaction cache recovery, bounded commit ordering, wipe cleanup, and pending/confirmed/failed/missing/unavailable lifecycle states.
- Fullnode response mapping for success, pending, failed, 404, 410, rate limiting, and offline responses.
- Marketplace policy mapping, chain listing recovery, unsupported gate blocking, Shelby URI resolution, blob path encoding, and explorer URLs.

## Current Results - 12 August 2026

- Unit suite: 19 tests passed.
- TypeScript and Vite production build: passed.
- Landing boundary: unchanged and not included in workspace refactor edits.
- Shelby Testnet readiness: marketplace views callable and payment asset configured.
- Shelbynet readiness: all marketplace views are callable at the dedicated Payby deployment address and the payment asset is configured.

## Still Required Before Community Release

- Run a real creator publish flow and a separate buyer purchase flow with two wallets.
- Verify wallet popup, network switch, Shelby upload, Aptos registration, paid unlock, receipt recovery, and post-wipe behavior on both routes.
- Complete browser accessibility and console-error review with the actual wallet extensions enabled.

Readiness is now green for both configured network routes. Community release still requires real creator and buyer wallet E2E.

## Deployment Preflight - 12 August 2026

- `contracts/payby_marketplace` compiles successfully with a neutral compile address.
- `scripts/deploy-payby-marketplace.ps1` now requires either a dedicated Payby profile or a local `-PrivateKeyFile` plus explicit `-Address`; it refuses known non-Payby project profiles, uses the direct Shelby fullnode endpoint, and selects the API key for the selected network.
- The Aptos CLI currently exposes only non-Payby profiles from its active configuration. The workspace's testnet config is not a Shelbynet signer; the dedicated local signer was used for the live deployment.
- A disposable Shelbynet key was generated only for faucet connectivity testing, the faucet endpoint refused the connection, and the unused key was removed. No private key was committed or sent in chat.
- This preflight was completed before the dedicated signer was funded; the deployment verification below is the current result.

## Verification After Deployment Guard Update - 12 August 2026

- `npm.cmd run test`: 19 tests passed.
- `npm.cmd run build`: passed; the existing `AppRuntime` chunk warning remains.
- `npm.cmd run check:readiness`: was correctly non-zero before deployment because the old Shelbynet address was not deployed.
- PowerShell script parse: passed. Missing signer, non-Payby profile, and unloaded workspace-only profile checks fail before any chain command is submitted.
- Final deploy-script pass also separates profile and local-signer error labels; no temporary keypair remains under `.aptos/`.

## Dedicated Payby Signer - 12 August 2026

- Generated a fresh Ed25519 publisher signer locally for Payby only.
- The private key remains in the ignored `.aptos/` directory and is not written to documentation, Git, or chat.
- Funding is confirmed through the Shelbynet indexed fungible-asset balance endpoint before deployment.

## Funding Verification Correction - 12 August 2026

- The generated public address matches the local Ed25519 signer according to the Aptos TypeScript SDK.
- Shelbynet GraphQL `current_fungible_asset_balances` reports `3,000,000,000` Aptos base units (`30 APT`) and `20,000,000` ShelbyUSD base units (`0.2 SHELBY_USD`) for the dedicated Payby address.
- The legacy `/resources` endpoint does not expose an APT `CoinStore` for this account because the current fungible balance is indexed through the modern fungible-asset tables. An absent `CoinStore` must not be treated as zero-balance proof.
- The dedicated Payby signer is funded. The next gate is publishing and initializing the module, followed by readiness verification.

## Deployment Verification - 12 August 2026

- Published `payby_marketplace` from the dedicated Payby signer at `0x962ebbcf81cbc5dc0950a8ca036d54828481043f1df8960a2ec4d50fae8c3a12`.
- Publish transaction finalized successfully: `0x7f2615f639e16c11b42e7ae990edbcc66fd0c66e18e646d1cffd9f214dd60965`.
- Initialized the on-chain registry successfully with `100,000` maximum gas units; the first `20,000`-unit attempt was rejected as out of gas and did not initialize the registry.
- Initialize transaction finalized successfully: `0x6cb19b17efc004e6c6ecb52c38c875e16c677a342ed76dc2d48e524f9779f3946`.
- The module endpoint returns HTTP 200 and the account exposes the Payby `Registry`, `OwnerRegistry`, `PurchaseIndex`, `SalesRegistry`, `ProfileRegistry`, `MetadataRegistry`, `PurchaseRegistry`, `ProfileRegistryV2`, `ListingSalesRegistry`, and `OwnerMetadataRegistry` resources.
- `npm.cmd run check:readiness`: passed. Shelbynet and Shelby Testnet view checks are callable; the Shelbynet address now resolves to the dedicated Payby deployment.
- The remaining release gates are real wallet E2E, Shelby blob upload/retrieval, paid unlock, browser QA, and Early Access validation on Shelby Testnet.

## Runtime Configuration Verification - 12 August 2026

- The live Shelbynet marketplace address is included as a public frontend fallback, while Vite environment values remain the override for future redeployments.
- The Shelbynet indexer display route is `https://api.shelbynet.shelby.xyz/v1/graphql`.
- The local signer deployment path uses the Aptos TypeScript SDK; the CLI profile path remains available and rejects non-Payby profiles.
- Final local gates passed: 19 tests, production build, Shelbynet/Testnet readiness, and whitespace audit. Landing files remained unchanged.
