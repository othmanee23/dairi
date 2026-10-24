# DAIRI Pre-Staging Technical Audit

**Audit date:** 2026-10-24  
**Target:** local DAIRI repository and local Supabase configuration  
**Mode:** read-only application, database, and infrastructure audit; only this audit documentation is being created.  
**Decision:** **NO-GO for staging deployment and client UAT invitation** until the blockers in `RELEASE_DECISION.md` are resolved.

## Executive summary

DAIRI is a React/Vite storefront and admin application backed by Supabase Auth, Postgres, Storage, row-level security (RLS), SQL security-definer functions, and a Supabase Edge Function. It creates unpaid orders and reserves inventory. No payment provider is integrated, in keeping with the current instruction to defer payment work.

The source contains meaningful server-side controls: checkout prices and stock are recomputed in SQL, variant rows are locked during checkout, admin operations check the profile role, and customer order reads are scoped to the signed-in user. The local production build, TypeScript check, and database lint passed. Prior local workflow checks recorded during this project covered auth, order placement/cancellation, wholesale approval, admin catalog operations, and tracking authorization.

That evidence does not establish staging readiness. The ignored `.env.cloud.local` contains a remote Supabase URL and publishable key, while the README says no remote project is linked; its purpose and whether it is isolated staging are not documented. Legal links resolve to generic support content, and the support page says the actual privacy and terms policies still need client approval. No automated test suite is present. Additional confirmed risks affect duplicate checkout submissions, public endpoint abuse, demo catalog fallback, transactional email delivery, and requested shipping/tax behavior.

## Application map

| Area | Implementation | Notes |
|---|---|---|
| Frontend | React 18, TypeScript, React Router 7, Vite 6, Tailwind 4 | SPA routes are declared in `src/app/routes.tsx`; Vercel rewrites requests to `index.html`. |
| Backend | Supabase Postgres, Auth, Storage, Edge Functions | Local configuration in `supabase/config.toml`; one `customer-actions` function. |
| Authentication | Supabase email/password, email confirmation, password reset | Separate customer and administrator sign-in screens. `profiles.role` is the authorization source. |
| Authorization | Postgres RLS and SQL role checks; Edge Function verifies JWT and profile role for privileged actions | Admin role values are `admin` and `customer`. No staff permission tiers. |
| Catalog | `products`, `product_variants`, `collections`, `wholesale_variant_prices` | Public reads are RLS-limited to published/visible catalog data; admin writes require admin role. |
| Orders | `orders`, `order_items`; SQL `submit_unpaid_order` and `cancel_unpaid_order` | No payment is taken. Checkout snapshots item/price details and reserves inventory. |
| File storage | Public Supabase Storage bucket `product-media` | Public read; admin-only writes; image MIME allowlist and 8 MiB object limit in initial migration. |
| Email | SQL transactional outbox and Resend dispatch in Edge Function | Queue/retry code exists. Delivery depends on a verified sender and function secrets. |
| Payments | None | No Stripe SDK, payment intent, webhook, or payment sandbox was found. Deliberately deferred. |
| Deployment | Vercel static hosting configuration | Hosting project settings, staging variables, domains, TLS, monitoring, backups, and rollback are not available from the repository. |

### Roles and core paths

- **Anonymous visitor:** browse public products and collections; submit support, newsletter, wholesale, or guest checkout actions through `customer-actions`.
- **Customer:** register, verify email, sign in, maintain a wholesale application/account, view their own linked orders, and submit checkout.
- **Approved wholesale customer:** sees wholesale variant prices and must meet the profile MOQ; server-side checkout repeats those checks.
- **Administrator:** manage products, variants, collections, lookbooks, settings, discount codes, wholesale decisions, unpaid orders, shipment tracking, and queued email retries.
- **Service role:** used only inside the Edge Function for operations that public clients cannot perform directly. It is not intended for browser use.

## Findings

Counts: **2 Blocker, 0 Critical, 6 High, 4 Medium, 0 Low.** Unverified deployment dependencies are also listed separately in `STAGING_CHECKLIST.md`.

### DAIRI-01 — BLOCKER — Staging backend isolation is not established

- **Component:** deployment configuration
- **Evidence:** `README.md` says no staging or production Supabase project is linked. An ignored local `.env.cloud.local` file is present and contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; the URL is remote rather than loopback. Its environment purpose is not documented. `.env.local` is local. Values are intentionally not reproduced here.
- **Reproduction:** inspect the sanitized environment key inventory; classify the URL host as local or remote without printing it. Compare this with the README statement.
- **Impact:** the audit cannot establish whether the remote project is staging, production, or another environment, nor whether Vercel is configured to use an isolated database. A wrong target could expose or alter real data.
- **Required action:** identify and document the remote project owner and purpose; prove a dedicated staging Supabase project, isolated storage, non-production email credentials, and separate Vercel environment variables. Do not deploy or run mutations against the unknown target.
- **Verification:** review Vercel project/environment settings and the Supabase project reference with the owner; run a staging-only read-only smoke test and confirm test data is isolated.
- **Status:** **Blocked / release gate.** No remote API was called.

### DAIRI-02 — BLOCKER — Privacy and terms destinations are not real policy pages

- **Component:** storefront footer, account registration, support
- **Evidence:** `src/app/components/store/StoreFooter.tsx:64-68,85,103-105` sends Privacy Policy, Terms, and Accessibility links to `/store/support`. `src/app/pages/auth/CustomerRegister.tsx:10` also links both legal labels to support. The support content at `src/app/pages/store/Support.tsx:36-40` explicitly says final privacy and terms policies must be supplied and approved by DAIRI.
- **Reproduction:** follow a Privacy Policy or Terms link from the footer or registration page; it opens the support/help screen, not the named policy.
- **Impact:** customers cannot review the policies they are told to accept; this undermines informed signup and the client's explicit privacy/terms requirement.
- **Required action:** client supplies and approves policy text; implement distinct, accessible policy destinations and update all links and signup language.
- **Verification:** test every policy link from desktop/mobile footer, registration, and newsletter signup; confirm the correct approved policy content loads.
- **Status:** **Confirmed.** Policy text is a client dependency; routing is an application defect.

### DAIRI-03 — HIGH — Checkout has no idempotency protection

- **Component:** guest/customer checkout and inventory reservation
- **Evidence:** `src/app/pages/store/Checkout.tsx:34-49` disables the submit button while the request is in flight, but `src/app/context/AppContext.tsx:303-310` invokes a fresh `order` action on each call. `supabase/functions/customer-actions/index.ts:191-204` calls `submit_unpaid_order` without a client idempotency key or duplicate-request record. SQL assigns a new random order number and decrements stock for every successful call.
- **Reproduction:** submit a checkout and retry the request after a timeout or lost response. Each request can create a new unpaid order and reserve the same inventory again if stock remains.
- **Impact:** duplicate orders, duplicate confirmation emails, incorrect reserved inventory, and a customer-facing uncertainty about whether an order succeeded. There is no payment risk today because payment is disabled.
- **Recommended fix:** accept a stable idempotency key per checkout attempt, persist it with a unique constraint, and return the original order for retries.
- **Verification:** replay the identical request concurrently and sequentially; assert exactly one order, one stock decrement, and one outbox event.
- **Status:** **Confirmed by code inspection; no live duplicate order was created.**

### DAIRI-04 — HIGH — Public write actions have no visible abuse controls

- **Component:** `customer-actions` Edge Function
- **Evidence:** `supabase/functions/customer-actions/index.ts:3-8,107-149,170-204` permits wildcard CORS and exposes unauthenticated newsletter, support, wholesale application, and guest order actions. Validation and payload limits exist, but no rate limit, CAPTCHA/Turnstile, per-IP throttling, or abuse queue is implemented in the repository. The function uses the service role to write these records.
- **Reproduction:** a script can repeatedly call the public POST actions with syntactically valid payloads. No application-level throttling is visible in the endpoint or migrations.
- **Impact:** spam can fill support/wholesale queues, repeatedly alter subscription state, and consume catalog stock through unpaid guest orders. CORS itself is not authentication; the risk is the lack of abuse controls on deliberately public actions.
- **Recommended fix:** add server-side rate limits and bot protection (including server-side verification), plus operational caps/alerts for public order and form volume. Keep authorization checks for admin-only actions.
- **Verification:** bounded local/staging abuse tests; confirm throttled requests do not create records or reserve stock, and ordinary users can still submit.
- **Status:** **Confirmed by source inspection; rate-limit behavior not tested in an edge environment.**

### DAIRI-05 — HIGH — Backend load failures can leave demo or stale catalog visible

- **Component:** storefront/admin data loading
- **Evidence:** `src/app/context/AppContext.tsx:75-105,131-136,156-177` initializes catalog state from the hard-coded `storeProducts` list and localStorage. When product loading errors, the code only logs the error and does not replace the existing catalog or show a blocking backend error. Seed entries are explicitly marked with `DEMO-*` styles and demo quantities in `supabase/seed.sql`.
- **Reproduction:** start with an empty browser store or previously saved catalog, make the Supabase products request fail, and open the storefront. The initial/cached state can remain rendered while the error is only in the console.
- **Impact:** the VIP client can see sample names, prices, imagery, or stale stock while believing it is the live catalog; an admin can also mistake stale browser state for saved backend state.
- **Recommended fix:** separate demo mode from connected mode; fail closed or show a clear unavailable/stale-data state when the backend is configured but catalog loading fails. Clearly label demo seed records and prevent demo credentials/content in staging.
- **Verification:** simulate failed/empty catalog reads with clean and populated localStorage; ensure no demo products are shown as live and an actionable error is displayed.
- **Status:** **Confirmed by code inspection; failure injection not run.**

### DAIRI-06 — HIGH — Order email delivery is not verified for UAT

- **Component:** transactional order confirmation and shipment email
- **Evidence:** `README.md` says delivery requires `RESEND_API_KEY` and `DAIRI_EMAIL_FROM`, and that messages remain queued if absent. `supabase/functions/customer-actions/index.ts:38-42,81-97,201-204` implements this behavior. The local workflow check previously returned a queued status without a sender. No verified domain or staging function secret was established during this audit.
- **Reproduction:** use the current local setup without Resend function secrets; create an unpaid order in a controlled local test and inspect the outbox/status. Prior project checks observed queued delivery.
- **Impact:** the client requirement for automatic order confirmations and shipment notices is not satisfied as delivered unless sender credentials and domain verification are configured. A successful order response does not mean an email reached a customer.
- **Recommended fix:** client provides/approves a sending domain and sender; configure a non-production Resend key in the isolated staging function, verify domain/DNS, and test delivery to controlled mailboxes. Preserve the queue and retry behavior.
- **Verification:** test success, provider rejection, retry/backoff, and idempotent resend in staging; verify provider logs and mailbox delivery.
- **Status:** **Local delivery blocked/unverified; staging delivery unknown.**

### DAIRI-07 — HIGH — Shipping and tax requirements are only partially implemented

- **Component:** checkout and commerce settings
- **Evidence:** `src/app/pages/settings/Settings.tsx:302-318` and `supabase/migrations/20261023000100_commerce_zones.sql` configure manual flat shipping and a manual tax percentage by country/region. The client brief asks for UPS/FedEx/USPS options, weight/dimension-based shipping and international shipping, and asks about tax where applicable. No carrier rate/label API, product weight/dimensions, jurisdiction determination, exemption handling, or tax-provider integration appears in the repository. Tracking carrier links are separate from rate shopping.
- **Reproduction:** inspect admin shipping settings and checkout: only flat destination rules or a studio quote are available; no carrier rate selection is calculated.
- **Impact:** configured values are estimates and may not represent actual postage or legally owed tax. Final client pricing/fulfillment should not rely on these values without client-approved rate and tax rules.
- **Recommended fix:** keep the current estimates explicitly labeled; obtain approved destination, shipping, tax, and international policies from the client/accountant. Decide whether to implement a carrier/tax service before paid launch.
- **Verification:** test configured and unconfigured zones, country/region precedence, discount/free-shipping thresholds, and tax basis against client-approved examples.
- **Status:** **Partial implementation confirmed; business rules/provider selection require client input.**

### DAIRI-08 — HIGH — No automated application test suite is present

- **Component:** release validation
- **Evidence:** repository search found no test/spec files and `package.json` defines only `build`, `dev`, and backend lifecycle/lint scripts; there is no test, lint, or browser-test command. Previous local checks were manual/API-oriented and do not provide a repeatable regression suite. Browser-level responsive/accessibility and real UI flow checks were not executed in this audit.
- **Reproduction:** inspect package scripts and search for test/spec files outside generated/vendor folders.
- **Impact:** critical paths can regress without detection; HTTP 200 from SPA fallback only confirms the host serves `index.html`, not that a page rendered or a workflow completed.
- **Recommended fix:** add a bounded Playwright suite for auth/role boundaries, catalog, cart, checkout validation/idempotency, order history, admin CRUD/authorization, wholesale pricing/MOQ, and error recovery. Use disposable isolated local fixtures and cleanup.
- **Verification:** run the suite on a clean local database and in isolated staging; retain reports and screenshots/traces for failures.
- **Status:** **Confirmed test-coverage gap.**

### DAIRI-09 — MEDIUM — Cancelled orders do not release discount-code redemptions

- **Component:** discounts and unpaid-order cancellation
- **Evidence:** `supabase/migrations/20261023000200_discount_codes.sql:42-47,138-147` increments `redemption_count` during successful order creation. `supabase/migrations/20261022000200_cancel_unpaid_order.sql:21-37` restores inventory and cancels the order but does not decrement the associated code's count.
- **Reproduction:** create a limited-use code, place an unpaid order using it, cancel that order, then inspect the code redemption count. The counter remains consumed.
- **Impact:** abandoned/cancelled unpaid orders can exhaust limited codes and prevent later customers from using them.
- **Recommended fix:** define whether a cancellation releases a redemption; if yes, make release transactional and idempotent, with a per-order redemption ledger rather than an unsafe counter decrement.
- **Verification:** test cancellation once and repeated cancellation, concurrent final redemptions, and orders without codes.
- **Status:** **Confirmed by migration review; no data was changed to reproduce it.**

### DAIRI-10 — MEDIUM — Customer order PII is persisted in browser localStorage

- **Component:** client-side state persistence
- **Evidence:** `src/app/context/AppContext.tsx:131-136` serializes the full app state. `LocalOrder` includes customer name, email, street address, city, postal code, and country; order state is persisted after checkout.
- **Reproduction:** place a controlled order and inspect the `dairi-local-store-v1` browser storage entry; the customer/order object is part of the serialized state.
- **Impact:** address and contact information remain on a shared or unmanaged browser after checkout/sign-out and are exposed to any same-origin script compromise.
- **Recommended fix:** do not persist customer PII in the general app cache; keep guest confirmation state minimal and short-lived, and fetch authenticated history from RLS-protected orders. Clear residual local order data on sign-out and define retention.
- **Verification:** inspect storage after guest checkout, customer sign-out, and browser restart; confirm no address/email remains beyond the documented retention behavior.
- **Status:** **Confirmed by code inspection; browser storage was not inspected in this audit.**

### DAIRI-11 — MEDIUM — Product and variant updates are multiple non-atomic requests

- **Component:** administrator product editor
- **Evidence:** `src/app/context/AppContext.tsx:226-240` writes the product row, then calls `saveProductVariants`; that helper performs separate reads/upserts/deletes for variants and wholesale prices. A later failure is thrown without rolling back the already committed product-row update or earlier variant operations.
- **Reproduction:** force a variant or wholesale-price write to fail after the product-row update; the product metadata may be saved while variant data remains partially updated.
- **Impact:** product details, SKU/stock, and wholesale pricing can diverge after a network or policy failure.
- **Recommended fix:** move the product plus variant/price persistence into one validated Postgres RPC transaction, or implement compensating rollback with verified consistency.
- **Verification:** inject failures at each write step and confirm the database is either fully updated or unchanged.
- **Status:** **Confirmed by source inspection; no write failure was induced.**

### DAIRI-12 — MEDIUM — Declared package manager cannot run on the current Node version

- **Component:** development and deployment reproducibility
- **Evidence:** `package.json:6` pins `pnpm@11.25.0`. The available runtime is Node `v22.12.0`; invoking `pnpm --version` fails because this pnpm release requires Node `v22.13` or newer. Vercel's configured build command is `pnpm run build` in `vercel.json`.
- **Reproduction:** run `node --version`, then `pnpm --version`; the latter exits with the minimum-Node error.
- **Impact:** documented install/dev and configured deploy commands cannot run in the current environment; a staging build is reproducible only if its Node runtime meets the pnpm minimum.
- **Recommended fix:** pin a supported Node version in the repository and hosting project, or use a pnpm version compatible with the agreed Node version. Add `engines` and CI checks.
- **Verification:** from a clean checkout, run frozen install, type-check, build, and database lint using the pinned toolchain.
- **Status:** **Confirmed locally; Vercel runtime setting unknown.**

## Verified positive controls

- RLS is enabled on the core tables in `20261020000100_initial_dairi_backend.sql`; customer order policies compare `user_id` with `auth.uid()`, and order-item reads join through the owning order.
- Admin-only table policies call `public.is_dairi_admin()`. The function is `SECURITY DEFINER` with an empty `search_path` and checks the profile row tied to `auth.uid()`.
- The Edge Function verifies the signed-in user's JWT and profile role before tracking/retry actions; checkout associates an account only after confirmed-email and email-match checks.
- `submit_unpaid_order` is service-role-only, recalculates price from database catalog/variant records, validates visibility/quantity/MOQ, locks variants `FOR UPDATE`, snapshots order lines, and updates inventory in the database transaction.
- Public Storage reads are intentional for product images; inserts/updates/deletes require the admin check and the bucket has a MIME allowlist/size limit.
- Customer-facing HTML email fields are escaped. Payment status is not writable through a public customer action; payment is not integrated.

These are source-level controls; they are not a substitute for staging RLS/role tests.

## Checks executed or available

| Check | Result | Evidence/limit |
|---|---|---|
| TypeScript no-emit check | **Pass** | Run with locally cached TypeScript 5.9.3 and Vite client types; no source output. |
| Production Vite build | **Pass** | Built to isolated `/tmp/dairi-audit-build`; SEO asset generation ran against that isolated output and correctly kept indexing disabled without an approved HTTPS public origin. This avoids claiming the deploy command is usable with the current pnpm runtime. |
| Supabase database lint | **Pass** | `supabase db lint --local`: no schema errors found. |
| `git diff --check` | **Pass** | No whitespace errors were reported in the current change set at audit time. |
| Local HTTP route smoke check | **Pass, routing only** | Root, auth, admin, and store paths returned HTTP 200 in the prior local check. Vite SPA fallback means this does not prove React rendering or interactive behavior. |
| Local Supabase Auth health | **Pass, health only** | Local `/auth/v1/health` returned HTTP 200 in the prior local check. |
| Unit/integration/e2e test commands | **Not available** | No test files or test/lint scripts were found. |
| Full browser UX/accessibility/performance pass | **Not tested** | No Lighthouse report, keyboard audit, mobile/tablet visual pass, console-error report, or browser workflow trace is available. |
| Dependency vulnerability audit | **Blocked** | `pnpm audit --prod` could not run because Node 22.12 is below the installed pnpm 11.25 minimum of 22.13. No npm lockfile is present for `npm audit`; do not treat dependency risk as cleared. |
| Payment sandbox | **Not applicable / deferred** | No payment integration exists and no real or sandbox payment was attempted. |
| Staging deployment and isolation | **Not tested / blocked** | No staging host/project settings were reviewed or changed. The remote local env target is undocumented. |

## Client brief coverage and external dependencies

See `FEATURE_MATRIX.md` for a feature-by-feature status. Key client-provided decisions/assets still needed include product photography/content, final privacy/terms/returns policies, actual tax and shipping rules, sender domain/email, domain and old-site access, and hosting ownership. Do not infer these from demo seed data.

## Limitations

This audit did not access or mutate a remote Supabase project, send customer communications, run payments, alter database rows, run destructive migrations, or deploy. The local source and SQL were inspected; staging-side CORS, secrets, TLS, backups, database identity, monitoring, and rollback were not available. Static absence of a control in this repository does not prove an external provider has not configured it, but external controls require evidence before they can count as passed.

## Remediation progress — 2026-10-24

Work is on branch `fix/audit-remediation`. Existing uncommitted changes were preserved. No remote service, real customer data, or database mutation was used. The complete scope, dependencies, acceptance criteria, and regression risks are in `REMEDIATION_PLAN.md`.

### Current finding status

| Finding | Current status | Evidence / remaining verification |
|---|---|---|
| DAIRI-01 | **Requires configuration** | Remote project purpose and host variables remain unverified. No remote requests or changes were made. |
| DAIRI-02 | **Requires client input** | Approved policy content has not been supplied; no legal copy or policy route was fabricated. |
| DAIRI-03 | **Still open** | No idempotency code or migration was added; sequential/concurrent checkout replay remains untested. |
| DAIRI-04 | **Requires configuration** | No server-verified bot/rate-limit provider or thresholds are configured. |
| DAIRI-05 | **Fixed but not verified** | Configured-backend startup now hides cached products while loading, clears products on required catalog-read errors, exposes retry/status UI, and labels `DEMO-*` catalog content. Unit tests passed; local browser confirmed the preview label and no console errors. Backend failure injection remains untested. |
| DAIRI-06 | **Requires configuration** | No sender-domain or isolated staging delivery evidence is available. |
| DAIRI-07 | **Requires client input** | Approved shipping/tax examples and provider decision remain outstanding. |
| DAIRI-08 | **Still open** | A narrow Node built-in test harness now exists (5 tests pass), but required auth/RLS, checkout, order, wholesale, admin, and recovery coverage is not present. |
| DAIRI-09 | **Requires client input** | Client decision on whether unpaid cancellation releases discount redemption is still needed. |
| DAIRI-10 | **Fixed but not verified** | General local persistence now uses an explicit allowlist excluding orders, support requests, and subscribers; old cache data is sanitized; guest confirmation stores a one-hour PII-free summary in `sessionStorage`. Three unit cases pass. Browser storage/sign-out inspection is still required. |
| DAIRI-11 | **Still open** | Product/variant writes remain multiple requests; no transaction change or failure injection was performed. |
| DAIRI-12 | **Still open** | Local runtime remains Node 22.12 while pinned pnpm requires >=22.13; Vercel runtime is unknown. |

### Remediation checks actually run

- `npm run test:audit`: **Pass**, 5 tests; these cover serialization redaction, one-hour guest-summary expiry/malformed input, catalog failure message mapping, and `DEMO-*` detection. They do not exercise database transactions or auth boundaries.
- `node_modules/.bin/vite build --configLoader runner --outDir /tmp/dairi-remediation-build-3`: **Pass**. This was a Vite production compilation only; the separate SEO asset generation step and full package build were not run.
- `git diff --check`: **Pass**.
- Local browser at `http://127.0.0.1:5175/store`: **Pass for preview-label smoke only**; the local seeded `DEMO-*` catalog was identified and visibly labeled. Browser console contained no errors or warnings at inspection time.
- No checkout was submitted, no order/auth/RLS mutation was attempted, no database migration was applied, and no remote project was contacted. Therefore end-to-end checkout, duplicate submission, authentication/authorization, and failure-recovery acceptance criteria remain open.

## Phase 2 reassessment — 2026-10-24

The status table below supersedes the 2026-10-24 progress table above. A source change or helper test does not count as resolution without the finding's acceptance evidence.

| Finding | Status | Current root cause / evidence / remaining acceptance work |
|---|---|---|
| DAIRI-01 | **BLOCKED BY EXTERNAL DEPENDENCY** | Staging Supabase/host identity is still not proven. No remote project was read or changed; confirm a separate staging project and browser-safe variables. |
| DAIRI-02 | **BLOCKED BY EXTERNAL DEPENDENCY** | Approved privacy/terms/returns copy is still missing; obtain client-approved text and verify distinct accessible pages and links. |
| DAIRI-03 | **FIXED BUT NOT VERIFIED** | Added a guest/account-scoped idempotency key, request fingerprint, atomic database record/replay, and transaction changes in `20261024000100_checkout_idempotency.sql`. On 2026-10-24 the migration and gated integration suite passed on a separate disposable loopback Supabase stack: parallel replay, lost response, mismatched payload, failed-transaction retry, server price, stock contention, and limiter threshold. Client UI → Edge Function → database/browser recovery is not yet verified end to end. |
| DAIRI-04 | **BLOCKED BY EXTERNAL DEPENDENCY** | Added a 64 KiB request cap, server validation already present in actions, and hashed per-email/account request windows for newsletter, support, wholesale, and order actions. IP-level throttling and allowed-origin policy still need trusted host/provider configuration; do not treat the current subject limits as complete anti-abuse protection. |
| DAIRI-05 | **FIXED BUT NOT VERIFIED** | Catalog read handling, retry/banner, demo labeling, and focused helper tests remain in place. Live backend failure/recovery injection and browser verification of stale-cache suppression were not run in this pass. |
| DAIRI-06 | **BLOCKED BY EXTERNAL DEPENDENCY** | Verified staging sender credentials, recipient isolation, delivery, and retry evidence are still unavailable. |
| DAIRI-07 | **BLOCKED BY EXTERNAL DEPENDENCY** | Client-approved shipping/tax examples and whether manual estimates meet the business need remain outstanding. |
| DAIRI-08 | **OPEN** | Eleven focused Node unit tests and two local database integration tests pass. Auth/RLS checks cover anonymous, customer A/B, admin, ownership, role changes, sign-out, and expired tokens; checkout DB checks cover replay, recovery, inventory, and limits. Full browser storefront-to-order/admin flow, catalog outage recovery, and email retry coverage remain incomplete. |
| DAIRI-09 | **BLOCKED BY EXTERNAL DEPENDENCY** | Client must decide whether cancelling an unpaid order releases a capped discount redemption. |
| DAIRI-10 | **FIXED BUT NOT VERIFIED** | General storage allowlist and PII-free expiring confirmation summary are tested; automated checkout-key storage is hash+UUID only and clears on sign-out. A live browser inspection across guest/customer/admin, sign-out, and expiry is outstanding. |
| DAIRI-11 | **OPEN** | Product/variant/wholesale writes remain separate requests; no atomic-write RPC or failure-injection evidence was added. |
| DAIRI-12 | **OPEN** | Vite compilation passes, but clean install, typecheck, package audit, and deploy-host Node/pnpm compatibility remain unverified. |

**Phase 2 evidence:** `npm run test:audit` passed 11 unit tests. `npm run test:checkout-db` passed 2 integration tests against a separate disposable local Supabase stack on loopback ports 55420–55427; only synthetic fixtures were created and cleaned. All repository migrations, including the new migration, applied to that isolated stack. The pre-existing local stack and all remote projects were untouched. Vite compilation to `/tmp/dairi-phase2-build-final2` and `git diff --check` passed. Edge Function Deno typechecking and a complete browser checkout path were not run. PDF helper tests pass; browser print output still needs visual inspection. Release remains **NO-GO**.

**Phase 3 update:** Current per-finding statuses and evidence are in [PHASE3_QA_EVIDENCE.md](./PHASE3_QA_EVIDENCE.md); this supersedes the Phase 2 statement that browser checkout and visual PDF inspection were outstanding. Release remains NO-GO.

## Phase 4 evidence update — 2026-10-24

The local catalog outage/recovery flow was browser-verified against the disposable Supabase stack (27 synthetic products recovered after retry); DAIRI-05 is now **fixed and verified locally for this path**. The standard catalog print stylesheet was adjusted and `npm run test:audit` passes 16/16. A one-page 0-product harness PDF was inspected, but the real authenticated catalog export route was not verified for all requested product counts; leave the PDF finding **open / fixed but not verified**. Admin/customer signed-in browser authorization and live storage inspection remain incomplete. Full Phase 4 evidence and staging, UAT, and production decisions are in [PHASE3_QA_EVIDENCE.md](./PHASE3_QA_EVIDENCE.md) and [RELEASE_GATE.md](./RELEASE_GATE.md).
