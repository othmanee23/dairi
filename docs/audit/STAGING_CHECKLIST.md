# DAIRI Staging Checklist

Do not deploy to an unidentified remote project. Check items and attach evidence; a checked box means the setting was actually inspected.

**Remediation note (2026-10-24):** no staging deployment is approved. DAIRI-01 isolation, DAIRI-02 approved policies, checkout idempotency, public abuse controls, and email delivery remain unresolved. Local tests/build evidence does not clear these environment gates.

## Phase 2 reassessment — 2026-10-24

Current finding classification is in `RELEASE_DECISION.md`. Checkout idempotency, auth/RLS boundaries, and per-identity limiter thresholds passed database integration tests on an isolated disposable loopback stack. DAIRI-04 still needs trusted IP-based controls and origin policy on the verified host. Browser end-to-end checkout and PDF visual inspection remain incomplete. The release remains **NO-GO**.

### Local verification before any staging work

- [x] Provisioned a separate disposable local Supabase test instance with no production credentials or customer data; its API used loopback port 55421.
- [x] Applied repository migrations to that disposable instance only. Existing local and remote projects were untouched.
- [x] Ran `npm run test:checkout-db`: 2 passed, 0 failed, 0 skipped. The suite refuses non-loopback hostnames and cleans only its synthetic fixtures.
- [ ] Run `npm run test:audit`, the supported TypeScript check, complete production build, Edge Function checks, and local database lint after the migration.
- [ ] Run a real browser print-to-PDF using the DAIRI template; inspect cover, contact page, product grid, dynamic price appendix, page breaks, and back cover. Confirm the provided website/address/phone/fax details are still valid.
- [ ] In a disposable browser profile, inspect localStorage and sessionStorage after guest checkout, signed-in customer/admin sessions, sign-out, and one-hour confirmation expiry. Confirm no address, email, order details, or message bodies appear in general/local retry storage.
- [ ] Force local catalog-read failure and recovery; verify cached product rows stay hidden and retry restores the live catalog.

### Remaining external and client gates

- [ ] Verify a separate staging Supabase project and host settings before any remote migration; record project identity without exposing credentials.
- [ ] Configure allowed origins and trusted IP-based request limits using the chosen staging host's documented client-IP mechanism; test normal and abusive requests.
- [ ] Obtain approved policy copy, shipping/tax examples and manual-quote decision, discount-cancellation rule, and final catalog/content from DAIRI.
- [ ] Configure controlled staging mail delivery and confirm actual receipt/retry behavior.
- [ ] Complete role/RLS cross-customer tests and full storefront-to-order/admin/recovery acceptance before client UAT.

## Ownership and environment isolation

- [ ] DAIRI/client owns the Vercel (or chosen host) organization/project and can access it.
- [ ] DAIRI/client owns the domain registrar account; transfer from Network Solutions has an approved plan and rollback.
- [ ] A dedicated Supabase **staging** project is identified by owner and project reference; it is not production.
- [ ] Vercel Preview/Staging variables point only to that staging Supabase URL and its publishable key.
- [ ] No service-role key, database password, or Resend secret is exposed through `VITE_*`, source maps, browser bundles, logs, or Git.
- [ ] Staging database, Auth users, Storage bucket, and backups are separate from production; no production customer data is copied.
- [ ] `.env.cloud.local` purpose is resolved, documented, and confirmed to target the intended non-production project before any remote command.
- [ ] Payments remain disabled; if later added, only provider test mode and test credentials are used.
- [ ] Email is isolated to controlled test mailboxes or a staging sender allowlist; no unintended customer messages can be sent.

## Build, schema, and deployment

- [ ] Pin a Node runtime supported by the pinned pnpm version (current local Node 22.12 is below pnpm 11.25's stated 22.13 minimum).
- [ ] From a clean checkout, install using the committed lockfile and run TypeScript, production build, database lint, and automated tests.
- [ ] Review every unapplied migration on a disposable staging clone; confirm forward/rollback plan and backup before applying.
- [ ] Confirm Vercel output directory `dist`, SPA rewrite, base URL, and staging redirect URLs.
- [ ] Confirm staging builds keep `VITE_PUBLIC_SITE_URL` blank or point to approved staging HTTPS, and remain `noindex`.
- [ ] Configure noindex/robots behavior intentionally and verify admin routes are not indexed.
- [ ] Verify CORS/security headers, HTTPS/TLS, auth redirect allowlist, and domain configuration in the actual host/provider settings.
- [ ] Verify Supabase Auth confirmation/reset templates and staging URLs.
- [ ] Configure a verified non-production email sender; send and inspect order confirmation and shipment emails to controlled mailboxes.
- [ ] Configure object storage limits/permissions and exercise upload/delete using staging admin only.
- [ ] Confirm logs, alerts, retention, backup schedule, restore procedure, support contact, and rollback owner.

## Smoke tests before client access

- [ ] Confirm the staging build identifier and backend project identity on the deployed site.
- [ ] Run anonymous, customer A, customer B, wholesale-approved, and admin authorization checks.
- [ ] Confirm customer A cannot read customer B's orders or private account data.
- [ ] Confirm anonymous/customer requests cannot write catalog, profile role, order status, settings, or discount administration.
- [ ] Test server-side price validation, invalid variants, stock zero, quantity limits, MOQ, and two simultaneous attempts for the last item.
- [ ] Test duplicate checkout retry/idempotency and order/email outbox exactly-once behavior.
- [ ] Test discount eligibility, redemption limit under concurrency, and redemption release/cancellation policy.
- [ ] Verify configured/unconfigured shipping and tax estimates against client-approved examples.
- [ ] Test form abuse/rate limits and email failure/retry behavior with bounded requests.
- [ ] Run mobile/tablet/desktop UAT, keyboard/accessibility checks, browser console review, and Lighthouse report.
- [ ] Confirm order/customer data in staging belongs only to test accounts and can be removed through an approved cleanup process.

## Rollback and client invitation

- [ ] Record the last known-good staging deployment and database migration version.
- [ ] Confirm rollback can restore the app and data without pointing to or modifying production.
- [ ] Set a named technical contact and client support channel for UAT.
- [ ] Share the client-facing UAT checklist and test-account instructions without sending shared or reusable admin credentials.
- [ ] Obtain client approval for content, policies, shipping, tax, and email before asking for business acceptance.

**Phase 3 update:** Local verification is summarized in [PHASE3_QA_EVIDENCE.md](./PHASE3_QA_EVIDENCE.md). Staging and VIP UAT remain NO-GO until remaining environment/client gates and the standard catalog PDF defect are resolved.

## Phase 4 superseding status — 2026-10-24

See [RELEASE_GATE.md](./RELEASE_GATE.md) for the requirement-by-requirement gates and [STAGING_SETUP.md](./STAGING_SETUP.md) for the exact isolation, migrations, Edge Function, rate-limit, mail, storage, secret, rollback, and smoke procedures. Gate A, Gate B, and Gate C remain **NO-GO**. Catalog outage/retry is verified locally. Browser signed-in role/storage checks and actual application catalog PDF exports (0/1/9/10/27) remain incomplete. Deno CLI checks, remote staging identity, and provider configuration remain pending. Payments are out of scope.
