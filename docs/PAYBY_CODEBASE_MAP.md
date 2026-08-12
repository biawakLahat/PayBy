# Payby Codebase Map

Status: Phase 1 boundary definition
Snapshot: 9 August 2026

This document defines the current responsibilities and the target module boundaries for Payby. Phase 1 is deliberately non-behavioral: it maps ownership and contracts before code is moved.

## Current Baseline

- `src/AppRuntime.tsx` is approximately 959 lines after the Phase 5 page-loading, shared-action, and workspace-control boundary work.
- The runtime now owns provider composition, wallet/network state, service callbacks, and route composition; page bodies and persistence hooks live in dedicated modules.
- `src/styles.css` is approximately 223 KB and contains the legacy/global cascade.
- `src/workspace.css` is approximately 148 KB and contains the workspace refinement layers and later overrides.
- `src/landing.css` is a separate visual layer and is locked during workspace refactors.
- `src/App.tsx` is a small lazy-loading boundary for `AppRuntime`.
- `src/config/networks.ts` owns network configuration and wallet display options.
- `src/components/PaybyLogo.tsx` owns the Payby logo component.
- `contracts/payby_marketplace/` owns the Move package and is outside the React runtime boundary.

## Current Responsibility Inventory

### Application and Routing

Current owner: `src/AppRuntime.tsx`

- `useRoute`
- `App`
- `PaybyRuntime`
- `VaultApp`
- route parsing, navigation, route transitions, theme state, and network state wiring

Target owner: `src/app/`

- `router.ts`
- `AppProviders.tsx`
- `AppRuntime.tsx` as a small composition root
- `workspaceRoutes.ts`

### Domain Types and Pure Rules

Current owner: local types and helpers in `src/AppRuntime.tsx`

- `AppRoute`, `RouteName`, `AppViewName`
- `MediaMetadata`, `CreatorProfile`, `KnownCreator`
- `ActivityItem`, `PendingPublishItem`
- `TransactionItem`, `PurchaseReceipt`
- `ChainListing`, `ChainPurchaseRecord`
- `CreatorSalesSummary`, `ListingSalesSummary`
- `AccessMode`, `VisibilityMode`, `TransactionStatus`, `UnlockState`
- policy IDs, metadata payload conversion, asset formatting, pagination, address formatting

Target owner: `src/domain/` and `src/types/`

- `domain/media.ts`
- `domain/profile.ts`
- `domain/activity.ts`
- `domain/transactions.ts`
- `domain/marketplace.ts`
- `domain/access.ts`
- `types/routes.ts`
- `types/wallet.ts`

Domain rules must remain pure where possible. They must not import React, browser storage, wallet adapters, Shelby SDK clients, or network configuration.

### Aptos and Wallet Integration

Current owner: `src/AppRuntime.tsx` plus `src/browser-polyfills.ts`

- fullnode request headers
- transaction submission and confirmation polling
- transaction-by-hash verification
- wallet address and wallet network normalization
- wallet network switching
- Aptos transaction explorer links
- Move function ID selection and marketplace view requests

Target owner: `src/services/aptos/`

- `fullnode.ts`
- `transactions.ts`
- `wallet.ts`
- `views.ts`
- `explorer.ts`

The service layer must receive a typed network configuration and return typed results or typed service errors. React components must not construct fullnode URLs or Move function IDs directly.

### Shelby Storage Integration

Current owner: Shelby hooks and helpers spread across `src/AppRuntime.tsx`

- upload mutation wiring
- account blob reads
- blob metadata reads
- delete mutation wiring
- Shelby URI construction and direct retrieval
- blob explorer links
- media preview/download handling

Target owner: `src/services/shelby/`

- `storage.ts`
- `blobs.ts`
- `retrieval.ts`
- `explorer.ts`

The service boundary must preserve direct Shelby retrieval while Gateway remains deferred. The service must not own page layout or user-facing copy.

### Payby Move Registry

Current owner: view helpers in `src/AppRuntime.tsx`

- listing and listing metadata reads
- access checks
- buyer purchase index reads
- purchase record reads
- creator sales and listing sales summaries
- creator profile reads
- owner listing enumeration
- access registry blockers

Target owner: `src/services/payby/marketplace.ts`

The marketplace service must be the only runtime module that knows Payby's Move function names, argument ordering, response tuple shapes, and fallback view behavior.

### Browser Persistence and Recovery Cache

Current owner: `readJson`, `writeJson`, and six React hooks in `src/AppRuntime.tsx`

- metadata cache
- creator profile cache
- activity cache
- pending publish cache
- transaction history cache
- purchase receipt cache
- republish and discovery drafts

Target owner:

- `src/services/storage/browserStorage.ts`
- `src/hooks/useStoredMetadata.ts`
- `src/hooks/useCreatorProfile.ts`
- `src/hooks/useActivityFeed.ts`
- `src/hooks/usePendingPublishes.ts`
- `src/hooks/useTransactionHistory.ts`
- `src/hooks/usePurchaseReceipts.ts`

Browser persistence is a recovery layer only. It must be wallet-scoped and network-scoped wherever the record relates to ownership, access, or chain state.

### Page Composition

Current owner: extracted workspace and public pages under `src/pages/workspace/` and `src/pages/public/`

Target owner: `src/pages/`

Workspace pages:

- `workspace/VaultPage.tsx`
- `workspace/PublishPage.tsx`
- `workspace/MediaDetailPage.tsx`
- `workspace/AnalyticsPage.tsx`
- `workspace/DiscoverPage.tsx`
- `workspace/LibraryPage.tsx`
- `workspace/NetworkPage.tsx`
- `workspace/ProfilePage.tsx`
- `workspace/ActivityPage.tsx`

Public pages:

- `public/CreatorPage.tsx`
- `public/MediaPage.tsx`
- `public/SharePage.tsx`

Landing:

- `LandingPage.tsx` remains a locked boundary. It may be extracted for ownership clarity later, but its markup, behavior, styles, and visual output must not change as part of workspace refactoring.

### Reusable UI

Current owner: markup and styles are distributed across `src/AppRuntime.tsx`, `src/styles.css`, and `src/workspace.css`.

Target owner: `src/components/`

- `ui/Button.tsx`
- `ui/IconButton.tsx`
- `ui/FormField.tsx`
- `ui/StatusPill.tsx`
- `ui/EmptyState.tsx`
- `ui/Pagination.tsx`
- `workspace/WorkspaceShell.tsx`
- `workspace/Sidebar.tsx`
- `workspace/Topbar.tsx`
- `workspace/PageHeader.tsx`
- `workspace/DataRail.tsx`
- `workspace/RecordList.tsx`
- `workspace/TransactionRow.tsx`
- `workspace/ActivityRow.tsx`
- `public/CreatorHeader.tsx`
- `public/MediaPreview.tsx`
- `MediaPreview.tsx`
- `PurchaseReceiptCard.tsx`

Components must receive data and callbacks through props. They must not call Aptos, Shelby, Move views, or browser storage directly.

## Canonical Data Contracts

These contracts are the first candidates for extraction into `src/domain/`. Exact field names should remain stable during refactoring unless a migration is planned.

### MediaMetadata

- Identity: `key`, `owner`, `blobName`, `network`
- Shelby metadata: `metadataBlobName`, `metadataUri`, `metadataHash`
- Presentation: `title`, `description`, `category`, `tags`, `coverUrl`
- Access: `visibility`, `accessMode`, `price`, `currency`, `allowlist`
- Local bookkeeping: `createdAt`

Invariant: `owner`, `blobName`, and `network` identify one Payby media record. Chain state and Shelby state override browser cache values.

### CreatorProfile

- Identity: `displayName`, `handle`, `avatarUrl`
- Description: `bio`, `website`
- Optional social state: `xHandle`, `xVerified`
- Commit metadata: `updatedAt`

Invariant: a profile is scoped to the connected creator wallet and network when it is committed on-chain.

### ActivityItem

- Identity: `id`, `wallet`, `network`, `at`
- Event: `type`, `label`, `detail`
- Related media: optional `blobNames`

Invariant: local activity is an operational history, not canonical proof. A network reset may invalidate wallet-scoped local activity.

### TransactionItem

- Identity: `id`, `hash`, `wallet`, `network`
- State: `status`, optional `verification`
- Presentation: `label`, `detail`
- Related media: optional `owner`, `blobNames`
- Time: `createdAt`, `updatedAt`

Invariant: `confirmed` is not sufficient for display as live proof; the active fullnode must verify the hash. A definitive 404/410 removes the cached record.

### PurchaseReceipt

- Transaction: `hash`, `network`, `confirmedAt`
- Parties: `buyer`, `creator`
- Media: `blobName`, `title`
- Policy: `accessMode`, `accessType`
- Payment: `price`, `currency`

Invariant: buyer access and purchase history must be scoped to the connected buyer wallet and reconciled with the Move registry when available.

### ChainListing and ChainPurchaseRecord

These are read models of Move view responses. They must stay separate from form state and browser cache state. Tuple parsing belongs in the marketplace service, not in a page component.

## Dependency Rules

Allowed direction:

`app -> pages -> hooks -> services -> config/vendor SDK`

Supporting rules:

- `domain` and `types` are dependency-light and may be imported by every layer.
- `components/ui` may import `domain/types`, but never services or hooks that perform I/O.
- `pages` may compose hooks and components, but must not build endpoint URLs or Move function IDs.
- `hooks` coordinate React lifecycle and state; they call services and expose view-ready state.
- `services` own I/O, response parsing, retry policy, and service error mapping.
- `config` owns network endpoints, contract addresses, feature flags, and wallet options.
- `landing` remains visually isolated from workspace CSS and workspace component refactors.
- No new circular dependency may be introduced.

## Safe Extraction Order

1. Extract pure types and pure formatting/policy helpers.
2. Extract Aptos fullnode and transaction services.
3. Extract Payby marketplace view services.
4. Extract Shelby storage and retrieval services.
5. Extract browser persistence wrappers and React hooks.
6. Extract workspace page components.
7. Extract shared UI components.
8. Consolidate CSS after selectors are owned by smaller components.

Each step must end with a build checkpoint and a focused diff. No step may combine an architectural move with a visual redesign.

## Phase 2 Implementation Checkpoint

- Shared cross-page models now live in `src/domain/models.ts`.
- Aptos fullnode polling and wallet network alignment now live in `src/services/aptos/`.
- Move marketplace view helpers now live in `src/services/payby/marketplace.ts`.
- Shelby blob URL, URI, share, and explorer helpers now live in `src/services/shelby/storage.ts`.
- Transaction cache scoping, live verification, reset cleanup, and state application now live in `src/services/payby/transaction-history.ts`.
- `useUploadBlobs` and `useDeleteBlobs` remain React hook adapters until Phase 3 so SDK lifecycle rules are not mixed into a non-React service.
- The landing boundary remains unchanged.

## Phase 3 Implementation Checkpoint

- Typed browser persistence now lives in `src/services/storage/local.ts` with safe parsing and an explicit version-migration path.
- Persistence hooks now live in `src/hooks/`: metadata, creator profile, activity, pending publishes, transaction history, and purchase receipts.
- Existing localStorage keys and raw formats remain compatible with existing browser sessions.
- React hook lifecycle and wallet/network scoping remain outside the service layer.
- Buyer purchase index loading stays in application composition because it combines the marketplace service with committed metadata retrieval.

## Phase 4 Implementation Checkpoint - 10 August 2026

- Browser route parsing, history updates, scroll reset, reduced-motion fallback, and View Transition coordination now live in `src/app/router.ts`.
- Workspace page boundaries now exist for Vault, Analytics, Discover, Library, Network, Profile, and Activity under `src/pages/workspace/`.
- `src/pages/workspace/WorkspacePage.tsx` owns the shared workspace shell and receives controls as typed slots.
- `src/components/EmptyState.tsx` and `src/components/PaginationControls.tsx` own the shared empty and pagination states used by the extracted pages.
- Pure wallet/media formatting and pagination helpers now live in `src/utils/formatters.ts`.
- The extracted pages receive service results and callbacks through typed props; they do not construct Aptos, Move, or Shelby endpoint details.
- Publish, media detail, public pages, and helper cleanup remain the next extraction slice. The landing boundary is unchanged.
- `npm.cmd run build` passed after the Phase 4 slice.

## Phase 4 Implementation Checkpoint Continued - 10 August 2026

- `VaultPage.tsx` owns the Shelby blob list, creator registry recovery, pending publish queue, pagination, and wallet-scoped actions.
- `ProfilePage.tsx` owns profile editing, avatar optimization, on-chain profile commits, and creator link actions.
- `WorkspacePage.tsx` owns the shared sidebar, topbar, route title, control slots, and route transition boundary.
- `AppRuntime.tsx` is approximately 3,884 lines after removing the inline Vault, PendingPublishQueue, avatar preparation, and ProfilePanel definitions.
- Landing markup and styles remain a locked boundary. `npm.cmd run build` passed after this continued extraction.
- Smoke checks returned HTTP 200 for the landing route and all eight workspace routes; `git diff --check` reported no whitespace errors.

## Phase 4 Public Boundary Checkpoint - 10 August 2026

- `PublishPage.tsx` owns the Shelby upload and Aptos registry publish flow.
- `MediaDetailPage.tsx` owns workspace media detail, preview, retention, delete, and republish composition.
- `CreatorPage.tsx` owns public creator listing recovery and public creator navigation.
- `MediaPage.tsx` owns public media access checks, paid unlock, receipt presentation, and direct Shelby retrieval.
- `MediaPreview.tsx` and `PurchaseReceiptCard.tsx` are shared UI components for media and purchase proof.
- The old inline page definitions were removed from `AppRuntime.tsx`; it now measures approximately 1,184 lines.
- Dead page helpers and unused runtime imports were removed; metadata payload verification and buyer purchase-index orchestration remain explicit composition responsibilities because they are shared across routes.
- `npm.cmd run build` passed. Landing files and styles remain unchanged.

## Phase 5 UI and Route Loading Checkpoint - 10 August 2026

- `src/components/workspace/PageHeader.tsx`, `Button.tsx`, and `IconButton.tsx` now own shared workspace heading and action contracts.
- `src/components/workspace/FormField.tsx` and `StatusPill.tsx` now own repeated workspace field and status markup; they preserve existing class contracts through props.
- `src/components/workspace/WorkspaceControls.tsx` owns shared theme, network, and wallet controls; it may use wallet/config services but does not own page data or chain mutations.
- Extracted workspace pages use `PageHeader`; migrated actions use the shared button primitives without introducing a new visual layer.
- Workspace and public page modules load through `React.lazy` and explicit `Suspense` fallbacks. `WorkspacePage.tsx` remains the synchronous shell boundary.
- The production build emits dedicated route chunks for the extracted page modules. `AppRuntime.tsx` currently measures approximately 1,218 lines and remains responsible for providers, wallet/network state, and cross-route callbacks.
- `AppRuntime.tsx` currently measures approximately 959 lines after moving shared theme, network, and wallet controls to `WorkspaceControls.tsx`.
- `npm.cmd run build`, route smoke checks, and `git diff --check` passed. The landing boundary remains unchanged.

## Phase 6 CSS Ownership Checkpoint - 10 August 2026

- `src/workspace.css` is the import boundary for the workspace/public stylesheet system.
- `src/workspace-tokens.css` owns workspace/public design tokens and theme variable overrides.
- `src/workspace-base.css` owns the core shell and shared top-level control rules.
- `src/workspace-elements.css` owns shared search, form, upload, and empty-state element rules.
- `src/workspace-components.css` owns page-specific workspace/public component rules.
- `src/workspace-responsive.css` owns responsive rules; `workspace-foundation.css`, `workspace-composition.css`, and `workspace-states.css` retain the later ordered guards and refinements.
- The import order intentionally preserves the previous cascade. Selector removal is deferred until visual comparison proves it is safe.
- Build, route smoke, brace balance, and landing-boundary checks passed. Dark/light screenshot QA is still a release gate.

## Phase 6 Visual QA and Selector Audit - 10 August 2026

- Responsive QA covered every workspace route in dark and light at 320, 768, 1440, and 1920px; no document horizontal overflow was observed.
- The 320px Profile issue was corrected in `src/workspace-states.css`: mobile sidebar height is content-driven, navigation links are content-sized, and workspace controls/forms can shrink below desktop min-content widths.
- The selector audit found seven candidates without literal source tokens, all of which are runtime-generated transaction, verification, or status-pill state classes. They remain intentionally.
- Landing files remain a locked boundary and were not changed.

## Phase 1 Acceptance Criteria

- [x] Current runtime responsibilities are inventoried.
- [x] Target module boundaries are documented.
- [x] Domain contracts and invariants are documented.
- [x] Dependency direction is explicit.
- [x] Safe extraction order is explicit.
- [x] `npm.cmd run build` passes after this document is added.
- [x] Landing files have no diff from the Phase 1 work.
