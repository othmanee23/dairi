# DAIRI Security Review

**Scope:** repository, SQL migrations, local environment file names/keys (values not disclosed), and local configuration. No remote service or real customer data was accessed. No destructive or mutating security test was run.

## Summary

The strongest controls are server-side: RLS is enabled on core data, admin operations check an `admin` profile role, order creation is service-role-only, and the database recalculates price and reserves stock under row locks. Customer order reads use `auth.uid()` ownership checks. The static review found no confirmed route that lets an ordinary customer self-promote or directly update another customer's order.

This is not a clean security sign-off. Public write endpoints have no visible rate limiter or bot verification, order submissions lack idempotency, customer order details are serialized to browser localStorage, and the staging backend identity is unverified. Automated security tests and an environment-level penetration test were not run.

## OWASP-oriented review

| Area | Status | Evidence and risk |
|---|---|---|
| Authentication | Partial pass | Supabase email/password, email confirmation, reset flow; separate customer/admin routes. Prior local tests passed basic positive/negative auth. Staging redirects, throttling, MFA policy, and account lockout configuration are unverified. |
| Session management | Partial | Supabase persists/refreshes browser session in `src/app/lib/supabase.ts`. No staging cookie/domain/session configuration was reviewed. Browser storage XSS exposure must be considered. |
| Authorization / privilege escalation | No confirmed defect in static review | `is_dairi_admin()` checks the profile role for `auth.uid()`. RLS policies guard admin writes; Edge actions re-read Auth user and profile role. Repeat negative tests on staging before sign-off. |
| IDOR / customer order access | Static controls present; runtime staging test blocked | Policies scope orders to `user_id = auth.uid()` and order items through their order. Guest orders have null `user_id` and are not in authenticated history. No cross-customer token test was executed during this audit. |
| Price and inventory tampering | Server controls present; concurrency not fully verified | Edge passes identifiers/quantities, while SQL derives price from product/variant, checks visibility/MOQ/stock, locks rows `FOR UPDATE`, snapshots lines and decrements inventory. No parallel last-unit test was executed in this audit. Duplicate requests can still create multiple orders. |
| Order/payment status manipulation | Good boundary by inspection, payment absent | Customer actions do not accept a requested status; tracking/retry actions require admin. No payment endpoint/webhook exists. Admin can update order fields through admin RLS by design. |
| Injection | No direct SQL interpolation observed in reviewed paths | Supabase query builder and parameterized SQL functions are used. Dynamic SQL not observed in reviewed migrations. Continue validating all JSON request shapes. |
| XSS | Positive controls observed; not browser-tested | React renders user strings as text; transactional email HTML escapes user/order fields. No CSP/security headers are configured in `vercel.json` or repository. Image URLs from admins should remain protocol-validated where appropriate. |
| CSRF / CORS | Bearer-token model; broad CORS | Edge function returns `Access-Control-Allow-Origin: *`. Browser auth is bearer-token based, so classic ambient-cookie CSRF is reduced; broad CORS is still unnecessary for a production API and may allow any origin to invoke public actions. Restrict to approved site origins where possible. |
| Public abuse / rate limiting | **Finding DAIRI-04 — High** | Newsletter, support, wholesale application, and guest order actions use service-role writes after validation. No rate limiter, CAPTCHA/Turnstile, or per-IP limits are present in repository code/config. |
| Password/reset | Partial pass | Password reset and update flows exist; confirmation enabled in local config. Provider rate limits, password policy, sender domain, and production templates are unknown. |
| Sensitive data | **Finding DAIRI-10 — Medium** | App state persistence includes order customer name/email/address in `localStorage`; local storage is accessible to same-origin scripts and persists on a shared device. `.env.local` and `.env.cloud.local` are ignored and not tracked. No secret values are included in this report. |
| File upload | Partial controls | Public bucket has image MIME allowlist, 8 MiB object limit, public read, admin-only writes. Frontend optimizes image uploads; corrupt files, decompression/resource limits, cleanup after partial product save, and real-world upload tests were not run. |
| Error handling | Partial | Edge returns generic customer-facing 500s and logs bounded provider errors. Context logs load errors but can leave old/demo state visible. Logging access/retention and PII redaction are unknown. |
| SSRF | Not applicable in reviewed code | No user-controlled server-side fetch URL was found in the reviewed Edge Function. Email calls a fixed Resend endpoint. SEO script fetches the configured Supabase API URL at build time; build environment must use a trusted URL. |
| Dependencies | **Unverified** | Dependency audit could not run because pnpm 11.25 requires Node >=22.13 and current Node is 22.12. Dependency vulnerabilities are not cleared. |
| Secrets/config | Partial | No `.env*` files are tracked; local files are gitignored. Remote Supabase URL in ignored `.env.cloud.local` has unknown environment purpose. No service-role key was found in browser env templates. Edge secret inventory and hosting settings were not accessed. |
| Headers/TLS | Unknown | `vercel.json` only configures SPA rewrite/build output. HTTPS and security headers depend on hosting/DNS configuration not supplied. |

## Specific abuse cases from the brief

1. **Read another customer's order:** RLS policies require order ownership by `auth.uid()`. Static source control found; dynamic two-customer attempt not run in this audit.
2. **Change cart price via API:** SQL computes product/variant prices and ignores client-supplied price. Static source control found; not fuzzed.
3. **Buy unavailable inventory:** SQL locks active variant and validates available stock before order commit. Static source control found; parallel last-unit scenario not run.
4. **Access admin endpoints:** tracking and retry actions call `isDairiAdmin`; admin SQL functions check profile role. Prior local negative authorization checks passed. Staging was not tested.
5. **Change order/payment status:** guest/customer action schema has no status field; tracking endpoint sets only shipped and is admin-gated. No payments exist. Database admin update is privileged. Static inspection only.
6. **Obtain sensitive customer data:** order RLS is scoped by `user_id`; support/newsletter/customer records are admin-only in inspected policies. No anonymous read API was run against real or remote data. Browser localStorage retains order PII as noted above.

## Recommended security gates

1. Establish staging project identity and isolation; prove no production data or service-role credential reaches the browser.
2. Add rate limiting and server-side bot verification for public writes, with bounded guest order attempts.
3. Add checkout idempotency before placing repeat requests in front of customers.
4. Remove PII from general localStorage persistence and verify browser retention.
5. Add automated RLS negative tests for anon, customer A, customer B, approved wholesale customer, and admin roles.
6. Run a supported-toolchain dependency audit and staging security-header/TLS review.
7. Configure and test staging email with a verified sender and controlled recipient allowlist.

## Remediation progress — 2026-10-24

- DAIRI-05: configured-backend catalog startup/failure handling now hides cached/demo rows while loading, clears rows after required read failures, exposes a retryable status, and marks seed records with `DEMO-*` identifiers as preview content. The local browser confirmed the preview label. Backend outage injection is still outstanding; keep status **fixed but not verified**.
- DAIRI-10: browser persistence now serializes an explicit non-sensitive allowlist, discards legacy order/contact-queue data, strips wholesale variant prices, and stores only an expiring PII-free guest confirmation summary in session storage. Unit tests verify the serializer and expiry. Browser storage inspection and sign-out verification remain outstanding; keep status **fixed but not verified**.
- The focused test command is `npm run test:audit` (5 passing unit tests). It is not the required RLS or authorization test suite. Checkout idempotency, public abuse protection, environment isolation, and staging security controls remain unresolved. No remote endpoint or real data was accessed.

## Phase 2 security reassessment — 2026-10-24

| Finding | Status | Security evidence and remaining work |
|---|---|---|
| DAIRI-01 | **BLOCKED BY EXTERNAL DEPENDENCY** | Remote/staging Supabase identity and secret separation remain unknown. No remote endpoint was contacted. |
| DAIRI-02 | **BLOCKED BY EXTERNAL DEPENDENCY** | Approved privacy and customer-policy text still requires DAIRI input. |
| DAIRI-03 | **FIXED BUT NOT VERIFIED** | Checkout passes a stable idempotency key; SQL binds it to a guest-email hash or authenticated user ID plus a request digest and replays the saved response. Order, stock, discount reservation, and response are atomic. A separate disposable loopback database run passed parallel replay, lost-response retry, payload mismatch, rollback/retry, price tampering, and competing last-unit cases. Full browser/Edge end-to-end checkout verification remains. |
| DAIRI-04 | **BLOCKED BY EXTERNAL DEPENDENCY** | The Edge Function enforces a 64 KiB body limit and calls an atomic database limiter for repeated newsletter, support, wholesale, and order requests using hashed subjects. Trusted client-IP extraction/rate limiting and origin allowlisting still require the selected host's verified configuration. No CAPTCHA was added. |
| DAIRI-05 | **FIXED BUT NOT VERIFIED** | Code hides cached rows while connected catalog reads are pending or failed, shows retry state, and labels seeded preview products. Live outage/recovery and stale-cache browser verification remain outstanding. |
| DAIRI-06 | **BLOCKED BY EXTERNAL DEPENDENCY** | Staging sender identity, secrets, delivery, and recipient isolation have not been verified. |
| DAIRI-07 | **BLOCKED BY EXTERNAL DEPENDENCY** | Shipping/tax behavior needs client-approved examples and a decision on whether manual estimates are acceptable. |
| DAIRI-08 | **OPEN** | Local disposable database tests now verify auth/RLS isolation for guest, two customers, admin, order ownership, sign-out, and expired tokens, plus checkout transaction recovery. Full storefront-to-order browser workflow and admin/email/catalog failure coverage remain. |
| DAIRI-09 | **BLOCKED BY EXTERNAL DEPENDENCY** | Discount redemption behavior after unpaid cancellation needs a client decision. |
| DAIRI-10 | **FIXED BUT NOT VERIFIED** | Safe allowlist storage and expiring PII-free guest confirmation are covered by unit tests. Checkout retry storage contains only UUID+digest and is cleared on sign-out. Manual browser inspection across role changes, expiry, and sign-out remains required. |
| DAIRI-11 | **OPEN** | Product/variant/wholesale-price writes remain non-atomic. |
| DAIRI-12 | **OPEN** | The current pass confirms Vite compilation only; clean-install/runtime pin and dependency audit are not confirmed. |

`npm run test:audit`: 11 passed. `npm run test:checkout-db`: 2 passed on a separate disposable loopback Supabase stack; migrations were applied there and synthetic fixtures were cleaned. No remote service or existing local database was contacted. Vite build and `git diff --check` passed. This is not a security sign-off: network/IP abuse controls, origin policy, Edge Deno typecheck, and staging verification remain outstanding.

**Phase 3 update:** Local Edge response checks, browser guest/duplicate checkout evidence, environment limits, and current security gates are in [PHASE3_QA_EVIDENCE.md](./PHASE3_QA_EVIDENCE.md). This is not a security sign-off.

## Phase 4 security evidence update — 2026-10-24

Anonymous redirects from protected lookbook preview and customer-account routes were browser-verified. This does not clear the signed-in admin/customer authorization finding: live sign-out, expiry, cross-user browser access and role transitions remain untested. The browser sandbox did not expose `localStorage` or `sessionStorage`, so persistence is classified **fixed but not fully verified** based on unit evidence. Catalog backend outage/recovery passed locally; this is functional evidence, not a security-control sign-off. No remote project was contacted. See [PHASE3_QA_EVIDENCE.md](./PHASE3_QA_EVIDENCE.md) and [RELEASE_GATE.md](./RELEASE_GATE.md).
