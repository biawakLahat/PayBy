# Payby

Creator media vault for Shelby and Aptos.

## Run The dApp

```bash
npm install
npm run dev
```

The Vite app runs on `http://127.0.0.1:5173` or the next available port.

## Run The Retrieval Gateway

The gateway is optional for local browsing, but required for real access
enforcement. It creates short wallet-bound access sessions and proxies media
retrieval through Shelby.

```bash
npm run gateway
```

Default gateway URL:

```text
http://127.0.0.1:8787
```

Frontend integration:

```env
VITE_PAYBY_RETRIEVAL_GATEWAY_URL=http://127.0.0.1:8787
```

Gateway environment:

```env
PAYBY_GATEWAY_PORT=8787
PAYBY_GATEWAY_SECRET=replace-with-random-secret
PAYBY_GATEWAY_ADMIN_TOKEN=replace-with-admin-token
PAYBY_GATEWAY_ALLOW_CLIENT_POLICY=false
PAYBY_GATEWAY_SKIP_SIGNATURE_VERIFY=false
PAYBY_MARKETPLACE_ADDRESS=
PAYBY_TESTNET_MARKETPLACE_ADDRESS=
PAYBY_SHELBYNET_MARKETPLACE_ADDRESS=
PAYBY_APTOS_TESTNET_API_KEY=
PAYBY_APTOS_SHELBYNET_API_KEY=
```

`PAYBY_GATEWAY_ALLOW_CLIENT_POLICY=true` is only useful during development.
Production policy should be written server-side through the policy API.

## Access Registry Contract

Payby includes a Move package for the marketplace/access registry:

```text
contracts/payby_marketplace/
```

After deployment, set the module address in the frontend and gateway env:

```env
VITE_PAYBY_TESTNET_MARKETPLACE_ADDRESS=0x...
VITE_PAYBY_SHELBYNET_MARKETPLACE_ADDRESS=0x...
PAYBY_TESTNET_MARKETPLACE_ADDRESS=0x...
PAYBY_SHELBYNET_MARKETPLACE_ADDRESS=0x...
VITE_PAYBY_PAYMENT_ASSET_METADATA=0x...
```

The frontend registers allowlist and paid media with
`payby_marketplace::upsert_listing`. The public media page asks the gateway for
a signed access session; the gateway checks `can_access` before proxying Shelby
downloads.

The gateway also exposes a lightweight metadata registry:

```text
GET    /api/metadata
GET    /api/metadata/:network/:owner/:blob
POST   /api/metadata
DELETE /api/metadata/:network/:owner/:blob
```

Published media is mirrored there so vault/share metadata can survive beyond a
single browser cache during local and early community testing.

Deployment helper:

```powershell
.\scripts\deploy-payby-marketplace.ps1 -Network testnet -Profile payby-testnet -UpdateEnv
```

The deployer account must already have gas on the target network. For the local
testnet profile created by Aptos CLI, fund the shown address from
`https://aptos.dev/network/faucet` before running the helper.

## Project Layout

```text
src/
  components/       reusable UI components
  config/           network and wallet configuration
  lib/              shared browser helpers
  App.tsx           dApp routes and workflows
  main.tsx          providers and app bootstrap
server/
  retrieval-gateway.mjs
  data/
contracts/
  payby_marketplace/
```

## Shelby Notes

The Vite config serves `@shelby-protocol/clay-codes/dist/clay.wasm` as
`application/wasm` during development. Keep this in place; Shelby upload
encoding depends on it.
