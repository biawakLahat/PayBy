# Payby Soul

Payby is a Web3-native creator media vault for Shelby storage and Aptos/Shelbynet access records.

The product goal is not a demo. Payby should feel like a serious, production-minded dApp that creators and buyers can trust during Shelby community testing and Early Access evaluation.

## Product Identity

- Payby helps creators publish media to Shelby.
- Payby records listing, access policy, purchase proof, revenue, and creator profile state through Aptos-compatible wallets.
- Payby keeps buyer and creator data scoped to the connected wallet.
- Payby should feel clean, smooth, responsive, mature, and premium.
- Payby should avoid mock/demo language unless a feature is explicitly unfinished.

## Core Principle

On-chain state is the source of truth where it matters.

Local browser storage may only be used as a recovery/cache layer for user experience. It must not become the canonical source for ownership, access, purchases, creator identity, or revenue.

On-chain data structures must also fit the behavior of the active network. Owner and blob isolation must use flat composite table keys on Shelbynet; nested table values are prohibited because the live simulator can time out before a wallet can approve the transaction.

Registry writes must be resumable. Listing policy and metadata commitment are separate idempotent transactions, and the UI must never report publish success until both have reached Aptos finality.

## Current Direction

- Gateway is intentionally removed/deferred until Shelby Early Access is granted.
- Direct Shelby retrieval is acceptable for the current community beta phase.
- Move registry remains the durable proof layer.
- Shelby Testnet validation depends on Early Access.
- Shelbynet is the current live testing route.

## Quality Bar

Payby should feel:

- Web3-native.
- Community-ready.
- Smooth and responsive.
- Visually polished without excessive effects.
- Clear during slow wallet/Shelby/Aptos operations.
- Serious enough for Shelby Early Access review.

## Flagship Interface Standard

- Workspace screens prioritize scanability, hierarchy, and fast repeated actions.
- The interface uses one primary surface level per page and avoids nested-card clutter.
- Motion communicates navigation and transaction state without blur-heavy transitions.
- Dark and light themes share the same information hierarchy and interaction quality.
- Visual polish must never obscure wallet, network, storage, or on-chain status.
- Related metrics should read as one data rail, not a collection of competing cards.
- Payby uses one signature route transition and restrained control feedback instead of decorative motion everywhere.
- Motion must preserve immediate input response and never make navigation feel slower.
- Product surfaces stay neutral and quiet; gold and teal are reserved for hierarchy, action, and state.
- Workspace pages use flat sections, separators, and data rails instead of decorative card matrices.
- Every page has one clear title, one primary task, and one dominant action.
- Support information belongs in a quiet side rail or progressive disclosure, never nested cards.
- Empty, loading, error, and wallet states use semantic icons and direct recovery copy.
- Route-specific layouts must remain distinct: forms for publishing, ledgers for networks, rows for records, and identity composition for profiles.
- Route summaries must reflect the page's actual job; do not repeat sales, network, or registry metrics where a dedicated page already owns them.
- A page may use one dominant metric with secondary facts, but must not default to an equal-card dashboard matrix.
- Technical configuration belongs behind progressive disclosure unless it directly blocks the current task.
- Repeated media and creator objects may use compact cards; page sections and operational status should remain unframed.
- The workspace uses a dark navigation anchor in both themes so route ownership stays clear against the working canvas.
- Wide desktop layouts must use the available workspace width; arbitrary narrow centered columns are prohibited.
- Page headers must be compact and must not become tall decorative slabs.
- Empty states must remain subordinate to the page task and must not consume most of the first viewport.
- Publish and Profile use a primary work column with a concise contextual rail; the rail must never overpower the task.
- Interactive states must never change a panel's geometry, padding, border, or column structure.
- Disabled controls must remain visibly present and legible in both themes while still reading as unavailable.
- Light mode keeps the same dark navigation anchor and must never render light navigation text on a light sidebar.
- Workspace route canvases must not inherit legacy card fills, gradients, or hover styling intended for nested panels.
- Trust and proof labels must appear only where they help a user make a decision; decorative confirmation callouts should be removed.
- Keyboard focus must stay visible without using loud accent rings that compete with the active task.
- Wide desktop workspaces must increase information density through shorter rows and tighter grouping, not oversized cards stretched across the viewport.
- Button icons must inherit the command's foreground color and must not introduce a separate dark tile unless that tile communicates state.
- Network identity controls must use the official Shelby visual mark instead of an invented route glyph.
- Compact operational banners must size to their content instead of stretching with the page minimum height.
- Banner titles must use a clear interface weight, while explanatory copy must use a calmer readable weight and a controlled line length.
- Icons in operational banners must align with the first text line; route and funding summaries must keep their label, value, and description rhythm consistent.
- Activity history must never present a browser cache entry as current chain proof without checking its transaction hash against the active fullnode.
- A definitive fullnode 404/410 must remove the matching cached transaction; rate limits, authentication errors, and network failures must preserve the record but label it as unverified cache.
- When a definitive reset is detected, wallet-scoped local activity events for that network must be invalidated with the transaction cache; local UI history is never allowed to masquerade as post-reset chain state.
- Shelbynet resets must not be simulated with an age-based purge because the network's reset timing is not a reliable record-level signal.
- The codebase must keep UI composition, React lifecycle, domain rules, and chain/storage I/O in separate dependency layers.
- Architecture work must happen in small, build-verified slices; a refactor must not be combined with an unrelated visual redesign.
- Shared data contracts belong in a dependency-light domain module; Aptos, Shelby, Move, and cache rules belong in services that can be verified without rendering React.
- React SDK hooks remain lifecycle adapters and must not be disguised as generic services; extract them only when their ownership and cleanup behavior are explicit.
- Browser persistence must be accessed through typed, fault-tolerant helpers; existing cache keys and formats must remain backward compatible during refactors.
- A hook may coordinate cache recovery, but it must expose wallet- and network-scoped state and must never present browser cache as canonical chain state.
- Browser history, URL parsing, scroll reset, and route transition policy belong to the application router, not to individual page components.
- Workspace pages must receive chain/storage behavior through typed props or service-backed hooks; a page must not rebuild endpoint URLs or Move function IDs.
- A page extraction is only complete when the application renders the new module and the old inline page definition is removed or explicitly scheduled for cleanup.

## Landing Page Standard

- The first viewport explains the real Payby route before showing supporting product detail.
- The landing page uses one clear sequence: creator file, Shelby storage, Aptos policy, and buyer wallet proof.
- Use the official Shelby and Aptos marks when naming either network.
- Avoid faux 3D vaults, floating glass labels, decorative dashboards, generic badge rows, and repeated feature cards.
- Sections should read as an editorial product narrative with strong type, rules, ledgers, and deliberate whitespace.
- Motion is limited to a single entrance sequence and scroll reveals that support reading order.
- Product copy must describe implemented behavior directly and avoid inflated marketing language.
- Workspace redesigns must not change landing markup or landing styles unless the user explicitly requests it.

## Product Surfaces

- Landing page.
- Creator workspace.
- Vault.
- Publish.
- Analytics.
- Discover.
- Buyer Library.
- Network routes.
- Creator Profile.
- Activity.
- Public media page.
- Public creator page.

## Non-Negotiables

- Do not reintroduce a gateway before the user asks for it.
- Do not shift canonical product state to Supabase or a centralized database.
- Do not make UI feel like a demo, template, or AI-generated dashboard.
- Do not mix activity, vault, purchases, or analytics across wallets.
- Keep Shelby and Aptos integration claims honest.
- Preserve user/local uncommitted files unless explicitly asked.
- Product commits should include only dApp-facing changes unless the user explicitly asks to publish planning or memory notes.
- After every requested push, verify that `origin/main` tracks the committed product HEAD before reporting completion.
- Current verified product release anchor: `bf09757` on `origin/main`.

## Completed 10 August 2026 - Phase 4 Router and Workspace Page Boundaries

- Added `src/app/router.ts` for route parsing, browser history, scroll reset, reduced-motion behavior, and View Transition coordination.
- Added workspace page modules for Analytics, Discover, Library, Network, and Activity.
- Added shared `EmptyState` and `PaginationControls` components without changing their visual contract.
- Added `src/utils/formatters.ts` for wallet, media, access-mode, asset, and pagination formatting.
- Updated `AppRuntime.tsx` to render the extracted pages through typed props and callbacks.
- Kept Vault, Publish, Profile, public pages, and the landing boundary unchanged in behavior; landing files were not edited.
- `npm.cmd run build` and `git diff --check` passed after the extraction slice.

## Completed 10 August 2026 - Phase 4 Workspace Boundaries Continued

- Added `src/pages/workspace/VaultPage.tsx` and removed the inline VaultList and PendingPublishQueue definitions from `AppRuntime.tsx`.
- Added `src/pages/workspace/ProfilePage.tsx` and removed the inline avatar preparation and ProfilePanel definitions from `AppRuntime.tsx`.
- Added `src/pages/workspace/WorkspacePage.tsx` for the shared sidebar, topbar, route title, and page transition boundary.
- The application renders the new Vault, Profile, and shell modules through typed props; page-specific chain/storage callbacks remain explicit at the composition root.
- `AppRuntime.tsx` is now approximately 3,884 lines. Publish, media detail, public pages, and helper cleanup remain the next boundary slice.
- Landing markup and styles remain untouched. `npm.cmd run build` passed after this slice.
- Final smoke check returned HTTP 200 for the landing route and every extracted workspace route.

## Completed 10 August 2026 - Phase 4 Public and Media Boundaries

- Publish, media detail, public creator, and public media are now dedicated page modules rather than inline sections of `AppRuntime.tsx`.
- Public media still owns the complete Web3 flow: read the Aptos listing, verify wallet access, submit paid unlock when required, wait for confirmation, persist a wallet-scoped receipt, and retrieve the blob directly from Shelby.
- Public creator pages recover active listings and committed metadata through typed callbacks; browser metadata remains a recovery layer, never the canonical source.
- `MediaPreview` and `PurchaseReceiptCard` are shared components, so media rendering and purchase proof do not diverge between public and workspace views.
- `AppRuntime.tsx` now measures approximately 1,184 lines and is limited to provider/runtime composition, wallet and network state, service callbacks, and page wiring.
- Dead page helpers and unused runtime imports were removed after the extracted modules passed typecheck; metadata payload verification and buyer-index composition remain explicit runtime responsibilities until their next service boundary.
- The landing page remains a locked boundary and was not edited.
- `npm.cmd run build` passed after this extraction. The large runtime chunk warning is known and remains a Phase 5 performance task.

## Completed 10 August 2026 - Phase 5 UI and Route Loading Boundaries

- Added `src/components/workspace/PageHeader.tsx`, `Button.tsx`, and `IconButton.tsx` as small, typed UI boundaries that preserve the existing workspace visual contract.
- Workspace page headers now share one semantic composition; migrated action controls use the shared button primitives where their existing behavior and styling match.
- Workspace and public pages now load through route-level `React.lazy` boundaries with an explicit operational loading state. The workspace shell remains synchronous so navigation chrome is stable.
- The build emits dedicated page chunks, while `AppRuntime.tsx` remains approximately 1,218 lines because providers, wallet state, and shared cross-route callbacks still belong at the composition root.
- `npm.cmd run build`, route smoke checks, and `git diff --check` passed. The landing page files remain untouched.

## Current Refactor Priority

- Finish shared form and status primitives with explicit keyboard, loading, error, and disabled contracts.
- Consolidate workspace CSS only after component ownership is clear; do not solve cascade issues with broad overrides.
- Continue provider/service extraction to reduce the remaining main runtime chunk.

## Continued 12 August 2026 - Quality Gate Discipline

- Payby now has a deterministic test gate for route paths, wallet/network alignment, wallet-scoped activity, transaction lifecycle, access policy mapping, and Shelby URLs.
- Never report Shelbynet marketplace readiness from configuration alone. The contract module must be callable on the selected route.
- Before deployment, evidence was split honestly: build and 19 unit tests passed while the old Shelbynet address was blocked. The dedicated deployment verification below is now the current chain evidence.
- Real creator and buyer wallet E2E remains a release requirement, not a simulated checkbox.
- Never deploy Payby Move with an account belonging to another project. A dedicated publisher profile is required, and its private key must remain outside the repository and chat.

## Continued 12 August 2026 - Deployment Boundary

- A package compile is not a Shelbynet deployment. This gate was cleared only after `payby_marketplace` became callable at the dedicated Shelbynet address.
- The deploy script must fail closed when the Aptos CLI cannot load the requested profile, even if a similarly named config exists elsewhere in the workspace.
- A local signer-file option is acceptable only when the file remains outside Git and chat; never request or paste a private key into the project conversation.
- Do not use Karya, Yora, or any other project's account to make Payby appear deployed.

## Continued 12 August 2026 - Verified Boundary

- Passing tests and a successful build prove code health, not chain deployment.
- A non-zero readiness check was the correct result before deployment; the current readiness result is green after the module deployment.
- The deployment script must stop before chain interaction when the signer is missing, belongs to another project, or is not loaded by Aptos CLI.
- Temporary funding keys must be removed after a failed setup attempt; the repository must retain no signer material.

## Continued 12 August 2026 - Dedicated Publisher

- Payby deploys with a fresh Payby-only signer, never an account borrowed from another project.
- The private key stays local and ignored; only the public address may be shared for funding.
- Funding confirmation is a hard gate before any Move publish or initialize transaction, and is now satisfied through indexed Shelbynet balances.

## Continued 12 August 2026 - Funding Truth Correction

- Verify publisher funding against the Shelbynet indexed fungible-asset balance endpoint, not only the legacy `CoinStore` resource.
- The dedicated Payby address is confirmed funded with `30 APT` and `0.2 SHELBY_USD` through Shelbynet GraphQL.
- A missing legacy `CoinStore` is not a zero-balance result for modern fungible assets.
- The hard gate now moves to publish, initialize, and post-deployment readiness verification.

## Continued 12 August 2026 - Shelbynet Deployment

- Payby `payby_marketplace` is live at the dedicated address `0x962ebbcf81cbc5dc0950a8ca036d54828481043f1df8960a2ec4d50fae8c3a12`.
- Publish and initialize both finalized successfully; the first initialize attempt was transparently recorded as out of gas and retried with an adequate limit.
- Readiness is green for Shelbynet and Shelby Testnet. Do not call the product community-ready until real creator/buyer E2E and Shelby retrieval checks pass.

## Continued 12 August 2026 - Runtime Deployment Integrity

- Public contract configuration must resolve to the deployed Payby address in a clean production build, while environment variables may still override it for a future redeploy.
- Local signer deployment uses the Aptos TypeScript SDK when the Aptos CLI transport is incompatible with the direct Shelbynet endpoint; this does not introduce a gateway or mock transaction path.
- A green readiness check confirms callable Move views, not a completed community release. Real two-wallet Shelby and buyer flows remain mandatory.

## Continued 10 August 2026 - Form and Status Boundaries

- Added `FormField` and migrated Publish/Profile fields while preserving the existing `.metadata-form` and `.access-grid` CSS contracts.
- Added `StatusPill` and migrated Activity transaction labels while preserving wallet-scoped verification and transaction state semantics.
- Status dots now have explicit neutral, positive, warning, and danger tokens inside workspace scope.
- `npm.cmd run build` passed after the extraction. This is a structural extraction only; landing markup and styles remain locked.

## Continued 10 August 2026 - Workspace Control Boundary

- Added `WorkspaceControls` for the shared theme toggle, Shelby network switcher, and Aptos wallet chooser.
- Preserved wallet ordering, install links, network labels, Shelby branding, outside-click behavior, and connect/disconnect semantics.
- `AppRuntime.tsx` is now approximately 959 lines and no longer owns those control implementations.
- Final theme-toggle handler, build, route smoke checks, and landing-boundary verification passed. No landing markup or style was changed.

## Continued 10 August 2026 - CSS Ownership Boundary

- Workspace/public tokens now live in `src/workspace-tokens.css`; landing tokens remain owned by `landing.css`.
- `src/workspace.css` is now an explicit import boundary for ordered CSS partials rather than a 6,000+ line owner.
- Core shell, shared elements, page components, responsive rules, foundation guards, composition refinement, and stable interaction states each have a named partial.
- The split preserves cascade order and does not remove legacy selectors before screenshot comparison proves they are unused.
- Build, HTTP route smoke, brace balance, whitespace check, and landing lock verification passed.
- Visual dark/light and multi-viewport QA remains an explicit gate; never report it as complete without evidence.

## Completed 10 August 2026 - Phase 6 Visual QA and Responsive Boundary

- The 320px Profile issue was real: the mobile sidebar had a fixed compact height while the navigation still occupied a second layout row, and side links inherited the old full-width rule.
- The workspace state layer now keeps mobile sidebar navigation bounded and horizontally scrollable, resets side-link width to content size, and prevents topbar, form, Profile, and Publish grids from retaining desktop min-content widths.
- Browser QA covered all eight workspace routes in dark and light themes at 320, 768, 1440, and 1920px. The document stayed within the viewport at every checked combination.
- Dark Vault and light Profile were visually inspected at desktop size; light Profile was also inspected at 320px. No landing selector, asset, or markup was changed.
- Selector audit found only dynamic transaction, verification, and status-pill classes without literal source tokens. They remain because runtime state creates them.

## Continued 12 August 2026 - Shelby SDK Schema Repair

- Migrated the workspace from the retired Shelby React/SDK blob APIs to the current SDK 0.7 API: `useFullObjectMetadata`, `useDeleteObjects`, and `FullObjectMetadata`.
- Configured the Shelbynet client with the direct modern GraphQL indexer schema, so vault reads no longer send the removed `blob_name` or `is_written` fields.
- Verified the same account-blob query through the installed SDK against Shelbynet; it returned HTTP 200 with no GraphQL validation error.
- Shelby Testnet is fail-closed in the UI because SDK 0.7 marks that route retired. Payby never casts it into a Shelbynet client or sends a wallet transaction on that route.
- Build, 19 deterministic tests, and `git diff --check` pass. Landing files remain locked.

## Continued 12 August 2026 - Runtime Blank Screen Recovery

- The blank workspace was caused by a stale Vite dependency prebundle, not by Shelby, wallet state, or the Move contract.
- The stale prebundle still exposed retired names such as `useBlobMetadata` and `useDeleteBlob`, while the installed `@shelby-protocol/react@4.1.0` exposes `useFullObjectMetadata` and `useDeleteObjects`.
- Cleared only the generated `node_modules/.vite` cache and restarted Payby Vite on `127.0.0.1:5173` with forced dependency optimization.
- Fresh Vite output now exposes the required Shelby React exports. `/app/vault` and `WorkspacePage.tsx` both return HTTP 200 from the restarted server.
- Build and all 19 deterministic tests pass after recovery. Landing files remain unchanged.
- A real wallet publish E2E remains a separate release gate; the blank-screen module failure is resolved.

## Continued 12 August 2026 - Shelby Registration Location Fix

- The Petra simulation error `The account has no preference set and the write supplied no location input` was caused by the registration payload carrying neither a selected location nor a location hint.
- Queried the live Shelbynet metadata endpoint with the installed Shelby SDK and confirmed the resolvable location is `shelbynet-1`.
- Added `locationHint` to the Shelbynet client configuration and passed the same value explicitly through Payby's `useUploadBlobs` mutation.
- Added a regression test that inspects the generated `register_multiple_blobs` payload and fails if the location argument becomes empty again.
- Build and 20 deterministic tests pass. A funded wallet-backed publish remains required to verify the complete register, store, and commit sequence.

## Continued 12 August 2026 - Petra Registry Prompt Repair

- The publish screen was incorrectly showing `Publish complete` immediately after Shelby storage, while the Aptos access-registry transaction was still waiting for Petra approval.
- Entry-function payloads now always include `typeArguments: []`; the wallet boundary also normalizes Shelby-generated payloads before forwarding them to Petra.
- Publish completion is now emitted only after every access-registry transaction returns a hash and reaches Aptos finality. A registry failure stays visible as an actionable retry state.
- Metadata URI and hash commitments are validated before opening the registry wallet prompt, and a missing transaction hash is treated as a failure instead of a false success.
- Added a wallet regression test. Verification now passes with 22 deterministic tests, the production build, and `git diff --check`. Landing files remain locked.
- A real Petra retry is still required to confirm the live wallet simulator accepts the corrected payload on Shelbynet.
- Registry hashes that fail during finality polling are now marked failed in Activity so the retry state cannot leave a misleading pending transaction behind.

## Continued 12 August 2026 - Petra Chain-ID Mismatch Diagnosis

- The live Shelbynet fullnode reports chain ID `118`, while the installed Petra `2.5.0` native Shelbynet profile reports `59`.
- Direct Aptos SDK probes show the deployed registry function and its arguments are valid on chain `118`; the same transaction signed with chain `59` is rejected as `BAD_CHAIN_ID`.
- Petra's raw sign-only route still performs its own simulation, so the earlier claim that raw signing bypassed Petra simulation was incorrect and has been corrected in the tracking files.
- Payby now uses `Network.SHELBYNET` for transaction construction and performs a live chain-ID preflight before upload and registry retry. A mismatch stops the flow before opening Petra.
- The remaining gate is external: Petra must be updated or configured with a wallet network profile that reports Shelbynet chain ID `118`, then the funded end-to-end publish must be retried.

## Continued 12 August 2026 - Repository Documentation Refresh

- README is now written as an implementation and review document rather than a feature list: it explains the product model, canonical data boundaries, Shelby/Aptos integration, route map, Move surface, setup, deployment, security, and release gates.
- The documentation distinguishes verified implementation from unverified wallet E2E and Early Access work, and preserves the landing-page boundary.

## Continued 12 August 2026 - Payment Asset and Wallet Identity Isolation

- Treat payment currency as an on-chain contract invariant: APT and ShelbyUSD must resolve to separate metadata addresses on every supported route.
- Never let a missing ShelbyUSD configuration fall back to the generic APT metadata address. A mismatched listing must stop the buyer flow before a wallet prompt.
- Treat creator profile drafts as wallet- and network-scoped recovery data. A connected wallet must never display another wallet's local profile while its on-chain profile is loading.
- The landing page remains outside this change boundary.
- The README must not present an outdated product screenshot; its old landing image embed was removed while the live landing implementation and asset remained untouched.

## Continued 12 August 2026 - Shelby Route Identity

- Network status must use the real Shelby brand mark instead of a generic security symbol when the active route is Shelbynet.
- Reuse the existing Shelby asset so route identity remains visually consistent across the landing infrastructure ledger and workspace controls.
