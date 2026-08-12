# Payby Memory

This file records decisions and progress so future work keeps the same direction.

## Project

- Local repo: `C:\Users\User\Desktop\Payby`
- GitHub repo: `https://github.com/biawakLahat/PayBy`
- Vercel auto redeploys after push to GitHub.
- Main branch: `main`

## Important Local State

- `.gitignore` has local changes and should not be staged unless the user asks.
- `docs/` is local/untracked and should not be staged unless the user asks.
- Preserve unrelated user changes.

## Major Decisions

- Payby is a real dApp, not a demo.
- Product direction is on-chain first.
- Supabase or centralized app database is not desired for canonical state.
- Gateway work is deferred until Shelby Early Access is granted.
- Current retrieval mode is direct Shelby.
- Shelbynet is the practical current test route.
- Owner-scoped Move registries must use flat table keys. Nested `Table` values caused live Shelbynet simulation timeouts while flat writes completed normally.
- Publish registry finalization uses two idempotent wallet transactions: owner listing first, metadata commitment second.

## Owner Registry V2 - 12 August 2026

- The canonical Shelbynet marketplace address remains `0x962ebbcf81cbc5dc0950a8ca036d54828481043f1df8960a2ec4d50fae8c3a12`; no frontend address correction was required.
- Upgrade publish transaction: `0xb4bc9b9d56dae19c2b139c62f5e09425ffe8854466be36f011bb926e0948c951`.
- V2 resource initialization transaction: `0x452d0536df8257f5f074a779ad3be51c81760bc79f17167c40f5e635eca6a20d`.
- `upsert_listing_for_owner` now writes a flat `(owner, blob_name)` key and simulated successfully on the public Shelbynet endpoint without an API key in 1.47 seconds.
- `upsert_listing_for_owner_with_metadata` also simulated successfully after the V2 migration, proving the earlier timeout came from the old nested-table implementation rather than Petra parsing the address.
- The frontend deliberately keeps separate listing and metadata transactions for smaller wallet prompts and resumable retries.
- A real Petra-backed publish remains the final proof; simulation, compile, tests, and ABI checks are not a substitute for wallet E2E.
- Readiness treats Shelbynet as the required route. Shelby Testnet stays visible as an informational warning until Early Access provides a supported SDK route and a deployable V2 contract signer.
- Shelby Testnet requires Early Access.

## Implemented So Far

- Landing page separated from workspace.
- Workspace routes:
  - Vault,
  - Publish,
  - Analytics,
  - Discover,
  - Library,
  - Network,
  - Profile,
  - Activity.
- Public media page.
- Public creator page.
- Shelby upload/direct retrieval.
- Aptos wallet integration.
- Move registry for:
  - listings,
  - access policy,
  - purchase receipts,
  - revenue summaries,
  - creator profiles.
- Wallet-scoped activity/history behavior was addressed.
- Pagination exists for vault/activity/library surfaces.
- README was polished with Payby landing screenshot and Aptos/Shelby icons.
- GitHub profile README for `biawakLahat` was polished separately.
- Motion system was added:
  - route transitions,
  - staggered reveals,
  - skeleton loading,
  - button busy states,
  - publish timeline motion,
  - sidebar active animation,
  - responsive/touch target tuning.

## Latest Progress

- On 14 July 2026, a flagship UI pass was applied across every Payby surface.
- Removed the redundant global status strip and workspace intelligence bar.
- Rebuilt the visual tokens, app shell, sidebar, topbar, panels, buttons, forms, lists, metrics, responsive behavior, landing page, and public pages.
- Removed blur from the new route transition and kept motion to transform and opacity.
- Fixed button layering so command icons remain fully visible.
- `npm run build` passed after the UI overhaul.
- Local dev server returned HTTP 200.
- Browser automation was unavailable in the active session, so deployed screenshot QA remains required.
- Readiness check still reports HTTP 400 warnings for Shelbynet marketplace view calls; Shelby Testnet view checks passed.

## Latest Design Refinement

- A second premium UI pass was completed on 14 July 2026.
- The visual direction is now quieter and more neutral, with gold and teal used selectively.
- Workspace headers no longer compete with page titles.
- Metrics render as unified data rails instead of repeated floating cards.
- Browser-supported View Transitions now handle internal route changes.
- React route updates are synchronously committed during transition capture to prevent stale-frame flashes.
- Navigation still falls back safely when View Transitions are unavailable or reduced motion is enabled.
- Decorative workspace grid and blur-heavy movement remain removed.
- Production build and local HTTP smoke checks passed after this refinement.

## Editorial Landing Redesign

- On 14 July 2026, the previous 3D vault hero was removed.
- The hero now presents the real Payby route: creator media to Shelby storage, Aptos access policy, then buyer wallet proof.
- Floating console labels, trust-badge rows, generic feature cards, gradients, and glass navigation were removed from the new landing composition.
- Workflow, product capabilities, and infrastructure now use an editorial layout with rules and ledgers.
- Official Shelby and Aptos image assets are used in both the hero route and infrastructure section.
- Typography now pairs Epilogue interface text with Source Serif 4 for selected narrative copy.
- Navigation has a compact mobile label and the route proof is positioned to avoid overlap on narrow screens.
- Production build passed and the local landing/runtime endpoints returned HTTP 200.
- The in-app browser was unavailable in this session, so screenshot QA across dark/light and mobile/desktop remains an explicit follow-up.

## Workspace Redesign

- On 14 July 2026, all sidebar routes were moved to a new isolated workspace design layer in workspace.css.
- The app shell now uses a flat 224 px sidebar, compact utility topbar, neutral canvas, and line-based hierarchy.
- Vault metrics are one horizontal data rail instead of a two-row card matrix.
- Publish is organized into three explicit stages: media details, access and price, then retention and files.
- Analytics, Library, Activity, Vault records, and creator media use consistent row-based collections.
- Discover uses a creator search command and recent-creator list instead of a generic card feed.
- Network configuration uses route, readiness, funding, and endpoint ledgers with technical detail kept in disclosure.
- Profile no longer repeats verification and profile statistics in both the main view and action rail.
- Empty and failure states now accept route-specific semantic icons.
- Workspace gradients, blur, glow, decorative page icons, nested cards, and excessive rounded surfaces were removed.
- Dark and light themes share the same hierarchy through workspace-scoped tokens.
- Responsive behavior includes horizontal navigation, compact connected-wallet treatment, scrollable data rails, and single-column forms.
- TypeScript and the Vite production build passed; /app/vault, AppRuntime.tsx, and workspace.css returned HTTP 200 locally.
- Browser screenshot automation remained unavailable, so deployed visual QA is still required before calling the interface pixel-final.

## Workspace Refinement - 15 July 2026

- The previous isolated workspace CSS was replaced rather than patched with another cosmetic layer.
- The new direction is a quiet Payby Studio Console: near-neutral surfaces, gold hierarchy, teal success, and Shelby pink used only for Shelby identity.
- Page sections are unframed; cards are reserved for actual creator/media objects and compact control surfaces.
- Vault now owns storage operations only. Sales and revenue were removed from Vault and remain in Analytics.
- Analytics uses a dominant revenue figure plus sales, listed media, and paid-media facts.
- Library uses a dominant unlocked-media figure plus purchases, wallet sessions, and last unlock.
- Discover is now a full-width creator search/feed without a redundant explanatory side panel.
- Publish uses three content stages with a sticky readiness rail and compact route context.
- Network presents one active route, readiness ledger, funding helper, and collapsed endpoints without repeating integration proof.
- Profile shows identity and statistics once; the action rail now contains only preview and commands.
- Activity is styled as a wallet-scoped chronology with restrained status filters and Aptos/Shelby links.
- Legacy workspace cascade leaks were explicitly reset for workspace padding, topbar margins, lists, shadows, status rails, and links.
- Production build passed after the refinement. All eight local workspace routes returned HTTP 200.
- Workspace CSS contains no gradients, blur filters, or negative letter spacing, and its brace count is balanced.
- Browser discovery returned no available in-app browser, so visual screenshot QA was not fabricated and remains pending.

## GitHub Push - 3 August 2026

- Commit `9978eb1` (`Redesign Payby workspace interface`) was pushed to `origin/main`.
- The commit contains the Payby workspace and landing UI/runtime update only.
- Local notes (`soul.md`, `tasks.md`, `memory.md`, and `docs/`) remain outside the pushed commit.

## Current Assessment

- Community-ready progress: roughly 78-82%.
- Early Access / world-class showcase readiness: roughly 65-70%.

The main remaining gap is real browser QA after deploy, Shelbynet view-call reliability, multi-wallet E2E proof, and runtime bundle performance.

## Operating Rule From User

Every time Payby progresses, update:

- `soul.md`
- `tasks.md`
- `memory.md`

## Workspace Composition Pass - 9 August 2026

- The landing page is locked for this pass and was not changed.
- The signed-in workspace now uses a dark sidebar in light and dark themes, creating a consistent navigation anchor.
- The usable desktop canvas increased to a maximum of 1780 px with responsive 15-56 px gutters.
- Page headers are compact and unframed; decorative header icons are hidden.
- Vault, Analytics, Library, Activity, and Network use framed data rails with stronger value hierarchy instead of disconnected horizontal slabs.
- Empty states are capped at a compact operational height and use the same raised surface as record lists.
- Publish uses a wide framed form with a 320 px sticky readiness rail.
- Profile uses a wide identity editor with a 340 px preview/action rail.
- Discover uses a full-width creator command bar and a contained recent-creator feed.
- Activity filters now span the content width and transaction history reads as one ledger.
- Light mode uses a neutral green-gray canvas and white task surfaces; the previous pink cast is removed from the workspace.
- Workspace buttons and controls use stable 5-6 px corners while status tags retain pill geometry.
- Copy was tightened across all eight workspace routes to describe implemented Shelby and Aptos behavior directly.
- `npm.cmd run build` passed. CSS braces are balanced at 912/912 and `git diff --check` reported no whitespace errors.
- Production screenshots of Vault and Publish at 1600 x 1000 confirmed the new layout. Full route and mobile screenshot QA remains pending because Chrome headless did not complete the batch.

## Light Theme and Stable Panel Fix - 9 August 2026

- A legacy `:root[data-theme="light"] .sidebar` rule had higher specificity than the new workspace sidebar and changed its dark background to a light one while descendants retained light text.
- The light workspace sidebar now has an explicit high-specificity dark background, visible branding, readable inactive navigation, and gold active-route treatment.
- All light-mode command controls now define explicit default and hover contrast; disabled controls remain readable instead of fading into the canvas.
- Legacy `.panel:hover` rules had higher specificity than the Publish and Profile frame rules, causing their border, background, and padding to disappear under the pointer.
- Publish, Profile editor, and final profile card now preserve identical geometry across default, hover, and focus-within states.
- Workspace route roots now explicitly reject the legacy light-panel tint and gradient, keeping the light canvas neutral across Vault, Analytics, Library, Discover, Network, and Activity.
- `npm.cmd run build` passed after the fix.
- Chrome screenshots at 1600 x 1000 verified light-mode Vault, Profile, and Publish. The temporary QA page used to select light mode was deleted afterward.

## GitHub Push - 9 August 2026

- Commit `b0ed505` (`Polish workspace themes and stable layouts`) was pushed to `origin/main`.
- The commit contains only `src/AppRuntime.tsx` and `src/workspace.css`.
- Internal direction, task, and memory files remain local and were not included in the product commit.

## Visual Simplification - 9 August 2026

- Removed `Buyer proof / Wallet access confirmed` from the landing route diagram because it repeated trust information without helping the primary flow.
- Deleted the associated selector, animation, responsive override, and reduced-motion reference rather than leaving dead CSS.
- Vault search focus now uses a neutral one-pixel container boundary; the input no longer receives the global gold double outline.
- Production build passed and CSS brace counts remained balanced. No integrated browser was available for a fresh screenshot in this session.
- Commit `3ccafeb` (`Simplify landing proof and vault focus`) was pushed to `origin/main` with only the three product files involved.

## Wide Desktop Density Pass - 9 August 2026

- The previous neutral focus override covered only the Vault toolbar; Discover still inherited the global gold input outline.
- All workspace search inputs now suppress the global accent outline and expose one neutral focus boundary on their search container.
- Desktop Activity, Network, Profile, and registry surfaces use shorter rows, smaller headings, tighter columns, and reduced padding at widths above 960 px.
- Mobile layout rules remain unchanged because the density pass is scoped to desktop.
- The Vault Publish button icon no longer inherits the legacy dark SVG background and now follows the button foreground color.
- Production build passed and `workspace.css` remains balanced at 974 opening and 974 closing braces.
- The network selector now renders the bundled Shelby brand image instead of the custom route SVG; its wrapper is a clean clipped square in both themes.
- Obsolete `NetworkRouteMark` markup and all remaining route-mark selectors were removed. Production build passed afterward.
- Commit `1ad1252` (`Refine workspace density and Shelby branding`) was pushed to `origin/main` with only `src/AppRuntime.tsx`, `src/styles.css`, and `src/workspace.css`.

## Operational Typography Pass - 9 August 2026

- The legacy `.workspace-page > .panel` minimum height was stretching auto grid rows, which made compact buyer, creator, funding, and network summaries appear as large empty blocks.
- `src/workspace.css` now keeps workspace panel content aligned to the start of the grid and lets these blocks size to their actual content.
- Buyer receipt and creator registry banners now use a shared title/body hierarchy, normal-weight descriptions, controlled 66ch reading width, and icons aligned to the first text line.
- Funding helper and active route copy now share the same label spacing, line-height, and compact desktop scale; action buttons remain vertically centered without changing the text column.
- The landing page was not changed.
- `npm.cmd run build` passed, `git diff --check` passed, and workspace CSS braces remain balanced at 991/991.
- Pushed only `src/workspace.css` to `origin/main` in commit `bf09757` (`Refine workspace information block typography`).
- `HEAD` and `origin/main` both resolve to `bf0975773f85c4193e35daa39ea581fbe2f80031`; local planning files remain outside the product commit.

## Activity Cache Revalidation - 9 August 2026

- The Activity page previously read `payby-transaction-history-v1` as authoritative and displayed old cached records as `confirmed` forever.
- This was incorrect for Shelbynet, where a network reset can remove a transaction while the browser's localStorage remains intact.
- `src/AppRuntime.tsx` now queries `/transactions/by_hash/{hash}` on the active fullnode for the connected wallet and network.
- The request uses `PAYBY_NETWORKS[selectedNetwork].aptosApiKey`; the existing confirmation polling uses the same authenticated headers.
- Transaction verification states are `checking`, `live`, and `unavailable`.
- A `404` or `410` is treated as definitive absence and removes only the matching scoped transaction from local cache.
- The same signal dispatches `payby-network-reset`, and `useActivityFeed` removes the connected wallet's local events for that network. This covers old `METADATA` and `UPLOAD` rows shown below transaction history.
- Non-definitive failures never delete data; the UI labels those rows `cached` and explains that they are not current chain proof.
- Activity now exposes `Refresh proof` for an explicit re-check and uses a bounded concurrency of four fullnode requests.
- `src/workspace.css` received only workspace-scoped styles for the verification notice and status pills. The landing page remains untouched.
- `npm.cmd run build` passed after the change. No browser screenshot was fabricated because in-app browser availability remains unresolved.

## Phase 4 Router and Workspace Pages - 10 August 2026

- Added `src/app/router.ts`; URL parsing, history updates, scroll reset, reduced-motion handling, and View Transition coordination no longer live in `AppRuntime.tsx`.
- Added `src/pages/workspace/AnalyticsPage.tsx`, `DiscoverPage.tsx`, `LibraryPage.tsx`, `NetworkPage.tsx`, and `ActivityPage.tsx`.
- The application now renders those five routes through dedicated modules and passes chain/storage behavior through typed props or existing services.
- Added shared `src/components/EmptyState.tsx`, `src/components/PaginationControls.tsx`, and `src/utils/formatters.ts`.
- `AppRuntime.tsx` was approximately 5,247 lines at this checkpoint; the follow-up extraction below reduced it further and resolved the unused inline Buyer Library note.
- Landing markup and landing styles were not changed.
- `npm.cmd run build` and `git diff --check` passed after this slice.

## Phase 4 Workspace Boundaries Continued - 10 August 2026

- Added `src/pages/workspace/VaultPage.tsx`; it owns Shelby blob listing, registry recovery, pending publish queue, pagination, and wallet-scoped vault actions.
- Added `src/pages/workspace/ProfilePage.tsx`; it owns avatar preparation, profile editing, on-chain profile commits, and creator link actions.
- Added `src/pages/workspace/WorkspacePage.tsx`; it owns the shared workspace shell and receives network/theme/wallet controls as slots.
- `AppRuntime.tsx` now measures approximately 3,884 lines. The old inline Vault, PendingPublishQueue, avatar preparation, and ProfilePanel definitions were removed after wiring the new modules.
- Publish, media detail, public pages, and helper/import cleanup remain the next extraction slice.
- `npm.cmd run build` passed. Landing markup and styles were not changed.
- Final smoke check returned HTTP 200 for `/` and all eight workspace routes; `git diff --check` reported no whitespace errors.

## Refactor Tracker - 9 August 2026

- Root file `1.md` is the active codebase refactor tracker.
- Current structural baseline: `src/AppRuntime.tsx` is approximately 7,691 lines and owns routing, services, hooks, and most page components; `src/styles.css` and `src/workspace.css` are large layered stylesheets.
- The intended extraction order is services, persistence hooks, pages, reusable UI components, then CSS cleanup and tests.
- The tracker explicitly locks the landing page so workspace refactors do not change landing markup or visual behavior.
- `1.md` is local project planning and should remain outside product commits unless the user explicitly asks to publish it.

## Phase 1 Boundary Definition - 9 August 2026

- Added `docs/PAYBY_CODEBASE_MAP.md` as the authoritative Phase 1 architecture map.
- The map inventories the current monolithic runtime and defines target ownership for application composition, domain contracts, Aptos, Shelby, Payby Move services, browser persistence, pages, and reusable UI.
- Canonical contracts documented: `MediaMetadata`, `CreatorProfile`, `ActivityItem`, `TransactionItem`, `PurchaseReceipt`, `ChainListing`, and `ChainPurchaseRecord`.
- Dependency direction is now explicit: `app -> pages -> hooks -> services -> config/vendor SDK`, with `domain` and `types` remaining dependency-light.
- Phase 1 is documentation and boundary work only; no runtime behavior or landing visual was changed.
- `npm.cmd run build` passed. The existing large `AppRuntime` chunk warning remains and is tracked for later extraction.

## Phase 2 Service Boundaries - 9 August 2026

- Shared models were extracted to `src/domain/models.ts`; the runtime now imports the contracts instead of declaring them locally.
- `src/services/aptos/fullnode.ts` owns API-key headers, transaction reads, finality polling, and concurrency control. It preserves 404/410 as missing and non-definitive failures as unavailable.
- `src/services/aptos/wallet.ts` owns wallet address/network normalization and Petra's Shelbynet `custom` compatibility rule.
- `src/services/payby/marketplace.ts` owns Move function IDs, Aptos view requests, tuple parsing, owner/legacy fallbacks, listings, access checks, purchases, sales, and profiles.
- `src/services/shelby/storage.ts` owns blob path encoding, direct download URLs, share links, explorer links, and Shelby URI resolution.
- `src/services/payby/transaction-history.ts` owns local cache normalization, wallet/network scoping, live fullnode verification, reset activity cleanup, and application of live status.
- `src/services/aptos/fullnode.fixtures.ts` documents confirmed, pending, failed, 404, 410, 429, and 5xx cases for the next automated test phase.
- React Shelby SDK upload/delete hooks remain in the runtime intentionally; moving them is a Phase 3 lifecycle extraction, not a generic service move.
- `npm.cmd run build` passed. Landing files and landing behavior remain untouched.

## Phase 3 Persistence and Hooks - 10 August 2026

- Added `src/services/storage/local.ts`; it safely parses local JSON, preserves raw legacy cache formats, and exposes an explicit versioned migration path.
- Extracted `useStoredMetadata`, `useCreatorProfile`, `useActivityFeed`, `usePendingPublishes`, `useTransactionHistory`, and `usePurchaseReceipts` into `src/hooks/`.
- Existing keys remain unchanged: metadata, profile, activity, pending publishes, transactions, and purchase receipts continue to recover from the same browser storage entries.
- `useTransactionHistory` still verifies the active fullnode and clears only the affected wallet/network after definitive missing transactions.
- `usePurchaseReceipts` still deduplicates by buyer, network, creator, and blob; buyer library still refreshes from the Move purchase index in AppRuntime.
- `npm.cmd run build` passed. Landing files and landing behavior remain untouched.

## Phase 4 Public and Media Boundaries - 10 August 2026

- Added `src/pages/workspace/PublishPage.tsx` and moved the upload form, publish lifecycle, progress, and transaction feedback out of `AppRuntime.tsx`.
- Added `src/pages/workspace/MediaDetailPage.tsx` and moved workspace media detail, preview, retention, delete, and republish composition out of the runtime.
- Added `src/pages/public/CreatorPage.tsx` and `src/pages/public/MediaPage.tsx` for public creator vaults and public media access.
- Public media retains the real chain flow: Aptos listing reads, wallet access checks, paid Move unlock, transaction confirmation, wallet-scoped receipt persistence, and direct Shelby retrieval.
- Added shared `src/components/MediaPreview.tsx` and `src/components/PurchaseReceiptCard.tsx`.
- Removed the old inline Publish, media detail, public creator, public media, and receipt component definitions.
- `src/AppRuntime.tsx` now measures approximately 1,184 lines. It is still the composition root, but page bodies and lifecycle hooks are no longer concentrated there.
- Removed dead page helpers and unused imports from the runtime after extraction. The remaining metadata commit/recovery and buyer purchase-index orchestration is still used by multiple routes and was left at the composition boundary deliberately.
- `npm.cmd run build` passed. The large `AppRuntime` production chunk warning remains and should be addressed with route-level code splitting later.
- Landing markup and styles were not changed. Public and workspace routes now render from dedicated modules.
- Smoke verification returned HTTP 200 for the landing route, all workspace routes, and representative creator/media SPA paths.

## Phase 5 UI and Route Loading Boundaries - 10 August 2026

- Added shared workspace UI primitives: `src/components/workspace/PageHeader.tsx`, `Button.tsx`, and `IconButton.tsx`.
- Migrated the extracted workspace pages to the shared page header; action controls use shared button primitives where the existing class contract was equivalent.
- Added route-level lazy loading and `Suspense` fallbacks for Vault, Publish, Analytics, Discover, Library, Network, Profile, Activity, Media Detail, public Creator, and public Media.
- `WorkspacePage` stays directly loaded as the stable workspace shell and receives the lazy page body below it.
- `AppRuntime.tsx` currently measures 1,218 lines. It is smaller in page ownership but still contains providers, wallet/network state, and callbacks shared by multiple routes.
- The production build emitted 12 page chunks. The main runtime chunk warning remains a provider/service extraction task, not a reason to move logic back into page modules.
- Smoke checks returned HTTP 200 for `/`, all eight workspace routes, `/creator/0x1`, and `/media/0x1/sample.png`.
- `git diff --check` passed; landing file diff is clean. The public SPA paths verify serving only, not live chain records.

## Workspace Control Boundary - 10 August 2026

- Added `src/components/workspace/WorkspaceControls.tsx` for the shared ThemeToggle, NetworkSwitch, and WalletControl implementations.
- Preserved the existing Aptos wallet ordering, not-detected wallet install links, network menu behavior, Shelby logo, and connected-wallet pill.
- `AppRuntime.tsx` now measures 959 lines; it still owns provider setup and cross-route orchestration, but no longer owns shared control markup.
- The extracted theme toggle retains its click handler. `npm.cmd run build` passed, all synthetic route smoke checks returned HTTP 200, and the locked landing files have no diff.

## Phase 5 Form and Status Boundaries - 10 August 2026

- Added `src/components/workspace/FormField.tsx` and migrated the Publish and Profile form labels to it. The component intentionally returns the same semantic `label > span + control` shape used by existing workspace selectors.
- Added `src/components/workspace/StatusPill.tsx` and migrated Activity transaction status output to preserve the existing `tx-status-pill` class and wallet/network verification labels.
- Added workspace-scoped status dot variants for neutral, positive, warning, and danger states.
- `npm.cmd run build` passed after this slice; the landing page remains untouched.

## Phase 6 CSS Ownership Slice - 10 August 2026

- Added `src/workspace-tokens.css` for workspace/public foundations and light-theme variable overrides.
- Reorganized the workspace stylesheet behind imports in `src/workspace.css` while preserving the existing cascade order.
- Added named partials for core shell, shared elements, page components, responsive behavior, foundation guards, composition refinement, and stable interaction states.
- This is an ownership refactor, not a visual redesign. No landing file was edited.
- `npm.cmd run build` passed twice; all workspace/public route smoke checks returned HTTP 200; CSS braces are balanced across every partial; `git diff --check` passed.
- The main runtime chunk warning is unchanged. Historical selector deduplication and screenshot QA across dark/light and 320/768/1440/wide viewports remain open.

## Phase 6 Visual QA and Selector Audit - 10 August 2026

- Fixed responsive workspace overflow discovered in the 320px Profile screenshot. The final workspace state layer now resets the mobile sidebar to an auto-height two-column row, makes navigation links content-sized, and adds `min-width: 0` guards around topbar, controls, page grids, forms, Profile, and Publish.
- Verified all eight workspace routes (`vault`, `publish`, `analytics`, `discover`, `library`, `network`, `profile`, `activity`) in dark and light at 320, 768, 1440, and 1920px. No document horizontal overflow was reported.
- Visual spot checks: dark Vault 1440px, light Profile 1440px, and light Profile 320px. The mobile sidebar is contained, the form wraps normally, and light-mode controls remain visible.
- Selector audit over `workspace*.css` found seven classes without literal source tokens: `is-failed`, `is-pending`, two verification states, and three status-pill variants. All are runtime-generated state classes, so no selector was removed.
- `npm.cmd run build` passed after the fix. Landing files remain unchanged.

## Phase 7 Quality Gates - 12 August 2026

- Added four test files under `tests/` and the `npm.cmd run test` script. The suite currently passes 19 tests.
- Refactored `src/app/router.ts` so `parseRoute` and `routeToPath` are pure exports while `useRoute` still owns browser history and View Transitions.
- Updated `src/config/networks.ts` to read optional Vite env values through a testable `viteEnv` object; browser behavior remains unchanged.
- Updated `scripts/readiness-check.mjs` to use `https://api.shelbynet.shelby.xyz/v1` by default and send the configured Aptos/Shelby API key as a Bearer header.
- Updated `.env.example` to use the same direct Shelbynet fullnode default.
- Build passes. The large `AppRuntime` chunk warning is unchanged.
- Readiness is not complete: Shelby Testnet marketplace views are callable, but Shelbynet returns that the configured `payby_marketplace` module cannot be found. Do not hide or downgrade this blocker.
- `npm.cmd run verify` cannot be used as a combined build+test gate in this Windows sandbox because nested Vite/esbuild spawning returns EPERM; run `npm.cmd run build` and `npm.cmd run test` directly. The product build itself passes.

## Shelbynet Deployment Preflight - 12 August 2026

- The local Aptos CLI profiles were inspected by name only: `karya-shelbynet-publisher` and `yora-shelbynet-registry-v2` exist, but neither belongs to Payby and neither was used.
- `contracts/payby_marketplace` compiled successfully with a neutral address.
- `scripts/deploy-payby-marketplace.ps1` now requires a dedicated Payby profile or a local signer file plus explicit address, rejects known non-Payby profiles, uses `https://api.shelbynet.shelby.xyz/v1`, and selects Shelbynet/Testnet API keys independently.
- The active Aptos CLI configuration does not load the workspace-only `payby-testnet` profile. The dedicated local signer was used instead, with indexed Shelbynet balances verified before deployment.
- A disposable Shelbynet key was used only to test the faucet; the faucet refused the connection, and the unused key was removed.
- No publish or initialize transaction was submitted during this pre-deployment blocker; the live deployment is recorded below.

## Verification After Deployment Guard Update - 12 August 2026

- `npm.cmd run test` passes 19 tests.
- `npm.cmd run build` passes with the existing large `AppRuntime` chunk warning.
- The pre-deployment `npm.cmd run check:readiness` was non-zero because the old Shelbynet address had no `payby_marketplace`; the dedicated deployment verification below cleared this blocker.
- The deploy script parser and fail-closed guards for missing signer, non-Payby profile, and unloaded workspace-only profile passed without sending a transaction.
- Final deploy-script pass keeps local signer paths outside repository contents and leaves no temporary keypair under `.aptos/`.

## Dedicated Payby Signer - 12 August 2026

- Generated a fresh Ed25519 publisher signer specifically for Payby.
- Private key remains local in ignored `.aptos/`; no secret was printed or recorded.
- Address is funded on Shelbynet; deployment can proceed with this signer.

## Funding Verification Correction - 12 August 2026

- The public address was verified against the local Ed25519 signer through the Aptos SDK.
- The Shelbynet GraphQL indexer reports `30 APT` and `0.2 SHELBY_USD` through `current_fungible_asset_balances`.
- The legacy `/resources` endpoint has no APT `CoinStore`; that endpoint/model mismatch is not evidence of zero balance.
- The deployment gate is now publish, initialize, and post-deployment readiness verification.

## Shelbynet Deployment - 12 August 2026

- Dedicated Payby deployment address: `0x962ebbcf81cbc5dc0950a8ca036d54828481043f1df8960a2ec4d50fae8c3a12`.
- Publish finalized at transaction `0x7f2615f639e16c11b42e7ae990edbcc66fd0c66e18e646d1cffd9f214dd60965`.
- Initialize finalized at transaction `0x6cb19b17efc004e6c6ecb52c38c875e16c677a342ed76dc2d48e524f9779f3946` with `45,496` gas units used. The earlier `20,000`-unit attempt failed out of gas and did not initialize the registry.
- `npm.cmd run check:readiness` passes for Shelbynet and Shelby Testnet after updating the local Shelbynet marketplace address.
- Remaining release gates are real two-wallet creator/buyer E2E, Shelby blob upload/retrieval, paid unlock and receipts, post-wipe behavior, browser QA, and Shelby Testnet Early Access validation.

## Runtime Deployment Hardening - 12 August 2026

- `src/config/networks.ts` now includes the deployed public Shelbynet marketplace address as a fallback, with Vite env override support retained for future deployments.
- The displayed Shelbynet indexer route is now `https://api.shelbynet.shelby.xyz/v1/graphql`.
- `scripts/deploy-payby-marketplace.mjs` provides the tested Aptos TypeScript SDK path for local signer files; `scripts/deploy-payby-marketplace.ps1` keeps the CLI path for loaded profiles.
- Final local gates: 19 tests passed, production build passed with the existing large `AppRuntime` chunk warning, readiness passed for both routes, and `git diff --check` passed.
- Landing files remain untouched and no GitHub push was performed in this step.

## Shelby SDK Schema Repair - 12 August 2026

- The publish screenshot error was caused by a stale Shelby SDK query: `blobs` existed, but fields such as `blob_name` and `is_written` no longer matched the live schema.
- Installed `@shelby-protocol/sdk@0.7.0` and `@shelby-protocol/react@4.1.0`; the current SDK emits `object_name`, `is_committed`, `is_persisted`, and related modern fields.
- Updated `VaultPage` to use `useDeleteObjects` and `FullObjectMetadata`; updated `MediaDetailPage` to use `useFullObjectMetadata` and `useDeleteObjects`.
- `AppRuntime` now creates the Shelby client only for `Network.SHELBYNET`. Selecting `shelby-testnet` shows a clear unsupported-route state instead of constructing an invalid SDK client.
- Live installed-SDK query against `https://api.shelbynet.aptoslabs.com/v1/graphql` returned `SDK_QUERY_OK rows=0`; this proves schema compatibility, not a completed upload E2E.
- Verification: `npm.cmd run build` passes, 19 tests pass, and `git diff --check` passes. No landing files were changed.
- `npm.cmd run check:readiness` remains READY after the SDK migration; this validates Payby Move views and payment configuration, not the pending real Shelby upload E2E.

## Runtime Blank Screen Recovery - 12 August 2026

- Browser error: `The requested module ... does not provide an export named 'useDeleteObjects'`.
- Root cause: Vite was serving an old generated dependency chunk that still contained the retired Shelby React exports, even though the installed package and source had already moved to SDK 0.7 / React 4.1.
- Recovery: remove only `node_modules/.vite`, restart Vite with `--force` on port 5173, and let dependency optimization rebuild from the installed package.
- Verification: fresh prebundle exports `useDeleteObjects` and `useFullObjectMetadata`; `/app/vault` and the workspace module return HTTP 200; build and 19 tests pass.
- Do not mistake this runtime recovery for a completed real publish E2E. Shelby upload, registration, retrieval, and buyer unlock still need wallet-backed verification.

## Shelby Registration Location Fix - 12 August 2026

- Petra showed `The account has no preference set and the write supplied no location input` while simulating `blob_metadata::register_multiple_blobs`.
- Current Shelby SDK behavior supports `ShelbyClientConfig.locationHint`; React `useUploadBlobs` forwards its default location hint into the registration payload.
- The live Shelbynet location list returned `shelbynet-1`. Payby now sets that value by default through `VITE_SHELBYNET_LOCATION_HINT` and also passes it at mutation time.
- Generated payload verification now shows the third registration argument as `shelbynet-1`, not `null`.
- This resolves the known simulation blocker. It does not prove the full upload until the user retries with the funded Petra account.

## Petra Registry Prompt Repair - 12 August 2026

- Petra's registry prompt showed `Cannot read properties of undefined (reading 'match')` for the non-generic `upsert_listing_for_owner_with_metadata` call, while the page simultaneously showed a false `Publish complete` state.
- Payby now sends `typeArguments: []` on registry, profile, allowlist, repair, and paid-unlock entry functions. Shelby-generated transaction input is normalized at the wallet boundary as well.
- The publish state machine now remains in `registry` after Shelby upload and only reaches `success` after each registry hash is returned and finalized. Failed registry work is retained for retry.
- The static regression suite passes 22 tests and the production build passes. Live Petra approval and finality remain unverified until the wallet reports the live chain ID and the funded browser flow is retried.
- Registry finality errors now update the corresponding Activity transaction to `failed` when a hash was already returned.

## Petra Chain-ID Mismatch Diagnosis - 12 August 2026

- The live `https://api.shelbynet.shelby.xyz/v1` ledger endpoint reports chain ID `118`.
- The installed Petra `2.5.0` extension's native Shelbynet profile is hardcoded to chain ID `59`.
- The deployed `payby_marketplace::upsert_listing_for_owner_with_metadata` ABI and arguments match the live module. Aptos SDK simulation succeeds at the protocol level with chain ID `118`; the same raw transaction with chain ID `59` returns `BAD_CHAIN_ID`.
- Petra's sign-only path still runs Petra's own simulation before approval. The previous raw-sign attempt therefore did not bypass the error and must not be treated as a resolved fix.
- Payby's fullnode builder now uses `Network.SHELBYNET` with the configured Shelbynet endpoint. `PublishPage` checks the wallet-reported chain ID against the live fullnode before any Shelby upload or registry prompt.
- A mismatched wallet now fails closed with an actionable message instead of opening a Petra request that cannot be approved.
- The remaining external gate is a Petra update or a wallet network profile that reports chain ID `118`, followed by a funded browser publish and finality check.

## Repository Documentation Refresh - 12 August 2026

- Rewrote `README.md` to describe the actual Payby product, Shelby storage boundary, Aptos Move registry, wallet-scoped buyer and creator flows, routes, repository layout, environment configuration, deployment, security boundaries, and release gates.
- README explicitly avoids claiming community-ready status before funded creator/buyer E2E, Shelby Testnet Early Access validation, post-wipe checks, and browser wallet QA are complete.
- README records the current Shelbynet marketplace deployment as a route-scoped prototype address and warns that Shelbynet can be wiped.

## Payment Asset and Profile Isolation - 12 August 2026

- Root cause of the ShelbyUSD payment bug: the frontend used a generic payment asset fallback, and the active `.env` generic payment address was APT. A ShelbyUSD listing could therefore be registered with APT while its metadata still said ShelbyUSD.
- The Shelbynet ShelbyUSD metadata object is now explicit: `0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1`. The registry builder selects only the requested currency's asset.
- `MediaPage` compares the listing's on-chain `payment_metadata` to the expected asset and fails closed before opening Petra when they disagree. Existing incorrect listings must be re-published or updated by the creator.
- `useCreatorProfile` now stores drafts under `payby-creator-profile-v1:<network>:<wallet>`, and the app resets profile state on wallet/network changes. Public pages only use the connected wallet's local profile when the route owner matches that wallet.
- Verification after the fix: 28 deterministic tests passed, the TypeScript/Vite production build passed, and no landing-page file changed.
- The old `assets/readme/payby-landing-page.png` embed was removed from README because it no longer represents the current landing page. The asset file and live landing implementation were not modified.
