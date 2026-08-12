# Payby Direction

Payby is a Web3-native creator media vault built for Shelby Early Access. The
goal is not to ship a demo, but to prove a real Shelby workload that creators
and buyers can use across Shelbynet and Shelby testnet.

## Product Target

Payby must become a community-ready dApp for Shelby and Aptos users:

- Creators publish premium media to Shelby.
- Listings, access policies, payments, purchases, and canonical metadata live
  on-chain.
- Buyers unlock media through wallet-based access and paid purchases.
- The dApp makes Shelby integration inspectable and credible.

## Source Of Truth

Payby should follow this architecture:

```text
Shelby
  Media files and retrieval storage

Aptos / Shelbynet contract
  Source of truth for listings, metadata, access policy, paid unlocks, and
  purchase records

Payby gateway
  Controlled retrieval/session layer only

Frontend
  Reads chain + Shelby, then renders creator and buyer workflows

LocalStorage / database
  Optional cache only, never the canonical source of truth
```

## Non-Negotiables

- Payby must support both Shelbynet and Shelby testnet.
- The app must not feel like a local mockup or UI-only demo.
- Metadata that defines a listing should be verifiable from chain.
- Gateway metadata must not be the primary source of truth.
- Wallet/network mismatch states must be explicit.
- Shelby RPC, fullnode, marketplace contract, gateway health, and transaction
  links should be inspectable in the app.

## Roadmap To 100% Community Ready

1. Upgrade the Move contract into a full on-chain media registry.
2. Store listing metadata on-chain:
   - owner
   - blob name
   - title
   - description
   - category
   - tags
   - cover URL or cover blob name
   - visibility
   - access policy
   - price
   - payment asset
   - active/delisted state
   - created/updated timestamps
3. Add creator listing indexes and buyer purchase indexes.
4. Refactor Vault, Detail, and Public pages to read listing state from chain.
5. Keep LocalStorage only as a UI cache.
6. Add creator actions:
   - edit metadata
   - update price
   - update access policy
   - update allowlist
   - delist media
7. Add buyer workflows:
   - purchase media
   - view purchase receipt
   - buyer library / purchased media
   - re-download unlocked media
8. Reduce gateway role to:
   - verify signed wallet access sessions
   - call `can_access` on-chain
   - proxy authorized Shelby retrieval
9. Add Shelby Integration Proof page:
   - active network
   - Shelby RPC
   - Aptos fullnode
   - marketplace contract
   - gateway status
   - latest upload/listing/purchase txs
   - sample public media links
10. Deploy public frontend and gateway over HTTPS.
11. Run multi-wallet E2E tests for free, allowlist, and paid media.
12. Prepare Shelby Early Access submission with architecture, demo links,
    contract addresses, and transaction evidence.

## Early Access Positioning

Payby should be described as:

> A Web3-native creator media vault using Shelby for hot media storage and
> retrieval, and Aptos/Shelbynet for on-chain media registry, access policy,
> paid unlocks, and buyer ownership records.

## Current Bias For Future Work

When choosing between implementation options, prefer:

- on-chain canonical state over gateway-only metadata
- Shelby media blobs over external file storage
- explicit transaction proof over hidden background state
- inspectable network details over abstracted magic
- creator/buyer workflows that real community members can use
