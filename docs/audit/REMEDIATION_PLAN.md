# DAIRI Remediation Plan

**Source:** six audit documents dated 2026-10-24. This plan does not add findings; it organizes DAIRI-01 through DAIRI-12 as recorded in `AUDIT_REPORT.md`, `SECURITY_REPORT.md`, `FEATURE_MATRIX.md`, `UAT_CHECKLIST.md`, `STAGING_CHECKLIST.md`, and `RELEASE_DECISION.md`.

**Current release state:** NO-GO. No remote Supabase project or real customer data may be used for implementation or verification. Do not apply migrations to an unidentified remote. Payments remain out of scope. Finding status changes require recorded verification evidence, not code changes alone.

## Remediation order

### 1. Sensitive data and application security

#### DAIRI-10 — Medium: remove customer PII from general browser persistence

- **Root cause:** `src/app/context/AppContext.tsx` serializes the complete `AppState` to `localStorage`; `LocalOrder` contains customer name, email, and address fields.
- **Affected components/workflows:** browser persistence in `AppContext.tsx`; guest checkout and confirmation; sign-out; customer order history. Server-side order data and authenticated history are backed by Supabase/RLS.
- **Business risk:** contact and delivery details remain on shared/unmanaged devices and are readable by same-origin scripts, even after sign-out.
- **Technical solution:** persist an explicit allowlist of non-sensitive state only. Do not persist order contact/address fields. Preserve guest confirmation usability using a deliberately minimal, short-lived in-memory/session representation only if verified not to include contact/address PII. Clear legacy sensitive order data from the old cache on load/sign-out. Authenticated order history must come from the RLS-protected backend.
- **Dependencies:** agree/document what the guest sees after refresh; no client policy or provider dependency. Avoid logging stored order details.
- **Regression risks:** guest confirmation may no longer survive a browser restart; clearing/migrating old cache can affect local demo state. Storefront cart/wishlist should continue to persist if currently intended.
- **Automated acceptance:** tests prove serialization excludes customer name, email, street/city/postal/country and legacy persisted PII is removed; allowlisted catalog/cart preferences remain; sign-out clears the relevant legacy cache. Test guest confirmation behavior without persisting PII.
- **Manual acceptance:** in a disposable local browser, create a guest checkout, inspect the `dairi-local-store-v1` entry before/after refresh and sign-out, and confirm no customer contact/address remains; confirm the order confirmation and authenticated history behave as documented.
- **Status:** Open until automated and browser verification evidence is recorded.

### 2. Database and staging environment isolation

#### DAIRI-01 — Blocker: prove staging backend isolation

- **Root cause:** `.env.cloud.local` contains a remote Supabase URL and publishable key whose environment purpose is undocumented, while README describes no remote project as linked. Hosting settings were not inspected.
- **Affected services/configuration:** local environment files (values must not be printed), Supabase Auth/Postgres/Storage, Vercel preview/staging variables, email sender credentials, any future deployment/migration workflow.
- **Business risk:** a command or deployment may read or mutate production/real customer data, expose files, or send real email while believed to be staging.
- **Technical solution:** have the owner identify the remote project reference and purpose through provider dashboards; provision/confirm dedicated staging Auth, database, storage, secrets, and controlled email; configure separate host variables; document an explicit environment identity check and deployment gate. Never infer safety from an env filename or public key.
- **Dependencies:** owner/provider dashboard access and confirmation of which project is staging; isolated staging credentials and host ownership.
- **Regression/operational risks:** mislabeling production as staging, copying real data, or using production email secrets; local/preview URL allowlists may reject valid auth redirects.
- **Automated acceptance:** deployment preflight fails unless the target URL/project reference matches an explicitly configured staging allowlist; no service-role/database/email secret appears in browser output or tracked files.
- **Manual acceptance:** independently compare Supabase project reference, database/storage ownership, Vercel preview variables, Auth redirect URLs, and email credentials. Run read-only identity smoke checks first, then only disposable test-account flows. Retain redacted evidence.
- **Status:** Blocker; requires provider/owner configuration and evidence. No remote access or mutation is authorized by this plan.

#### DAIRI-08 — High: establish repeatable critical-path regression tests

- **Root cause:** no test/spec files or test command exists in `package.json`; prior workflow checks were manual and not repeatable.
- **Affected components/workflows:** application-wide auth/RLS, storefront, cart, checkout/order, inventory, wholesale, admin, failure handling and release checks.
- **Business risk:** regressions in security- and revenue-adjacent paths can ship undetected; routing/build checks alone do not prove the UI or transactions work.
- **Technical solution:** add a maintainable test harness using disposable local Supabase fixtures and browser/API tests. Keep fixtures isolated and cleanup deterministic. Include the exact scenarios in the acceptance criteria below and report actual execution results.
- **Dependencies:** supported Node/pnpm runtime (DAIRI-12), local Supabase availability, no staging/production fixtures.
- **Regression risks:** flaky browser tests, shared state between parallel tests, accidental remote target selection, or cleanup touching non-test data.
- **Automated acceptance:** documented command runs from a clean local checkout; verifies anonymous/customer A/customer B/wholesale/admin authorization, price and inventory invariants, duplicate checkout, form abuse controls, admin mutation boundaries, and failure recovery. Tests assert both expected response and durable database state.
- **Manual acceptance:** repeat high-value storefront-to-checkout-to-order and admin flows in an isolated browser; preserve traces/screenshots for failures; include responsive and keyboard spot checks.
- **Status:** High coverage gap; tests must be implemented and executed before re-evaluation.

### 3. Checkout and order integrity

#### DAIRI-03 — High: make checkout idempotent

- **Root cause:** checkout invokes a fresh `order` action on each call; `customer-actions` and `submit_unpaid_order` accept no stable idempotency key, so a timeout/retry can create another order and reserve inventory again.
- **Affected components/endpoints/workflows:** `src/app/pages/store/Checkout.tsx`, `src/app/context/AppContext.tsx`, `supabase/functions/customer-actions/index.ts`, SQL order/stock transaction, order number and email outbox creation.
- **Business risk:** duplicate unpaid orders, excessive stock reservation, duplicate confirmation email, and uncertain customer outcome after a lost response.
- **Technical solution:** generate one unpredictable key for a checkout attempt and reuse it for network retries until a definitive result. Enforce uniqueness and request binding in the database transaction; same key and same canonical request returns the original order, while same key with a different request is rejected. Persist the idempotency record and order atomically before any inventory/discount/outbox side effects. Do not store customer PII in the key record. Keep payment out of scope.
- **Dependencies:** migration/function deployment to the verified local database first and later isolated staging; compatibility for old clients with no key; do not apply remotely until DAIRI-01 passes.
- **Regression risks:** incorrectly rotating a key on retry defeats protection; reusing a key after cart edits may return/reject an old order; concurrency and transaction ordering can still double-decrement stock if uniqueness is checked too late.
- **Automated acceptance:** sequential and concurrent replay of identical checkout produces one order number, one stock decrement, one discount redemption (when applicable), and one outbox event; changed payload with same key returns a conflict; a rolled-back failed transaction permits a safe retry; ordinary distinct attempts still create separate orders. Include last-stock concurrency.
- **Manual acceptance:** simulate a lost response and retry in local checkout; verify one order and recoverable confirmation. Confirm error feedback does not discard the stable key while outcome is unknown.
- **Status:** Open until migration/function and frontend are tested together locally.

#### DAIRI-09 — Medium: define discount redemption cancellation behavior

- **Root cause:** order creation increments the discount `redemption_count`; unpaid cancellation restores inventory but does not release the redemption.
- **Affected components/workflows:** discount code eligibility, order creation, `cancel_unpaid_order`, cancellation UI/admin workflows.
- **Business risk:** cancelled unpaid orders may consume a limited-use promotion and deny it to a later eligible customer.
- **Technical solution:** first obtain an explicit business decision whether cancellation releases the redemption. If yes, use an order-linked redemption ledger and release once transactionally; do not decrement a shared counter without an idempotent ledger. If no, document the approved behavior in client-provided terms and UI.
- **Dependencies:** client decision on cancellation/discount policy; DAIRI-03 transaction test infrastructure.
- **Regression risks:** releasing twice on repeated cancellation, race on final redemption, or changing promotion economics without approval.
- **Automated acceptance:** once policy is approved, test first/repeated cancellation, concurrent limited redemptions, no-code orders, and exact count/ledger state.
- **Manual acceptance:** verify cancellation messaging and admin display match approved policy.
- **Status:** Open; business decision required before changing behavior.

### 4. Public API abuse prevention

#### DAIRI-04 — High: add abuse protection to public write endpoints

- **Root cause:** public `customer-actions` actions accept unauthenticated write traffic with payload validation but no visible durable rate limit or server-verified bot check. Wildcard CORS is present, but CORS is not itself authentication.
- **Affected components/endpoints/workflows:** `supabase/functions/customer-actions/index.ts`; public newsletter, support, wholesale application, and guest order actions; service-role database writes and inventory reservation.
- **Business risk:** automated spam can overload queues and repeatedly reserve inventory; support and wholesale inboxes can become unusable. The service-role writer increases impact of endpoint abuse.
- **Technical solution:** choose and configure a reliable server-side control (provider/WAF rate limits and/or Turnstile Siteverify with server-side secret validation), apply action-specific bounded limits, and restrict allowed browser origins to approved storefront origins. Do not rely on in-memory per-instance counters or client-only CAPTCHA. Keep authentication/authorization checks for privileged actions.
- **Dependencies:** isolated staging identity, approved domains, provider account/keys and chosen thresholds. This plan does not invent thresholds or assume provider settings are active.
- **Regression risks:** false positives can block legitimate wholesale/customer submissions; overly broad CORS or incorrect origin lists can break preview/local workflows. Fail-closed behavior must be explicit for protected writes.
- **Automated acceptance:** controlled local/isolated-staging tests prove missing/invalid bot proof and requests over the configured limit create no records and reserve no stock; allowed requests succeed; admin/customer authorization negatives remain denied.
- **Manual acceptance:** bounded test against isolated staging from approved and unapproved origins; inspect provider/rate-limit evidence and confirm ordinary users can submit. Never load-test a production endpoint.
- **Status:** Open; requires configuration and environment verification.

### 5. Email reliability

#### DAIRI-06 — High: verify transactional email delivery and recovery

- **Root cause:** outbox/Resend dispatch code is present, but no verified sender domain or isolated staging function secrets are established; observed local behavior queued messages without credentials.
- **Affected components/endpoints/workflows:** `supabase` transactional email outbox migrations; `supabase/functions/customer-actions/index.ts`; order confirmation, shipment notification, retry/backoff, admin email queue.
- **Business risk:** customer may receive no confirmation or shipment notice even though the order exists; queued is not delivered.
- **Technical solution:** client provides/approves a sending domain and sender; configure only non-production credentials in isolated staging, controlled recipient allowlist, and provider status/log review. Preserve bounded retry and make resend behavior safe. Do not send messages to real clients during testing.
- **Dependencies:** DAIRI-01, client/domain/DNS access, Resend account/API key, controlled mailboxes.
- **Regression risks:** sender authentication failures, retries generating duplicates, emails escaping the allowlist, or environment secrets leaking to browser/logs.
- **Automated acceptance:** mock provider tests cover delivered, rejection, timeout, retry/backoff, exhausted attempts, and duplicate dispatch behavior; no PII/secrets in logs. Isolated staging shows one provider-accepted message per expected event.
- **Manual acceptance:** verify DNS/sender, inspect provider events and controlled mailbox for confirmation and shipment messages; simulate provider failure and recovery in staging.
- **Status:** Requires client/provider configuration; local queue is not evidence of delivery.

### 6. Legal and business content requirements

#### DAIRI-02 — Blocker: publish approved privacy/terms destinations

- **Root cause:** footer and registration legal links navigate to generic `/store/support`; support explicitly says final policy content must be supplied/approved by DAIRI.
- **Affected components/workflows:** `src/app/components/store/StoreFooter.tsx`, `src/app/pages/auth/CustomerRegister.tsx`, `src/app/pages/store/Support.tsx`, routes and signup consent wording.
- **Business risk:** customers cannot review the privacy/terms they are asked to accept; risk of misleading signup and failure of client requirement.
- **Technical solution:** obtain client-approved policy text; create distinct accessible destinations and route all links to the matching document. Update consent copy only to match client/legal-approved wording. Do not draft legal language or infer consent requirements.
- **Dependencies:** client/legal supplies privacy, terms, returns/refund and accessibility/contact requirements as applicable.
- **Regression risks:** broken deep links, stale footer links, inaccessible documents, or consent wording inconsistent with policies.
- **Automated acceptance:** route/link tests confirm each named link resolves to its own page and no generic support fallback; approved content identifiers are present.
- **Manual acceptance:** traverse all legal links from desktop/mobile footer, registration, and relevant forms; review content approval and keyboard/screen-reader usability.
- **Status:** Blocker; requires client content before implementation can be marked complete.

#### DAIRI-07 — High: validate shipping and tax against approved business rules

- **Root cause:** current checkout supports manually configured flat destination rates and tax percentages, while the brief describes carrier options, weight/dimension-based/international shipping, and tax where applicable; no carrier rating/label or tax provider is implemented.
- **Affected components/workflows:** `src/app/pages/settings/Settings.tsx`, `supabase/migrations/20261023000100_commerce_zones.sql`, checkout totals, shipping/tax display and future fulfillment.
- **Business risk:** estimates can differ from actual postage or tax obligations, leading to customer disputes, loss, or noncompliance.
- **Technical solution:** keep payment disabled; label current values as estimates. Obtain client/accountant-approved regions, shipping rules, tax treatment, international and carrier requirements. Then make an explicit decision whether manual rules are acceptable for UAT or which carrier/tax provider to implement. Do not invent rates or tax policy.
- **Dependencies:** client and accountant decisions; provider/API access if requested; DAIRI-01 before any staging config.
- **Regression risks:** country/region precedence, free-shipping threshold, discount interaction, taxable-shipping flag and rounding can change totals; provider outage must not silently charge/quote zero.
- **Automated acceptance:** tests cover configured/unconfigured zones, precedence, shipping threshold, tax basis/rounding, discounts and client-approved expected examples; if provider integration is selected, provider errors fail safely.
- **Manual acceptance:** client signs off a matrix of destination/cart examples and confirms checkout wording; verify no charge/payment is collected.
- **Status:** Open; business rules/provider decision required.

### 7. Remaining functional, UX, and release defects

#### DAIRI-05 — High: fail clearly when connected catalog data cannot load

- **Root cause:** app starts with hard-coded demo products/localStorage and product-load errors only log to console, leaving fallback/stale catalog visible.
- **Affected components/workflows:** `src/app/context/AppContext.tsx`, `src/app/data/storeProducts.ts`, `supabase/seed.sql`, storefront and admin product views.
- **Business risk:** VIP client may mistake demo, stale prices, imagery, or stock for the live approved catalog; admin may assume edits persisted.
- **Technical solution:** separate intentional demo/local mode from configured-backend mode. In connected mode, represent loading/error/empty states explicitly, do not present demo or stale products as authoritative after a failed load, and provide a clear retry/unavailable message. Keep demo seed clearly labeled and excluded from staging catalog.
- **Dependencies:** distinguish valid empty catalog from failed request; DAIRI-01 for staging content.
- **Regression risks:** blank storefront if configuration is misdetected; poor offline experience; race where stale response overwrites newer data.
- **Automated acceptance:** with clean and populated local cache, inject request failure and empty response; connected mode never renders demo/stale catalog as current and exposes retry; valid success renders backend products; explicit demo mode still works.
- **Manual acceptance:** simulate offline/backend error and recover; verify storefront and admin status messaging and retry behavior.
- **Status:** Open until failure-injection verification.

#### DAIRI-11 — Medium: make product/variant administration atomic

- **Root cause:** product metadata is saved before variant and wholesale-price operations, which are multiple requests; later failure leaves partial state.
- **Affected components/workflows:** `src/app/context/AppContext.tsx` `updateProduct`/`saveProductVariants`, product editor, product/variant/wholesale-price tables.
- **Business risk:** mismatched storefront variant, inventory, SKU, or wholesale price after partial save.
- **Technical solution:** implement a validated admin-only Postgres RPC that writes the product plus variant/wholesale-price set in one transaction, or another demonstrably atomic design. Preserve existing validation, role checks, image-storage semantics, and IDs. Do not include storage operations in claims of DB atomicity.
- **Dependencies:** migration applied only to local disposable Supabase during implementation; DAIRI-01 before remote migration; test-fixture support from DAIRI-08.
- **Regression risks:** invalid wholesale pricing/duplicate SKU rejection changes; full replacement semantics could delete omitted variants; concurrent admin edits can overwrite each other; image upload may still succeed while DB save fails.
- **Automated acceptance:** inject failure at product, variant, and wholesale-price write stages and verify DB state is entirely old or entirely new; verify unauthorized user cannot call RPC; check variant IDs and existing catalog remain consistent.
- **Manual acceptance:** edit a product with multiple variants and wholesale prices, force a controlled local failure, retry, and verify storefront/admin state.
- **Status:** Open; no RPC is verified yet.

#### DAIRI-12 — Medium: align Node/pnpm toolchain

- **Root cause:** package pins pnpm 11.25.0, which requires Node >=22.13, while audited local runtime is Node 22.12; `pnpm --version` fails. Vercel runtime is unknown.
- **Affected components/workflows:** `package.json`, lockfile install, local scripts, Vercel build environment and CI.
- **Business risk:** clean install, audit, and deployment are not reproducible in the current toolchain; dependencies remain unaudited.
- **Technical solution:** declare/pin a Node version compatible with the existing pnpm and make CI/host use it, or choose a compatible pnpm and regenerate lockfile under an agreed supported Node. Do not silently change runtime assumptions.
- **Dependencies:** available Node installation/CI and host project setting.
- **Regression risks:** lockfile churn, local developer mismatch, Vercel build/runtime differences.
- **Automated acceptance:** clean frozen install, `pnpm --version`, typecheck, production build, database lint, and dependency audit all run on the declared version; CI fails on unsupported Node.
- **Manual acceptance:** compare host build runtime with repository pin and retain successful staging build evidence.
- **Status:** Open; local Node mismatch confirmed, host setting unknown.

## Finding status register at plan creation

| Finding | Severity | Initial status | Exit evidence needed |
|---|---:|---|---|
| DAIRI-01 | Blocker | Requires configuration / release gate | Verified dedicated staging project and host variables; redacted identity evidence |
| DAIRI-02 | Blocker | Requires client input | Approved text, distinct routes, link/accessibility checks |
| DAIRI-03 | High | Open | Sequential/concurrent duplicate replay and database side-effect assertions |
| DAIRI-04 | High | Requires configuration | Server-side protection, bounded abuse tests, normal-flow tests |
| DAIRI-05 | High | Open | Failure/empty/success injection with clear UI state |
| DAIRI-06 | High | Requires configuration | Controlled staging provider + mailbox evidence and failure/retry checks |
| DAIRI-07 | High | Requires client input | Approved business matrix and matching checkout tests/provider decision |
| DAIRI-08 | High | Open | Repeatable local test suite executed with retained evidence |
| DAIRI-09 | Medium | Requires client decision | Approved redemption semantics and transactional tests |
| DAIRI-10 | Medium | Open | Storage inspection plus persistence/sign-out regression tests |
| DAIRI-11 | Medium | Open | Failure injection proves atomic database state and role enforcement |
| DAIRI-12 | Medium | Open | Clean supported-toolchain install/build/audit and host runtime confirmation |

## Verification and release decision policy

- Implement one logical item at a time on `fix/audit-remediation`; preserve existing uncommitted work.
- Use only disposable local Supabase state. Do not target remote credentials; do not run destructive database operations.
- For each code change, record exact command, result, and scope in the relevant audit report. Distinguish test doubles/local evidence from provider or staging evidence.
- Do not label an item “fixed and verified” until its acceptance checks pass. Otherwise use “fixed but not verified,” “requires configuration,” “requires client input,” or “still open.”
- Update the six existing reports and `RELEASE_DECISION.md` after implementation; keep the decision NO-GO while either blocker or any critical launch gate lacks evidence. Payment remains deferred.

## Phase 2 implementation and verification status — 2026-10-24

This is the current status register; it supersedes the initial-status register above. No finding is marked verified solely because code or tests were added.

| Finding | Status | Work completed this pass | Exact remaining acceptance evidence |
|---|---|---|---|
| DAIRI-01 | **BLOCKED BY EXTERNAL DEPENDENCY** | No environment changes. | Confirm project reference/owner as staging; verify host URL and publishable key resolve only to that project; prove no prod data, service key, or payment secret; record redacted identity evidence. |
| DAIRI-02 | **BLOCKED BY EXTERNAL DEPENDENCY** | No policy text fabricated. | Client supplies approved privacy, terms, returns/refund text and publication approval; verify each policy route, footer link, keyboard access, and mobile layout. |
| DAIRI-03 | **FIXED BUT NOT VERIFIED** | Added client retry UUID+digest, account/guest-scoped SQL idempotency, response replay, atomic order/inventory/discount commit, Edge key validation, and DB integration coverage. Two integration tests passed on a separate disposable loopback Supabase stack, including duplicate parallel submissions, lost response retry, payload mismatch, transaction failure recovery, server pricing, last-stock contention, and rate-window boundary. | Verify the entire browser storefront/cart/checkout → Edge Function → order confirmation workflow, including duplicate click and network failure in the UI; confirm one order/stock decrement and safe confirmation recovery. Run Edge Function with Deno typecheck/runtime coverage. |
| DAIRI-04 | **BLOCKED BY EXTERNAL DEPENDENCY** | Added a 64 KiB body limit and atomic hashed-subject windows for repeated newsletter (5/hour), support (3/hour), wholesale applications (2/day), and checkout submissions (5/hour). | Configure trusted IP-based abuse controls and allowed-origin policy on the verified staging host; test normal submits, repeated accounts/addresses, oversized bodies, 429 responses, and ensure approved origins still work. These settings depend on DAIRI-01. |
| DAIRI-05 | **FIXED BUT NOT VERIFIED** | Existing load/error/retry/demo-label code and helper tests retained. | In disposable local Supabase, force each required read to fail, prove old cached rows stay hidden, use Retry, restore reads, and verify live recovery in browser with no console errors. |
| DAIRI-06 | **BLOCKED BY EXTERNAL DEPENDENCY** | No provider credentials or test emails sent. | Verify isolated sender domain/secret and recipient allowlist; exercise confirmation/shipment delivery, provider rejection, retry schedule, duplicate event, and delivery receipt in a controlled mailbox. |
| DAIRI-07 | **BLOCKED BY EXTERNAL DEPENDENCY** | No rates or shipping/tax policy invented. | Obtain client-approved destination examples, rates, tax jurisdiction decisions, and whether manual studio quotes meet UAT; assert approved examples in checkout tests. |
| DAIRI-08 | **OPEN** | Eleven focused Node unit tests and two disposable-local DB integration tests pass. Auth/RLS coverage includes guest/customer A/customer B/admin, own/cross-customer orders, denied role/order changes, sign-out, and expired token. Checkout DB tests cover idempotency and recovery. | Add/run browser-level storefront/cart/checkout/order confirmation and admin flows; add catalog outage/recovery and email retry coverage. Record actual output and run all relevant suites together. |
| DAIRI-09 | **BLOCKED BY EXTERNAL DEPENDENCY** | No cancellation discount policy changed. | Client decides whether unpaid cancellation restores capped discount redemption; implement and test the selected behavior for concurrent redemptions and cancellation. |
| DAIRI-10 | **FIXED BUT NOT VERIFIED** | Existing local-storage allowlist and PII-free one-hour confirmation summary remain; checkout retry storage now keeps only a UUID and SHA-256 digest and clears on sign-out. | Inspect localStorage/sessionStorage in browser for guest, customer, admin, sign-out, and expiry; confirm no addresses/contact/order details are in general persistence and expiry removes the summary. |
| DAIRI-11 | **OPEN** | No admin product-write transaction changes. | Add admin-only product/variant/wholesale-price transaction and test rollback at each stage plus unauthorized RPC rejection. |
| DAIRI-12 | **OPEN** | Vite compilation was rerun successfully. | Pin supported Node/pnpm, verify clean frozen install, typecheck, complete build, DB lint, audit, CI and hosting runtime. |

### Current test evidence

- `npm run test:audit`: **11 passed** (catalog helper, persistence, checkout-key lifecycle, line-sheet grouping/price formatting).
- `npm run test:checkout-db`: **2 passed, 0 failed, 0 skipped** on a separate disposable loopback Supabase stack (ports 55420–55427); migration application and test fixtures were isolated to that stack. Existing local and remote databases were untouched.
- `node_modules/.bin/vite build --configLoader runner --outDir /tmp/dairi-phase2-build-final2`: **passed** Vite production compilation. The separate SEO generation/build step and Edge Function Deno check were not run. No TypeScript project configuration is present for `tsc --noEmit`.
- `git diff --check`: **passed**.
- The new migration was applied only to the disposable loopback stack. Synthetic orders were submitted there and cleaned by the test suite; no existing local or remote database/request was touched.

### PDF line-sheet template

The lookbook preview/export now offers a separate DAIRI A4 line-sheet mode matching the supplied reference structure: cover, brand/contact page, product pages grouped by color with a 3 × 3 grid, dynamic USD price-list appendix, and back cover. Prices are read from each selected product's current `price` field. Unit tests cover color grouping, nine styles per page, appendix pagination, and USD formatting. The generated PDF itself still needs browser print-to-PDF rendering and visual inspection before that output is marked verified. The provided phone, fax, address, and website were taken from the supplied template; confirm they remain current before client use.

**Phase 3 status update:** The current evidence and superseding status classification are in [PHASE3_QA_EVIDENCE.md](./PHASE3_QA_EVIDENCE.md). DAIRI-03 is fixed and locally verified; the standard zero-item catalog export remains an open defect. Do not deploy or invite VIP UAT.
