# DAIRI Feature Matrix

Status key: **Pass** = executed successfully for the stated scope; **Fail** = defect found; **Blocked** = required access/configuration is unavailable; **Not tested** = no execution evidence. A route returning HTTP 200 is only a host/router smoke check.

## Storefront and catalog

| Feature | Implemented | Functionally tested | Result | UAT readiness / dependency |
|---|---|---|---|---|
| Storefront landing and navigation | Yes | Route smoke only | Not tested at UI level | Needs browser responsive and navigation pass; final branded content pending. |
| Product listing and detail | Yes | Prior local browse/API checks; not rerun visually | Partial pass | Product content/images are demo seed content until client approves final catalog. |
| Category filters and price sorting | Yes in `ShopAll` | No repeatable UI test | Not tested | Add browser coverage for filters, sort, empty state, search state. |
| Product search | Yes in store header | No repeatable UI test | Not tested | Confirm matching fields and mobile/keyboard behavior. |
| Variants: size/color/SKU | Yes | Static plus prior catalog CRUD checks | Partial pass | Test duplicate variants, missing stock, and stale stock in UI. |
| Product visibility/draft handling | Yes through RLS/status and storefront filter | Source inspected | Partial pass | Verify admin changes immediately reflect in storefront. |
| Product images and fallback | Storage upload and public read exist | Not tested end-to-end in this audit | Not tested | Client must provide approved assets. Validate size/type rejection, partial upload cleanup, and responsive crop. |
| Out-of-stock validation | SQL rejects insufficient inventory; UI disables unavailable option | Prior stock/order checks noted | Partial pass | Add concurrent last-unit test and browser error recovery. |
| Demo seed catalog | 11 demo product rows in local seed | Source inspected | Not production content | Replace/approve with actual client products, prices, SKUs, inventory, and imagery before UAT sign-off. |
| SEO metadata/product schema | Implemented | Build passed; no crawler validation | Partial pass | Approved domain, canonical URLs, sitemap submission, Search Console, and old URL redirects remain external work. |

## Accounts and wholesale

| Feature | Implemented | Functionally tested | Result | UAT readiness / dependency |
|---|---|---|---|---|
| Customer registration/email confirmation | Yes | Prior local Mailpit flow passed | Pass in local test | Staging email provider and redirect URLs must be configured. |
| Customer login/session | Yes | Prior local sign-in/role checks passed | Pass in local test | Repeat with staging-only customer. |
| Password reset/update | Yes | Prior local Mailpit recovery flow passed | Pass in local test | Verify sender and expiry behavior in staging. |
| Admin login and role gate | Yes | Prior local authorized/unauthorized role checks passed | Pass in local test | Confirm production admin is created safely; no shared test admin in staging. |
| Wholesale application | Yes | Prior local application/decision flow passed | Pass in local test | Client approves fields, wording, eligibility, and final account terms. |
| Wholesale approval/rejection/MOQ | Yes; server RPC syncs profile | Prior RPC and profile sync passed | Pass in local test | Validate pricing coverage and MOQ against client business rules. |
| Wholesale pricing | Yes per variant, RLS-limited to approved profiles | Source reviewed; prior local role test | Partial pass | Test approved vs pending customer API reads against isolated staging. |

## Cart, checkout, and orders

| Feature | Implemented | Functionally tested | Result | UAT readiness / dependency |
|---|---|---|---|---|
| Add/remove/update cart and local persistence | Yes | No full current browser run | Not tested | Cart state can be stale after catalog/stock changes; server must remain authoritative. |
| Guest unpaid checkout | Yes; no payment collection | Prior local guest order/estimate test passed | Partial pass | Duplicate request/idempotency gap is HIGH; fix before UAT. |
| Signed-in customer checkout | Yes; server verifies profile/email and saves `user_id` | Source and prior auth/order checks | Partial pass | Test order history isolation in staging. |
| Server-side prices and order snapshots | Yes in SQL function | Prior order amount check passed | Pass in local test | Add changing-price-after-cart test. |
| Shipping estimates | Manual flat rate by destination or studio quote | SQL/static review | Partial; requirement gap | Client must provide actual rates. No carrier rate-shopping, labels, weight, or dimensions. |
| Tax estimate | Manual region percentage and taxable-shipping flag | SQL/static review | Partial; policy dependent | Client/accountant must approve jurisdiction rates and rules; not automated tax compliance. |
| Discount codes | Server validates eligibility/limit and increments in order transaction | Static only in this audit | Not tested | Cancellation does not release redemption count; fix/test before relying on capped codes. |
| Order number and order history | Unique order number; linked customer orders protected by RLS | Prior order flow; no cross-account API run now | Partial pass | Guest orders cannot be displayed in signed-in history; expected behavior needs client confirmation. |
| Cancel unpaid order/restock | Yes | Prior local cancel/restock test passed | Pass in local test | Limited discount redemption remains consumed after cancellation. |
| Paid order/refund/gift card | No | Not tested | Deferred | Payment-related work deliberately excluded for this release phase. |
| Shipment/tracking | Admin function validates role and carrier/tracking input | Prior admin/non-admin authorization test passed | Pass in local test | Test carrier link accuracy and state transitions in staging. |
| Order confirmation/shipment email | Outbox, Resend integration, retries | Queue behavior passed; actual delivery not verified | Blocked | Needs verified sender domain, staging secret, mailbox success/failure/retry test. |

## Admin and operational tools

| Feature | Implemented | Functionally tested | Result | UAT readiness / dependency |
|---|---|---|---|---|
| Product CRUD/visibility | Yes | Prior admin catalog insert/delete passed | Partial pass | Product+variant update is not atomic; test failure recovery. |
| Collection CRUD | Yes | Prior create/update/delete passed | Pass in local test | Check actual collection/product-count consistency. |
| Lookbook create/edit/preview/export | Yes; browser print to PDF | Prior CRUD checks; no visual PDF inspection here | Partial pass | Client must approve output/template and contact details; test PDF layout with final assets. |
| Customer/admin activity inbox | Yes for orders, support, newsletter | Static review | Not tested | Customer data access must be tested with role-negative scenarios. |
| Wholesale management | Yes | Prior approval/MOQ test passed | Pass in local test | Final client approval of qualification workflow required. |
| Shipping/tax settings | Yes, manual rules | SQL lint and source review | Partial pass | Not carrier integrations or tax advice; see DAIRI-07. |
| Discount administration | Yes | Static only | Not tested | Add eligibility, expiry, redemption race, and cancellation tests. |
| Image upload validation | Client and storage validations exist | Not tested | Not tested | Exercise MIME, oversize, corrupt, duplicate, and cleanup scenarios. |
| Admin guide | `docs/admin-guide.md` | Document reviewed | Partial | Guide is useful, but client training and support terms are external obligations. |

## Trust, build, and release

| Feature/check | Implemented | Functionally tested | Result | UAT readiness / dependency |
|---|---|---|---|---|
| Core RLS and admin authorization | Yes in migrations | Prior local negative/positive checks noted; source reviewed | Partial pass | Repeat on a clean staging project, including cross-customer order reads. |
| Edge public input validation | Yes | Static only | Partial | Rate limiting/bot defense absent. |
| TypeScript | CLI command not in package scripts | No-emit check executed | Pass | Pin/check this command in CI. |
| Production Vite compilation | Yes | Executed to `/tmp` | Pass | Vercel's pnpm command still needs compatible Node. |
| Database migrations/schema | Versioned SQL | `supabase db lint --local` | Pass | No clean staging migration rehearsal, backup, or rollback proof. |
| Automated regression tests | No suite found | None available | Fail/gap | Add isolated Playwright/API test coverage. |
| Staging deployment/isolation | Unknown | Not accessed | Blocked | Resolve DAIRI-01 first. |
| SSL, backups, monitoring, recovery | Outside repository | Not tested | Blocked | Verify provider settings, ownership, restore procedure, and incident contacts. |
| Performance/Core Web Vitals | No report | Not measured | Not tested | Run Lighthouse on staging after real images/catalog and approved domain are loaded. |

## Client items still needed

- Final product photography/content, prices, style numbers, SKU/inventory, colors and sizes; client brief mentions roughly 500 supplied images and mannequin preparation.
- Approved privacy, terms of service, returns/exchanges/refund policy, accessibility/contact wording.
- Approved shipping destinations/rates, carrier workflow, international policy, and weight/dimension data if calculated carrier quotes are required.
- Tax jurisdiction/rates and advice about where DAIRI has an obligation to collect.
- DAIRI-owned domain and access to Network Solutions/old-site URL list for transfer and redirects.
- Verified sender domain and permission/credentials for transactional email.
- Hosting account ownership/admin invitation, support/backup terms, and client-approved training/support expectations.

## Phase 2 implementation and release status — 2026-10-24

This section supersedes earlier statements that no test command or API abuse controls exist. It records the current code state and actual test evidence.

| Finding | Status | Updated evidence |
|---|---|---|
| DAIRI-01 | **BLOCKED BY EXTERNAL DEPENDENCY** | Staging backend and hosting identity remain unverified. |
| DAIRI-02 | **BLOCKED BY EXTERNAL DEPENDENCY** | Approved legal/policy text remains a client dependency. |
| DAIRI-03 | **FIXED BUT NOT VERIFIED** | Idempotency migration, app/Edge key transport, saved replay response, and transaction tests pass on a separate disposable loopback database. Browser-to-Edge checkout and browser failure recovery remain unverified. |
| DAIRI-04 | **BLOCKED BY EXTERNAL DEPENDENCY** | Request body cap and email/account rate windows are implemented; trusted IP-based throttling and origin policy require verified staging host configuration. |
| DAIRI-05 | **FIXED BUT NOT VERIFIED** | Demo labeling/error/retry state and unit coverage present; live backend failure/recovery was not exercised. |
| DAIRI-06 | **BLOCKED BY EXTERNAL DEPENDENCY** | Verified non-production sender and controlled mailbox are absent. |
| DAIRI-07 | **BLOCKED BY EXTERNAL DEPENDENCY** | Client shipping/tax rules and manual-quote acceptance remain pending. |
| DAIRI-08 | **OPEN** | 11 focused Node unit tests and 2 disposable-local DB tests pass, including auth/RLS boundaries and order replay. Complete browser critical-path/admin, catalog-failure, and email-retry coverage remains. |
| DAIRI-09 | **BLOCKED BY EXTERNAL DEPENDENCY** | Client cancellation/discount redemption rule is undecided. |
| DAIRI-10 | **FIXED BUT NOT VERIFIED** | Storage allowlist, PII-free expiry summary, hashed checkout retry record, and sign-out cleanup have unit coverage; live browser storage/session tests remain. |
| DAIRI-11 | **OPEN** | Product and variant writes are still not atomic. |
| DAIRI-12 | **OPEN** | Vite compile passes; supported clean install, typecheck, full build, audit, and host runtime remain. |

### Updated lookbook export

Lookbook preview includes a DAIRI line-sheet option. Its print output is A4, has a title/cover, contact page, color-grouped 3 × 3 product pages, a separate multi-page price list, and a back cover. Price values come from the current product `price` field in USD. The original generic catalog export remains available. Unit coverage passes for grouping, pagination, and formatting. Browser print-to-PDF output has not yet been rendered or visually checked; confirm that the supplied contact details are current before external distribution.

### Tests run in this pass

- `npm run test:audit`: **11 passed**.
- `npm run test:checkout-db`: **2 passed** on a separate disposable loopback Supabase stack; migrations and synthetic fixtures were isolated there. Existing local and remote databases were untouched.
- Vite production compilation to `/tmp/dairi-phase2-build-final2`: **passed**.
- `git diff --check`: **passed**.
- No remote endpoint or existing local database was used; database mutations were limited to synthetic fixtures on the disposable loopback stack and cleaned by the suite. No real customer data was used.

## Remediation evidence update — 2026-10-24

- Catalog fallback: configured-backend startup no longer renders cached catalog rows during the load; required read failures clear the catalog and show retryable status, and local `DEMO-*` seed products are visibly marked as preview. Local browser smoke passed for the preview label; backend error injection remains untested.
- Browser persistence: general local cache excludes orders, support requests, and subscribers; a one-hour, PII-free session summary preserves guest order confirmation. Focused unit tests pass; browser storage and logout behavior remain unverified.
- `npm run test:audit`: 5 focused tests pass. This does not change the overall automated regression coverage status: full auth/RLS, checkout/idempotency, order, wholesale, admin, and failure-recovery tests are still required.

**Phase 3 update:** Current storefront, checkout, PDF, and remaining feature coverage is recorded in [PHASE3_QA_EVIDENCE.md](./PHASE3_QA_EVIDENCE.md). Client UAT remains pending.
