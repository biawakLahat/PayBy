# Payby Tasks

This file tracks what should be done next. Update it whenever Payby makes progress.

## Active Priorities

1. Retry the funded Petra publish with the flat owner registry and verify both listing and metadata approvals reach Aptos finality.
2. Verify the published media appears in Vault and can be retrieved directly from Shelby after a clean browser reload.
3. Run real multi-wallet E2E:
   - wallet A publishes media,
   - wallet B opens media page,
   - wallet B purchases/unlocks paid media,
   - wallet A sees sales/revenue,
   - wallet B sees buyer library,
   - Activity remains wallet-scoped.
4. Verify the redesigned editorial landing page on the deployed Vercel app at desktop, tablet, and mobile widths.
5. Extract remaining input/select/textarea/dialog controls and workspace shell primitives only after their existing visual and interaction contracts are documented.
6. Finish provider/service splitting so the remaining `AppRuntime` chunk stays small after route chunks load.
7. Prepare Shelby Early Access proof:
   - what Payby builds,
   - how Shelby is used,
   - how Aptos/Shelbynet records access,
   - what is already live on Shelbynet,
   - what needs Shelby Testnet access.

## Owner Registry Simulation Repair - 12 August 2026

- [x] Reproduce Petra's timeout against `upsert_listing_for_owner_with_metadata` on the live Shelbynet fullnode.
- [x] Prove that the deployed address and ABI are correct; the previously suggested alternative address was a different, empty account.
- [x] Isolate the timeout to nested Move tables in the owner-scoped registry; flat-table writes simulate normally.
- [x] Add flat V2 resources keyed by `(owner, blob_name)` and `(buyer, owner)` without changing existing resource layouts.
- [x] Split the frontend registry flow into listing approval and metadata approval with explicit fullnode preflight.
- [x] Deploy and initialize the compatible upgrade at the existing Payby address.
- [x] Verify owner-listing simulation without an API key: success in 1.47 seconds, `Executed successfully`.
- [x] Verify the combined V2 write path: success in 1.46 seconds, `Executed successfully`.
- [x] Pass 26 TypeScript tests, Move compile, and the Move registry unit test.
- [ ] Complete the real Petra approval, submission, finality, Vault recovery, and direct Shelby retrieval flow.

## Completed 14 July 2026

- Removed repeated workspace status surfaces.
- Converted the global header into a compact workspace command bar.
- Unified metric cards into calmer data rails.
- Removed decorative workspace grid and excess surface effects.
- Added progressive route transitions with a reduced-motion fallback.
- Synchronized route state with the transition snapshot so navigation remains immediate.
- Added restrained icon, focus, press, and row-action feedback.
- Kept the production build passing after the premium UI pass.
- Replaced the previous 3D landing hero and floating labels with a product-specific Shelby to Aptos publishing route.
- Rebuilt the landing workflow, product capabilities, and infrastructure sections as line-based editorial layouts.
- Added the real Shelby and Aptos marks to the publishing route and infrastructure ledger.
- Removed landing gradients, glass navigation, decorative glow, and generic feature-card composition.
- Added responsive navigation labels and mobile-safe route spacing.
- Kept entrance motion restrained and added a reduced-motion fallback.
- Confirmed the production build and local runtime after the landing redesign.
- Rebuilt the full workspace shell with a flat sidebar, compact utility topbar, and restrained route transition.
- Replaced dashboard card matrices with horizontal data rails and row-based records.
- Redesigned Vault, Publish, Analytics, Discover, Library, Network, Profile, Activity, and media detail surfaces.
- Split Publish into media, access, and retention stages without changing transaction behavior.
- Removed duplicate creator identity and metrics from the Profile action rail.
- Added semantic icons for wallet, loading, error, search, activity, vault, and buyer-library states.
- Removed workspace gradients, glass effects, glow, nested cards, and decorative page icons.
- Added mobile-safe navigation, wallet truncation, horizontal data rails, and single-column work flows.
- Confirmed TypeScript, Vite production build, and local workspace endpoints after the redesign.

## Completed 15 July 2026

- Replaced the prior workspace stylesheet with one coherent Payby Studio Console system.
- Removed repeated sales and revenue summaries from Vault so Analytics owns creator performance.
- Reduced Vault to four operational facts: media, stored size, retention, and pending sync.
- Rebuilt Analytics around one dominant revenue figure and a compact media-performance ledger.
- Rebuilt Library around unlocked media with secondary purchase, session, and recency facts.
- Removed the redundant creator-proof side panel from Discover and promoted creator sales into the selected-creator context row.
- Simplified Publish support content into one checklist and a concise storage, access, and payment ledger.
- Removed repeated Network integration proof while preserving route readiness, funding, and technical endpoints.
- Removed duplicated identity statistics from the Profile action rail.
- Added route-specific layouts, cleaner record rows, restrained interaction motion, and responsive behavior from wide desktop to mobile.
- Removed workspace gradients, blur, glow, negative tracking, nested page cards, and leaked legacy shadows.
- Verified balanced CSS braces, clean Git whitespace checks, production build success, and HTTP 200 on all eight workspace routes.
- Confirmed the in-app browser was unavailable, so dark/light screenshot review remains an explicit follow-up rather than an unverified claim.

## Completed 3 August 2026

- Pushed the workspace redesign update to GitHub in commit `9978eb1` (`Redesign Payby workspace interface`).
- The pushed files were limited to dApp runtime and UI assets: `src/AppRuntime.tsx`, `src/main.tsx`, `src/styles.css`, `src/landing.css`, and `src/workspace.css`.
- Left local planning and memory notes unpushed.

## Completed 10 August 2026 - Phase 4 Router and Workspace Pages

- Added `src/app/router.ts` for URL parsing, history navigation, scroll reset, reduced-motion fallback, and View Transition coordination.
- Added dedicated workspace page modules for Analytics, Discover, Library, Network, and Activity.
- Added shared `EmptyState`, `PaginationControls`, and formatting helpers.
- Routed the application through the new page modules with typed props and service callbacks.
- Kept the landing page boundary untouched and verified with a passing production build.
- At this checkpoint, Vault, Profile, and the workspace shell were still pending; they were completed in the follow-up slice below.

## Completed 10 August 2026 - Phase 4 Workspace Boundaries Continued

- Added `src/pages/workspace/VaultPage.tsx` and moved the Shelby blob list, registry recovery, pending publish queue, pagination, and wallet-scoped actions out of `AppRuntime.tsx`.
- Added `src/pages/workspace/ProfilePage.tsx` and moved avatar preparation, profile editing, on-chain profile commits, and creator link actions out of `AppRuntime.tsx`.
- Added `src/pages/workspace/WorkspacePage.tsx` for the shared workspace shell while keeping page-specific content in the route composition root.
- Removed the old inline Vault, PendingPublishQueue, and ProfilePanel definitions after wiring the replacements into the application.
- `AppRuntime.tsx` is now approximately 3,884 lines; Publish, media detail, public pages, and helper cleanup remain.
- `npm.cmd run build` passed after the continued extraction. Landing files remain unchanged.
- Final smoke check returned HTTP 200 for `/`, all eight workspace routes, and `git diff --check` reported no whitespace errors.

## Completed 10 August 2026 - Phase 4 Public and Media Boundaries

- Added `src/pages/workspace/PublishPage.tsx` and moved the upload form, publish progress, transaction feedback, and readiness behavior out of `AppRuntime.tsx`.
- Added `src/pages/workspace/MediaDetailPage.tsx` and moved creator media detail, preview, retention, delete, and republish composition out of `AppRuntime.tsx`.
- Added `src/pages/public/CreatorPage.tsx` for public creator vaults and on-chain listing recovery.
- Added `src/pages/public/MediaPage.tsx` for public media access, Aptos policy checks, paid unlock, receipts, and direct Shelby retrieval.
- Added shared `MediaPreview` and `PurchaseReceiptCard` components so public and workspace media surfaces use one rendering contract.
- Removed the legacy inline Publish, media detail, PurchaseReceiptCard, public creator, and public media definitions.
- `AppRuntime.tsx` is now approximately 1,184 lines and acts as a composition root for providers, wallet state, services, and page callbacks.
- Removed dead inline-page helpers and unused runtime imports after the page boundaries were verified; remaining metadata payload and buyer-index composition is intentional.
- `npm.cmd run build` passed after the extraction. The existing large runtime chunk warning remains tracked for code splitting.
- Landing files remain unchanged; public and workspace routes now have dedicated page ownership.
- Local smoke returned HTTP 200 for `/`, all eight workspace routes, `/creator/0x1`, and `/media/0x1/sample.png`; the synthetic public paths only verify SPA serving, not chain data.

## Completed 10 August 2026 - Phase 5 UI and Route Loading Boundaries

- Added `src/components/workspace/PageHeader.tsx`, `Button.tsx`, and `IconButton.tsx` for shared workspace heading and action contracts.
- Migrated all workspace page headers to `PageHeader`; migrated the existing publish, explore, refresh, share, delete, and copy action surfaces where the primitive contract matched without changing behavior.
- Added `src/components/workspace/WorkspaceControls.tsx` and moved the shared theme toggle, network switcher, and wallet chooser out of `AppRuntime.tsx`.
- Added route-level lazy loading for workspace and public page modules with explicit `Suspense` loading states. `WorkspacePage` remains the synchronous shell boundary.
- The production build now emits dedicated page chunks; `AppRuntime.tsx` measures approximately 959 lines and remains the composition root for providers, wallet state, and cross-route callbacks.
- `npm.cmd run build` passed. The main runtime chunk is still large and remains a tracked provider/service extraction task.
- Smoke returned HTTP 200 for `/`, all eight workspace routes, `/creator/0x1`, and `/media/0x1/sample.png`.
- `git diff --check` passed and the locked landing files remain unchanged.

## Continued 10 August 2026 - Workspace Control Boundary

- `WorkspaceControls.tsx` preserves the existing wallet ordering, install links, network labels, Shelby mark, outside-click close behavior, and theme toggle semantics.
- `AppRuntime.tsx` no longer defines `ThemeToggle`, `NetworkSwitch`, or `WalletControl`; the composition root is now 959 lines.
- Final theme-toggle handler verification, build, and route smoke checks passed after the extraction. Landing files remain unchanged.

## Continued 10 August 2026 - Phase 5 Form and Status Primitives

- Added `src/components/workspace/FormField.tsx` and migrated Publish/Profile metadata fields without changing the existing grid selectors or input behavior.
- Added `src/components/workspace/StatusPill.tsx` and migrated Activity transaction status rendering while preserving the existing transaction status classes and verification labels.
- Added workspace-scoped status dot tokens for neutral, positive, warning, and danger states.
- `npm.cmd run build` passed after this markup extraction; landing files remain untouched.

## Next Product Work

- Capture and review dark/light screenshots from Vercel after the editorial landing redeploy.
- Verify the route diagram at 320 px, 768 px, 1440 px, and wide desktop viewports.
- Capture every workspace route at 320 px, 768 px, 1440 px, and wide desktop after deployment.
- Validate long creator names, wallet addresses, blob names, and transaction errors against the new row layouts.
- Review all empty/loading/error states.
- Confirm the new responsive workspace shell on real mobile dimensions.
- Test publish progress messages under slow transaction conditions.
- Confirm profile avatar, creator page, and public media page stay in sync after refresh.
- Improve buyer-facing language in Discover and media pages if it still feels technical.
- Run direct smoke checks for `/creator/:owner` and `/media/:owner/:blob` with a known test record after the next deployment.
- Extract the next shared UI boundary only after recording current selector and state contracts; do not fold visual redesign into the structural refactor.

## Completed 9 August 2026

- Reworked the shared workspace composition without changing the landing page.
- Added a dark navigation anchor for both themes and removed the pale sidebar treatment.
- Expanded the workspace canvas for wide desktop viewports and reduced unused side margins.
- Rebalanced Vault, Analytics, Library, and Activity into compact headers, framed data rails, command bars, and smaller empty states.
- Rebuilt Publish and Profile around a wider primary task column and a 320-340 px contextual rail.
- Reorganized Discover search/feed, Network route readiness, transaction filters, record lists, and operational banners into one consistent hierarchy.
- Replaced oversized pill controls and random floating blocks with stable 5-6 px surfaces and explicit states.
- Refined workspace copy for Vault, Publish, Analytics, Discover, Library, Network, Profile, and Activity.
- Verified balanced CSS braces, clean whitespace checks, and a successful TypeScript plus Vite production build.
- Captured production screenshots for Vault and Publish at 1600 x 1000 and confirmed the new width, hierarchy, and column balance.
- Confirmed the new workspace refinement contains no landing selector and that landing files have no diff.
- Full eight-route and mobile screenshot capture remains pending because the local Chrome headless process stopped during the QA batch.
- Fixed the light-mode sidebar specificity conflict that rendered navigation and branding against a light background.
- Added explicit high-contrast light-mode states for primary, secondary, ghost, icon, network, wallet, and disabled controls.
- Fixed Profile and Publish panel geometry changing on hover because legacy `.panel:hover` rules overrode their frame and padding.
- Locked Profile, Publish, and the final profile card across default, hover, and focus-within states.
- Verified light-mode Vault, Profile, and Publish with production-sized 1600 x 1000 Chrome screenshots.
- Removed the remaining legacy light-panel tint from Vault and the other workspace route canvases.
- Removed the temporary light-theme QA route after visual verification.
- Pushed workspace theme, contrast, and stable-layout refinements to `origin/main` in commit `b0ed505`.
- Removed the decorative buyer-proof confirmation from the landing route visual, including its orphaned responsive and motion CSS.
- Replaced the Vault search input's yellow double focus outline with one restrained neutral focus boundary.
- Pushed the buyer-proof removal and neutral Vault search focus treatment to `origin/main` in commit `3ccafeb`.
- Extended the neutral search focus treatment to Discover and every workspace search field.
- Reduced desktop density for Activity summary, active Network route, funding helper, Profile summary/actions, and registry banners.
- Removed the legacy dark SVG tile from the Vault Publish button so its icon stays legible in dark mode.
- Replaced the network selector's generic route SVG with the bundled official Shelby image and removed the orphaned SVG styles.
- Pushed the desktop density, neutral search focus, Publish icon, and Shelby selector branding pass to `origin/main` in commit `1ad1252`.
- Prevented the workspace page minimum height from stretching the buyer receipt, creator registry, funding helper, and active route blocks into oversized empty panels.
- Normalized those blocks with consistent title/body weights, readable line-height, controlled paragraph widths, and first-line icon alignment.
- Kept the landing page untouched and confirmed the production build remains passing.
- Pushed the typography and compact-panel fix to `origin/main` in commit `bf09757` (`Refine workspace information block typography`).

## Completed 9 August 2026 - Transaction Cache Revalidation

- Added fullnode transaction verification for the wallet-scoped Activity view.
- Existing cached transaction records now start in a checking state instead of being presented as confirmed immediately.
- A live fullnode success, pending response, or failed execution updates the record from current chain state.
- A definitive 404/410 removes the stale transaction from `payby-transaction-history-v1`.
- The same definitive reset signal clears the affected wallet/network's local Activity events so old `METADATA` and `UPLOAD` rows do not survive a wipe as if they were current proof.
- 429, 5xx, authentication, CORS, and network failures preserve the record as cached and explicitly warn that it is not current chain proof.
- Added an accessible `Refresh proof` action and verification status copy to Activity.
- Fullnode polling now sends the configured network API key, matching marketplace view requests.
- `npm.cmd run build` and `git diff --check` passed. Landing files were not changed.

## Technical Readiness

- Keep `npm run build` passing.
- Keep Vercel deploy passing.
- Reduce the oversized AppRuntime production chunk.
- Avoid adding backend services unless they are explicitly needed.
- Keep Move registry aligned with UI assumptions.
- Keep direct Shelby retrieval until Early Access opens the next integration path.

## Continued 12 August 2026 - Phase 7 Quality Gates

- Added a repeatable Node test gate with 19 tests covering route serialization, wallet/network rules, wallet-scoped history, fullnode transaction lifecycle, access policy mapping, Shelby URI resolution, and explorer links.
- `npm.cmd run test` passes.
- `npm.cmd run build` passes. The existing `AppRuntime` chunk warning remains a known performance task.
- Readiness probes now match the runtime's direct Shelby fullnode endpoint and send the configured API key without printing it.
- Readiness is intentionally not green: Shelby Testnet marketplace views are callable, but the configured Shelbynet address does not expose `payby_marketplace`. This must be fixed at deployment/configuration level before community release.
- `soul.md`, `memory.md`, `1.md`, and `docs/PAYBY_QUALITY_GATES.md` are updated with the same status.

## Continued 12 August 2026 - Shelbynet Deployment Preflight

- Confirmed the Move package compiles successfully.
- Hardened `scripts/deploy-payby-marketplace.ps1`: it requires a dedicated Payby profile or local signer file plus explicit address, refuses the existing `karya-*` and `yora-*` project profiles, uses direct Shelby, and selects the API key by network.
- Verified that the active Aptos CLI configuration does not expose the workspace-only testnet profile; the script now fails closed instead of pretending that profile can deploy.
- Confirmed the old Payby testnet account was not the Shelbynet deployer. A disposable faucet test failed with a connection refusal, and the unused key was removed.
- No publish transaction was attempted with another project's account during the pre-deployment blocker.
- Next external prerequisite is a dedicated funded Payby publisher signer. After it exists, publish and initialize the module, rerun readiness, and complete real creator/buyer E2E.

## Continued 12 August 2026 - Deployment Guard Verification

- `npm.cmd run test` passes all 19 tests.
- `npm.cmd run build` passes; the existing large `AppRuntime` chunk warning remains tracked.
- The pre-deployment `npm.cmd run check:readiness` was correctly blocked by the missing Shelbynet module; deployment verification below resolved it.
- Deploy script parsing and fail-closed checks for missing, non-Payby, and unloaded profiles pass without submitting a transaction.
- Final deploy-script pass keeps local signer paths outside repository contents and leaves no temporary keypair under `.aptos/`.

## Continued 12 August 2026 - Dedicated Publisher Signer

- Generated a fresh Payby-only Ed25519 signer locally.
- Private key remains under ignored `.aptos/`; it is not recorded in Git, docs, or chat.
- Funding is confirmed through Shelbynet indexed fungible-asset balances. Move publish can proceed with this dedicated signer.

## Continued 12 August 2026 - Funding Check Correction

- Verified the published address matches the local Payby signer.
- Shelbynet GraphQL indexed balances report `30 APT` and `0.2 SHELBY_USD` for the dedicated Payby address.
- The absent legacy APT `CoinStore` is an API data-model mismatch; it is not evidence that the address is unfunded.
- Funding is confirmed and the next action is to publish and initialize `payby_marketplace`, then rerun readiness.

## Continued 12 August 2026 - Shelbynet Deployment Complete

- Published `payby_marketplace` at `0x962ebbcf81cbc5dc0950a8ca036d54828481043f1df8960a2ec4d50fae8c3a12` with the dedicated Payby signer.
- Publish transaction finalized: `0x7f2615f639e16c11b42e7ae990edbcc66fd0c66e18e646d1cffd9f214dd60965`.
- Initialized the registry successfully with a `100000` maximum gas-unit limit after a separate `20000`-unit out-of-gas attempt.
- Initialize transaction finalized: `0x6cb19b17efc004e6c6ecb52c38c875e16c677a342ed76dc2d48e524f9779f3946`.
- Updated the local Shelbynet marketplace address to the dedicated deployment and verified all configured Move views.
- `npm.cmd run check:readiness` passes for Shelbynet and Shelby Testnet.
- Next release work is real creator/buyer wallet E2E, Shelby blob verification, paid unlock, post-wipe recovery, browser QA, and Early Access validation.

## Continued 12 August 2026 - Deployment Runtime Hardening

- Added the live public Shelbynet marketplace address as a frontend fallback so a clean Vercel build resolves the deployed contract without relying on ignored local `.env` state.
- Updated the displayed Shelbynet indexer endpoint to the modern direct GraphQL route.
- Added a local-signer Aptos TypeScript SDK deployment path because the Aptos CLI transport intermittently refused the direct Shelbynet HTTP connection; profile-based CLI deployment remains supported.
- `node --check scripts/deploy-payby-marketplace.mjs`, `npm.cmd run test`, `npm.cmd run build`, `npm.cmd run check:readiness`, and `git diff --check` pass.
- Landing boundary remains unchanged. Do not push these changes until explicitly requested.

## Continued 10 August 2026 - Phase 6 CSS Ownership

- Extracted workspace/public design tokens and theme variables to `src/workspace-tokens.css`.
- Split the ordered workspace cascade into `workspace-base.css`, `workspace-elements.css`, `workspace-components.css`, `workspace-responsive.css`, `workspace-foundation.css`, `workspace-composition.css`, and `workspace-states.css`.
- Kept `src/workspace.css` as the single import boundary so the original cascade order remains explicit and reviewable.
- Kept landing ownership isolated. `src/landing.css`, `src/main.tsx`, the landing screenshot asset, and `public/payby-icon.svg` have no diff.
- `npm.cmd run build` passed twice after the CSS split; the existing `AppRuntime` chunk warning remains unchanged.
- Preview smoke checks returned HTTP 200 for `/`, all eight workspace routes, `/creator/0x1`, and `/media/0x1/sample.png`.
- All CSS partials have balanced braces and `git diff --check` reports no whitespace errors.
- Historical selector deduplication and dark/light multi-viewport screenshot QA remain open; no selector was removed speculatively.

## Continued 10 August 2026 - Phase 6 QA and Responsive Correction

- Fixed the 320px Profile workspace overflow found during real browser inspection. The mobile sidebar now keeps its identity and horizontally scrollable navigation in one bounded row; side links use content width instead of inheriting the full row width.
- Added workspace-scoped shrink guards for the topbar, network/wallet controls, page grids, Profile, Publish, and form boundaries in `src/workspace-states.css`.
- Ran a browser QA matrix for Vault, Publish, Analytics, Discover, Library, Network, Profile, and Activity at 320, 768, 1440, and 1920px in both dark and light themes. No route reported document horizontal overflow.
- Spot-checked dark Vault at 1440px, light Profile at 1440px, and light Profile at 320px. Controls and form content remain visible and readable.
- Re-ran the workspace CSS selector audit. The only seven static candidates are dynamic transaction, verification, and status-pill state classes; none was deleted without proof.
- `npm.cmd run build` passed after the responsive correction. Landing files remain locked and unchanged.

## Deferred

- Shelby gateway/retrieval service.
- X OAuth verification.
- Contract audit.
- Formal automated browser E2E suite.
- Full Shelby Testnet validation, pending Early Access.

## Refactor Tracking - 9 August 2026

- Added `1.md` as the detailed codebase refactor tracker.
- The tracker records the current monolithic boundaries, extraction phases, CSS cleanup, quality gates, and definition of done.
- Landing page protection is an explicit guardrail in the tracker.
- No product implementation was changed in this step.

## Completed 9 August 2026 - Phase 1 Boundary Definition

- Inventoried the current `AppRuntime.tsx` responsibilities, types, hooks, helpers, and page components.
- Defined target boundaries for `app`, `domain`, `services`, `hooks`, `pages`, `components`, and `types`.
- Documented canonical data contracts and invariants in `docs/PAYBY_CODEBASE_MAP.md`.
- Documented dependency direction so page/UI code will not own fullnode, Shelby RPC, or Move function details after extraction.
- Locked the landing page as a refactor guardrail.
- `npm.cmd run build` passed after the Phase 1 mapping.

## Completed 9 August 2026 - Phase 2 Service Boundaries

- Added `src/domain/models.ts` and moved cross-page contracts out of `AppRuntime.tsx`.
- Added `src/services/aptos/fullnode.ts` for authenticated fullnode reads, transaction polling, and bounded concurrency.
- Added `src/services/aptos/wallet.ts` for wallet address extraction, network alignment, mismatch copy, and network switching.
- Added `src/services/payby/marketplace.ts` for Move view calls, owner/legacy fallbacks, listing access, purchases, sales, and creator profiles.
- Added `src/services/shelby/storage.ts` for Shelby blob paths, direct retrieval, share links, explorer links, and Shelby URI resolution.
- Added `src/services/payby/transaction-history.ts` for wallet/network scoping, live verification, reset cleanup, and cache state application.
- Added Aptos fullnode fixtures for confirmed, pending, failed, missing, gone, rate-limited, and server-error responses.
- Kept React Shelby upload/delete adapters in `AppRuntime.tsx`; their hook extraction is explicitly scheduled for Phase 3.
- `npm.cmd run build` passed after the extraction. Landing files were not changed.

## Completed 10 August 2026 - Phase 3 Persistence and Hooks

- Added `src/services/storage/local.ts` for safe typed JSON persistence and version migration support.
- Extracted metadata, creator profile, activity, pending publish, transaction history, and purchase receipt hooks into `src/hooks/`.
- Kept all existing localStorage keys and raw formats compatible with current browser sessions.
- Kept transaction validation, reset cleanup, and wallet/network scoping intact after moving the React lifecycle code.
- Kept the buyer on-chain purchase index loader in application composition because it combines Move reads with committed Shelby metadata retrieval.
- `npm.cmd run build` passed after the hook extraction. Landing files were not changed.

## Publish Error Repair - 12 August 2026

- [x] Identify the live failure: the old Shelby query requested `blob_name`/`is_written` from a schema that now exposes `object_name`/`is_committed`.
- [x] Upgrade `@shelby-protocol/sdk` to `0.7.0` and `@shelby-protocol/react` to `4.1.0`.
- [x] Migrate metadata and delete hooks to the current SDK API.
- [x] Point the runtime client at the direct Shelbynet GraphQL indexer and preserve the configured RPC endpoint.
- [x] Add a fail-closed Testnet state because the current SDK explicitly marks Shelby Testnet retired.
- [x] Verify the current SDK query against Shelbynet: HTTP 200, no GraphQL error, zero rows for the dedicated publisher address.
- [x] Run `npm.cmd run build`, `npm.cmd run test`, and `git diff --check`.
- [ ] Perform a real browser publish with a funded wallet and verify registration, Shelby chunk upload, commit prompts, and metadata registry finality.
- [x] Re-run `npm.cmd run check:readiness`; Shelbynet and the configured Aptos Testnet marketplace views remain callable.

## Blank Screen Runtime Recovery - 12 August 2026

- [x] Trace the browser failure to the stale Vite prebundle missing `useDeleteObjects`.
- [x] Verify the installed React package and its public entry export `useDeleteObjects` and `useFullObjectMetadata`.
- [x] Clear the generated `node_modules/.vite` dependency cache within the workspace.
- [x] Restart Vite on `127.0.0.1:5173` with forced dependency optimization.
- [x] Verify the fresh prebundle exports the current Shelby React hooks.
- [x] Verify `/app/vault` and `WorkspacePage.tsx` return HTTP 200 from the restarted server.
- [x] Re-run build, deterministic tests, and landing-boundary verification.
- [ ] Complete real browser wallet publish E2E; this remains independent of the resolved blank-screen failure.

## Shelby Registration Location Fix - 12 August 2026

- [x] Verify the live Shelbynet location names through the installed Shelby SDK.
- [x] Configure the Shelbynet client with the live `shelbynet-1` location hint.
- [x] Pass the location hint explicitly into the wallet upload mutation.
- [x] Add a regression test for the `register_multiple_blobs` location argument.
- [x] Run 20 deterministic tests and the production build.
- [x] Restart Vite with the corrected runtime bundle on `127.0.0.1:5173`.
- [ ] Retry a real funded publish after refreshing the browser and reconnecting Petra.
- [ ] Verify the subsequent Shelby storage upload, commit transaction, registry write, and retrieval.

## Petra Registry Prompt Repair - 12 August 2026

- [x] Add explicit `typeArguments: []` to all Payby entry-function wallet transactions.
- [x] Normalize Shelby signer payloads at the wallet boundary before forwarding them to Petra.
- [x] Stop marking publish complete before the Aptos access registry reaches finality.
- [x] Validate metadata commitments and missing transaction hashes before reporting success.
- [x] Mark a registry transaction failed when finality polling fails after a hash was returned.
- [x] Add a regression test for non-generic entry-function payload normalization.
- [x] Pass 22 tests, production build, and whitespace validation.
- [ ] Retry a funded publish in Petra and verify Shelby storage plus registry finality end to end.

## Petra Chain-ID Mismatch Diagnosis - 12 August 2026

- [x] Verify the live Shelbynet fullnode reports chain ID `118`.
- [x] Verify the installed Petra `2.5.0` Shelbynet profile reports chain ID `59`.
- [x] Simulate the deployed registry function against live chain `118`; the endpoint returns a normal Aptos VM response.
- [x] Simulate the same transaction with chain ID `59`; the fullnode returns `BAD_CHAIN_ID`.
- [x] Confirm Petra's raw sign flow still performs wallet-side simulation, so raw signing does not bypass this blocker.
- [x] Build Payby registry transactions with `Network.SHELBYNET`, not `Network.CUSTOM`.
- [x] Add a chain-ID preflight before Shelby upload and before registry retry; mismatches no longer open a doomed Petra prompt.
- [x] Add a regression test for wallet chain-ID extraction and the actionable mismatch message.
- [ ] Update Petra or configure a wallet network profile that reports live Shelbynet chain ID `118`.
- [ ] Retry a funded browser publish and verify sign, submit, finality, and retrieval end to end.

## Repository Documentation Refresh - 12 August 2026

- [x] Rewrite `README.md` around the implemented Shelby and Aptos architecture.
- [x] Document the real application routes, Move entry/view functions, network endpoints, environment variables, and repository layout.
- [x] Separate implemented behavior from funded wallet E2E and Early Access release gates.
- [x] Document security boundaries, cache limitations, deployment workflow, and contribution checks.
- [ ] Keep README status current after the first successful funded creator and buyer E2E run.

## Payment Asset and Profile Isolation - 12 August 2026

- [x] Separate Shelbynet APT and ShelbyUSD metadata configuration so ShelbyUSD cannot fall back to APT.
- [x] Use the documented Shelbynet ShelbyUSD metadata object in the route configuration and `.env.example`.
- [x] Derive currency from on-chain `payment_metadata` when recovering listings.
- [x] Stop paid unlock before Petra when listing metadata and on-chain payment asset disagree.
- [x] Scope creator profile drafts by network and connected wallet address.
- [x] Clear stale chain profile state and reset the profile page when wallet or network changes.
- [x] Prevent public creator/media fallback UI from showing the connected wallet's profile for another owner.
- [x] Add regression coverage for ShelbyUSD asset matching and wallet/network profile keys.
- [x] Verify 28 deterministic tests, production build, and landing-file boundary.
- [x] Remove the outdated landing-page screenshot from the GitHub README without changing the live landing page.
- [ ] Re-publish any existing listing that was originally registered with the wrong payment asset; the old on-chain listing cannot be changed by frontend code without a new registry transaction.
- [ ] Complete a live two-wallet ShelbyUSD creator/buyer E2E and verify the buyer balance delta is ShelbyUSD, with APT changing only by gas.

## Shelby Route Identity - 12 August 2026

- [x] Replace the generic shield in the landing network ledger's current-route row with the existing Shelby logo asset.
- [x] Verify the production build.
- [x] Push the focused update to `main`.
