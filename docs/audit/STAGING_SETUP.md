# DAIRI isolated staging setup

This runbook prepares one isolated staging environment. It does not authorize a remote deployment or a migration to an unidentified project. Use synthetic accounts and catalog records only. Payments stay disabled.

## 1. Supabase project and hosting

1. The project owner creates or identifies a dedicated Supabase project explicitly named **DAIRI Staging**, and records the project reference, organization, region, and owner in the private environment inventory. Confirm it is not the production project by comparing the project reference in the dashboard and the staging host variables. The ignored `.env.cloud.local` target must be classified before any remote command; do not print its key values.
2. Create a separate Vercel Preview/Staging environment (or the selected host's equivalent) with its own URL. No production database, storage bucket, Auth users, service-role key, Resend key, or payment credentials may be reused.
3. Keep `VITE_PUBLIC_SITE_URL` empty for staging so the build remains `noindex`. Auth redirect URLs must include only the local and staging origins required for this test environment.
4. Check Supabase Auth, database, Storage, backups, logs, and secrets in the staging project. Never copy production rows, customer accounts, product images containing customer information, or order data into it.

## 2. Environment variable inventory

| Scope | Variable | Required value / handling |
|---|---|---|
| Browser build | `VITE_SUPABASE_URL` | HTTPS URL of the dedicated staging Supabase project only. This is public configuration. |
| Browser build | `VITE_SUPABASE_PUBLISHABLE_KEY` | Staging publishable/anon key only. This is public configuration; RLS remains mandatory. |
| Browser build | `VITE_PUBLIC_SITE_URL` | Leave blank in staging to preserve `noindex`; only production builds receive the approved production HTTPS origin. |
| Edge Function runtime | `SUPABASE_URL` | Supabase injects the project URL at runtime. It must resolve to the same staging project. |
| Edge Function runtime | `SUPABASE_ANON_KEY` | Runtime-provided anon key for token comparisons; never put service credentials in browser variables. |
| Edge Function runtime | `SUPABASE_SERVICE_ROLE_KEY` | Runtime-provided secret, server-side only. Verify it is absent from `VITE_*`, source maps, browser responses, and tracked files. |
| Edge Function secret | `RESEND_API_KEY` | Optional for isolated staging until a verified non-production sender is ready. Use a dedicated restricted key and controlled recipient policy. |
| Edge Function secret | `DAIRI_EMAIL_FROM` | Optional until the non-production sender is verified. Use a staging sender identity, not a production sender. |

There is currently no application environment variable for an origin allowlist. `customer-actions` returns wildcard CORS; origin restriction must be implemented or enforced at an approved edge/WAF layer before client UAT. Do not mistake CORS for endpoint authentication.

No Stripe, payment, production tax-provider, or production carrier secret belongs in this staging environment.

## 3. Migration rehearsal and sequence

Before staging, run the full ordered migration set on a fresh disposable Supabase database and retain the version table/output. Never run `supabase db reset` against a remote project. The repository migration order is:

1. `20261020000100_initial_dairi_backend.sql`
2. `20261022000100_product_variants_inventory.sql`
3. `20261022000200_cancel_unpaid_order.sql`
4. `20261022000300_wholesale_applications.sql`
5. `20261022000400_wholesale_accounts_and_pricing.sql`
6. `20261022000500_order_address_breakdown.sql`
7. `20261023000100_commerce_zones.sql`
8. `20261023000200_discount_codes.sql`
9. `20261023000300_order_tracking.sql`
10. `20261023000400_transactional_email_outbox.sql`
11. `20261023000500_fix_email_retry_backoff.sql`
12. `20261023000600_recover_stuck_email_jobs.sql`
13. `20261024000100_checkout_idempotency.sql`

For the isolated staging project, first take/confirm an empty-environment backup or use Supabase's documented restore point, review every pending migration, then apply migrations once with the project reference explicitly checked. Record the project ref and applied migration versions without recording secrets. Follow with `supabase db lint --linked` only after the target identity is confirmed; do not use `--linked` while the repository's link target is unknown.

For a confirmed staging project, the reviewed deployment commands are `supabase db push --dry-run --project-ref "$STAGING_PROJECT_REF"`, followed by `supabase db push --project-ref "$STAGING_PROJECT_REF"` only after the dry run, backup, migration review, and target identity are accepted; then deploy the single function with `supabase functions deploy customer-actions --project-ref "$STAGING_PROJECT_REF"`. These commands are documentation only and were not run in this phase.

## 4. Authorization and RLS checks

Run tests only with synthetic accounts for anonymous, customer A, customer B, approved wholesale customer, and a separately provisioned staging admin. Verify positive and negative reads/writes for each role, including cross-customer orders, order items, wholesale prices, profile role, catalog/settings mutations, tracking, and email retry. Verify direct REST/RPC access as well as the Edge Function. Confirm no production identities are invited to staging.

Acceptance: the automated and manual role matrix passes against the confirmed project ref; customer A cannot read customer B's order or private profile; anon/customer cannot access admin writes; wholesale pricing is visible only to approved accounts; service-role credentials never reach the browser.

## 5. Edge Function deployment and rate limits

Deploy only `customer-actions` to the confirmed staging project after code checks and migration review. Verify `POST`/`OPTIONS` behavior, JWT role checks, malformed/oversized payload rejection, and successful synthetic requests. Do not deploy from a shell whose linked project is uncertain.

The Deno CLI is not installed in the current environment. In an approved Deno 2.x environment, run these exact source checks from the repository root:

```sh
deno --version
deno fmt --check supabase/functions/customer-actions/index.ts
deno lint supabase/functions/customer-actions/index.ts
deno check supabase/functions/customer-actions/index.ts
```

There are currently no Deno test files for this function. Add focused tests before counting an Edge Function test run; then run `deno test supabase/functions/customer-actions/`. The local Supabase Edge Runtime previously reported Deno 2.1.4 compatibility, which is runtime evidence only and does not replace these CLI checks.

The application currently enforces subject windows in `consume_public_action_limit`: subscribe 5/hour, support 3/hour, wholesale 2/day, and order 5/hour, plus a 64 KiB body cap. These controls use email/account subject hashes and do not establish a trusted client IP. Configure a provider-side staging rate limit for request volume by verified source IP on public write routes, with a burst and sustained threshold selected by the staging owner. Confirm forwarded client IP headers are supplied by the trusted host and cannot be spoofed by arbitrary request headers. Test the configured threshold using bounded synthetic calls; verify 429 responses have no database or inventory side effect.

The current Edge Function's CORS origin is `*`. Before VIP UAT, set an exact staging-origin allowlist through a reviewed code/config change or enforce the approved origin policy at the staging edge. Test allowed and unapproved browser origins. CORS is not a substitute for rate limiting, JWT validation, or RLS.

## 6. Email sandbox and delivery

Keep `RESEND_API_KEY` and `DAIRI_EMAIL_FROM` unset until a verified non-production sender and controlled mailbox are ready. With no sender configured, the function queues email and does not prove delivery. Before any staging email test, configure a staging-only sender, restrict recipients to a controlled test allowlist at the provider or staging edge, then verify confirmation and shipment success, provider rejection, retry/backoff, duplicate dispatch, and mailbox receipt. Never send test messages to customer addresses. Do not add the key to `.env.local`, `VITE_*`, logs, or source control.

## 7. Storage isolation

Use only the staging project's own `product-media` bucket. Verify public read is limited to intentionally public catalog assets; upload/update/delete must be admin-only by RLS/storage policies. Check MIME allowlist and 8 MiB limit, test synthetic image upload and removal, and verify the bucket contains no copied production/customer content. Confirm object URLs in staging reference only the staging project.

## 8. Secret management

Store Edge secrets in Supabase's staging function-secret store and host build variables in the staging host's Preview/Staging environment. Give least-privilege dashboard access to named maintainers. Rotate any value found in browser bundles or tracked history. Keep ignored local env files private and classify `.env.cloud.local` before use. Confirm service-role, database, email, and future payment secrets are absent from client bundles, error reports, and public build artifacts.

## 9. Rollback and recovery

Before migration/deploy, record the last known-good staging app deployment, commit, and migration version; take a staging backup/restore point and name the rollback owner. Rollback the app to the last known-good deployment if the smoke gate fails. For database changes, prefer a forward corrective migration; restore a backup only under the staging owner's runbook after confirming the target project reference. Do not blindly reverse schema migrations or point staging at production. Record recovery time, restored version, and data loss window.

## 10. Staging smoke sequence

After deployment, verify in this order: (1) app build ID and backend project reference match staging; (2) noindex and HTTPS; (3) migrations and RLS matrix; (4) public catalog, empty/error/retry behavior, and storage URLs; (5) synthetic registration/sign-in/sign-out/reset and session expiry; (6) cart and unpaid checkout with server price/stock validation, duplicate retry and response-loss recovery; (7) customer A/B isolation and admin authorization; (8) wholesale application/approval and MOQ; (9) controlled email delivery/failure/retry if sender is configured; (10) upload permissions; (11) browser console, keyboard, and desktop/mobile layouts; (12) rollback owner and recovery instructions.

Acceptance: all applicable smoke steps have a retained command, screenshot, test report, or redacted provider-setting evidence; unconfigured email is explicitly reported as queued and remains a VIP UAT blocker if the client requirement expects delivery. Payments remain unavailable.


## 11. Phase 6 staging execution handoff

This is a runbook for a developer preparing a dedicated staging project. The execution record below supersedes the earlier Phase 6 statement that no remote command had been run. Do not copy any value from `.env.cloud.local`; set staging values independently and keep secrets in the provider secret store.

### A. Create the isolated target

1. Create an empty Supabase project named `DAIRI Staging` in the client-approved region, and record its project ref privately. Confirm the ref differs from every known production ref before using it.
2. Create a separate host Preview/Staging environment and hostname, for example `staging.<client-owned-domain>`. Use the host's DNS verification instructions; add only the staging CNAME/record, enable HTTPS, and do not repoint the production apex or `www` record.
3. Require an identity gate or allowlisted staff access at the staging hostname. Keep test credentials synthetic and scoped to staging. The public Supabase project URL remains directly callable by clients, so the website access gate alone is not API abuse protection.
4. Configure the staging Supabase Auth **Site URL** to the exact HTTPS staging origin. Add only that origin and the required auth callback path to the Redirect URL allowlist. Keep email confirmation enabled for customer signup unless the client explicitly approves another UAT setup. Remove unused local redirect URLs from this remote project's allowlist.
5. Create the staging Storage bucket `product-media` in that project only. Apply and verify the repository storage policies; do not copy production objects.

### B. Set build/runtime configuration

Set the following host build values only in the staging environment:

- `VITE_SUPABASE_URL`: staging project's HTTPS API URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: staging project's publishable/anon key.
- `VITE_PUBLIC_SITE_URL`: empty, to keep the build `noindex`.

Do not set `VITE_SUPABASE_SERVICE_ROLE_KEY`, database passwords, Resend keys, payment keys, or production values. Supabase provides Edge Function runtime URL/keys to the function environment. Keep any service-role key server-side. Verify variable names and destination project ref without printing key values.

For a reproducible host build, use the repository-declared `pnpm@11.25.0` with a Node release supported by that pnpm version. The previously available Node 22.12 did not run the declared pnpm; resolve this in the host/CI image rather than changing lockfiles during staging provisioning. Run `pnpm install --frozen-lockfile`, `npm run test:audit`, and `npm run build` in CI. A host failure must be fixed before deploying a build artifact.

### C. Review and apply migrations safely

1. Confirm the staging ref in the dashboard and private environment inventory. Inspect pending SQL and the full migration list; use the 13-file sequence in section 3.
2. On the empty staging project, capture the provider-supported initial backup/restore point. From the repo root run `supabase migration list --project-ref "$STAGING_PROJECT_REF"` and `supabase db push --dry-run --project-ref "$STAGING_PROJECT_REF"`. Confirm the project ref and dry-run diff before applying.
3. Apply with `supabase db push --project-ref "$STAGING_PROJECT_REF"` only after the project owner explicitly authorizes the staging target. Never use `db reset`, never use a link target that has not been confirmed, and never use production credentials.
4. Run the complete anon/customer-A/customer-B/wholesale/admin RLS matrix from section 4 and retain the output with keys/tokens redacted. Stop if any cross-user read, customer admin write, or unauthorized stock change succeeds.

### D. Deploy and limit Edge Functions

1. From the repo root and only after ref confirmation, use `supabase functions deploy customer-actions --project-ref "$STAGING_PROJECT_REF"`.
2. The source has DB subject windows and a body cap but wildcard CORS and no trusted source-IP window. Before exposing the URL, the hosting owner must confirm the actual ingress architecture and configure provider-level function/API rate limiting or a controlled proxy that sees trusted client IPs. Do not rely on Cloudflare rules on the website hostname for calls sent directly to `*.supabase.co`.
3. Keep browser origin policy and CORS aligned with the staging hostname before UAT. CORS only controls browser reads; authentication, RLS, and server rate limits remain required.
4. Test OPTIONS and authenticated/unauthenticated POST behavior, malformed and oversized bodies, subject and IP limits, 429 responses, and no-write/no-stock-change behavior using bounded synthetic requests. Do not use production recipients or repeat requests at high volume.
5. Current environment has no Deno CLI in PATH or in the disposable Edge Runtime container. In approved CI, pin Deno 2.x and run `deno fmt --check supabase/functions/customer-actions/index.ts`, `deno lint supabase/functions/customer-actions/index.ts`, and `deno check supabase/functions/customer-actions/index.ts`. There are no function tests yet; add focused tests before claiming `deno test` coverage. CI should use the project `supabase/functions/` source and cache imports in a controlled build, not install Deno globally on a developer machine.

### E. Email, secrets, and storage

For Gate A, leave `RESEND_API_KEY` and `DAIRI_EMAIL_FROM` unset. This prevents outbound email; queued/no-sender behavior must be stated in internal demos. For UAT, the owner must supply a verified staging sender and controlled recipient list, store the key only in the staging function-secret manager, then verify success, rejection, retry, and duplicate-dispatch handling. Do not place secrets in terminal arguments, `VITE_*`, source control, or screenshots.

Upload synthetic images to the staging-only `product-media` bucket. Verify public read only for intended catalog assets, admin-only writes, type/size limits, and that every URL points to the staging project's storage host. No production media or user uploads are copied.

### F. DNS, smoke, and rollback

Before any internal invitation, open the HTTPS staging hostname and confirm the identity gate, `noindex`, app build, and Supabase project ref. Run the smoke sequence in section 10; add the headless DAIRI PDF fixture export and selected browser admin/session checks. Confirm customer A/B RLS and Edge synthetic requests. Record the exact deployed commit and migration version.

Name one host owner and one rollback operator. If an app smoke fails, roll the host back to the last known-good staging build. For schema/data issues, pause writes and use the staging restore point under the owner runbook; prefer a reviewed forward corrective migration and never reverse by connecting staging to production. Record restored app commit, migration version, and any staging-only data loss. No production rollback step is part of this staging runbook.

### G. Staging provisioning execution record — 2026-10-24

- **Supabase target:** project `dpgyvodfjrwclnwpwxlp`, confirmed by the owner as the DAIRI test project with no live customer data. Region selection was America. No production project or credentials were used.
- **Migration history:** the remote schema already contained the initial migration's objects, but its migration history was empty. The initial version `20261020000100` was recorded as applied after checking the base tables, functions, triggers, storage bucket, RLS enablement, and expected policies. `supabase db push --dry-run` then showed exactly the 12 later migrations listed above. Those 12 were applied successfully in order. The wholesale pricing migration was adjusted before application to retain the legacy `product_variants.wholesale_price` column during staging; its values are copied to `wholesale_variant_prices`, and no column was dropped.
- **Edge Function:** `customer-actions` deployed successfully to the same project. The provider reported the function as ACTIVE. Deno CLI format/lint/typecheck was not run; the Supabase runtime bundle succeeded.
- **Cloudflare Pages:** the `dairi-staging` project exists at `https://dairi-staging.pages.dev`. A Cloudflare Access self-hosted application now protects that exact hostname with an Allow policy scoped to the Cloudflare account's sole member. Access enforcement has not yet been tested from an unauthenticated browser. No site deployment has been uploaded yet.
- **Prepared artifact:** the static, `noindex` build targeting the confirmed Supabase test project is in `/private/tmp/dairi-pages-pre-release-20261024`; ZIP for dashboard upload is `/private/tmp/dairi-pages-staging-upload.zip`. The Chrome file chooser blocked automated local file selection because the ChatGPT extension lacks “Allow access to file URLs.” The dashboard is left on the Pages Direct Upload screen. A human must choose the ZIP, deploy it, then verify Access protection and run the smoke sequence.
- **Safety:** no Resend, Stripe/payment, service-role browser variable, production data, or production credential was added. No destructive database command was run. A source migration was changed to retain the legacy wholesale column before remote application.
- **Still required before calling Gate A ready:** upload and deploy the prepared artifact; verify unauthenticated redirect and authorized page access; confirm staging Auth URL/redirect allowlist and storage isolation; perform staging browser/Edge smoke and RLS checks; configure or document provider-level per-IP limits for directly callable function routes. No UAT or production invitation is authorized by this record.
