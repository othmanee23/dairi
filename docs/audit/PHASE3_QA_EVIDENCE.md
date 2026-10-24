# DAIRI Phase 3 QA Evidence — 2026-10-24

This report records the locally verifiable checks requested by Phase 3. It uses synthetic records and a separate disposable Supabase stack on loopback ports 55421–55424. No remote project, production service, real customer data, or payment was used. Test-created orders and rate-limit state remain in the disposable database because destructive database operations were prohibited.

## Technical checks completed and verified

- `npm run test:audit`: **15 passed, 0 failed**.
- `npm run test:checkout-db`: **2 passed, 0 failed, 0 skipped** in the previously recorded run against the disposable stack. It covered auth/RLS boundaries, checkout replay, response-loss recovery, request mismatch, failed-transaction retry, server pricing, stock contention, and public action limit threshold.
- `npm run build`: **passed**. SEO indexing stayed disabled because local `VITE_PUBLIC_SITE_URL` is not an HTTPS origin.
- `git diff --check`: **passed**.
- Supabase `customer-actions` ran with local Edge Runtime 1.77.4, which reports Deno 2.1.4 compatibility. OPTIONS preflight returned 200, GET returned 405, anonymous `update-tracking` returned 403, and invalid quantity returned 400. A synthetic unpaid order returned 200 with email status queued.
- Full guest browser journey completed: storefront product → product detail → cart → checkout → unpaid order confirmation. The DB showed one order, one item, status pending, and $20 USD total. Rapid double-click produced one confirmation and exactly one order row for that synthetic guest identity. Current variant inventory reflected the single decrement per successful test order.
- DB integration tests verified lost-response recovery; a browser request interruption was not separately simulated.
- Browser profile already signed into a customer account initially rejected an unrelated synthetic checkout email, as expected from the account/email match check. The account identity was not inspected or used. Successful guest checkout then ran in a fresh isolated browser session.
- Representative storefront, cart, confirmation, and a long-title product page were reviewed at desktop and a 390 px viewport override. Embedded-browser document client and scroll widths matched at each inspected route (433 CSS px reported).
- DAIRI A4 line-sheet PDFs for 0, 1, 9, 10, and 27 products were generated and visually checked page-by-page. Cover, back, contact layout, first-seen color grouping, 3×3 full pages, pagination, image proportions, clipping, margins, USD appendix, current product prices, unavailable-price text, missing-image fallback, and blank-page behavior passed. Synthetic image assets were used. Prices remain dynamic.
- A focused checkout error helper now displays the server response message when Supabase returns a non-2xx function response. Unit tests cover server-message and fallback behavior.

## Technical checks still failing or incomplete

- The standard catalog export with a zero-product fixture still prints the cover masthead and cover image on two physical pages. This is a known open defect; the existing export was preserved.
- Backend catalog outage, stale-cache suppression, and recovery were not injected in the browser.
- Browser local/session storage, account sign-out, and guest confirmation expiry were not inspected live.
- Full browser admin UI, customer account, wholesale, and all loading/empty/success/error states were not covered. Database RLS tests do not replace these.
- Email delivery remained queued because no sender configuration was present; delivery, provider failure, and retry were not exercised.
- Trusted IP-based rate controls and environment-specific allowed-origin policy remain unconfigured/unverified.
- No Deno CLI is installed, so Edge formatting, lint, and static typecheck were not run. Local runtime execution is not a typecheck.
- There is no `tsconfig.json` or TypeScript compiler dependency. Vite production build passed, but no semantic frontend typecheck ran.
- Clean frozen install, dependency audit, CI/deploy Node and pnpm version, and hosted build were not checked.

## Finding status

| Status | Findings | Evidence / remaining acceptance |
|---|---|---|
| **Fixed and verified locally** | DAIRI-03 | DB integration replay/recovery coverage plus browser guest order and duplicate-click count verified. Remote behavior remains gated on isolated staging. |
| **Fixed but not verified** | DAIRI-05, DAIRI-10 | Catalog error handling and safe persistence have code/unit evidence; outage/recovery and browser storage/session checks remain. |
| **Requires configuration** | DAIRI-01, DAIRI-04, DAIRI-06 | Prove remote staging project/host isolation; configure trusted IP/origin policy; configure verified non-production sender and mailbox. |
| **Requires client input** | DAIRI-02, DAIRI-07, DAIRI-09 | Approved policy text; shipping/tax rules and quote acceptance; unpaid cancellation/discount behavior. |
| **Still open** | DAIRI-08, DAIRI-11, DAIRI-12; standard catalog zero-item PDF split | Broader critical-flow/admin regression; atomic product writes; supported toolchain/typecheck/audit; fix and inspect standard export. |

## Separate release decisions

1. **Isolated staging: NO-GO.** Remote identity and separation remain unproven; client policy/business gates, configuration, and the standard PDF defect remain.
2. **VIP client UAT: NO-GO.** Do not invite the client until staging is isolated, policy and commerce decisions are approved, email is controlled, and outstanding regression work is completed.
3. **Production: NO-GO.** Staging readiness is not production readiness; operational monitoring, backups/rollback, approved business rules, email delivery, and production configuration have not been verified.

## Required actions

### Developer / project owner

- Establish and document the separate staging Supabase project and hosting target; prove the deployed app cannot use production credentials/data.
- Set environment-specific CORS origins and trusted IP abuse controls; never expose service-role secrets to the browser.
- Configure a verified non-production sender and controlled test mailbox.
- Fix zero-product standard catalog PDF pagination and rerun existing-export regression cases.
- Complete browser checks for catalog outage/recovery, storage/sign-out/expiry, admin order visibility, account roles, wholesale, responsive forms, and failure states.
- Run Deno format/lint/typecheck using an approved Deno CLI environment; pin supported Node/pnpm and run clean install, dependency audit, and hosted build checks.

### Client

- Supply approved privacy, terms, returns/refund policy text and publication approval.
- Approve shipping/tax rules, destination examples, and whether manual studio estimates are sufficient for UAT.
- Decide whether cancellation of an unpaid order restores discount redemption.
- Confirm the phone, fax, address, and website in the PDF template; provide final product photography and business content.

Payments remain out of scope. No test orders were deleted because the Phase 3 instruction forbids destructive database operations.

## Phase 4 closure evidence — 2026-10-24

### Commands and observed results

- `npm run test:audit`: **16 passed, 0 failed**, including a regression assertion for the standard catalog print CSS contract.
- `node_modules/.bin/vite build --configLoader runner --outDir /tmp/dairi-phase4-build`: **passed** (1,893 modules). The SEO generator passed when run against a temporary `/tmp/dist`; it emitted `robots.txt` with `Disallow: /` because no HTTPS public site URL is configured. A later canonical `npm run build` retry could not write to the existing repo `dist/` due sandbox `EPERM`; the Vite output and SEO checks were therefore run independently in temporary output locations.
- `git diff --check`: **passed**.
- `command -v deno`: **no executable found**. Formatting, lint, typecheck, and Deno tests were not run. Exact independent commands are in `STAGING_SETUP.md`.
- Disposable local Supabase was started on loopback ports 55421–55424 with existing synthetic data. It was stopped and restarted to produce an outage; no reset, migration, fixture creation, cleanup, or remote call was performed in Phase 4.

### Browser verification completed

- Anonymous visit to a protected lookbook preview redirected to `/auth/login`; anonymous `/store/account` redirected to `/auth/customer-login`.
- With the disposable backend stopped, `/store` displayed its unavailable state and hid the catalog rows. After the stack restarted, the Retry action restored all 27 synthetic catalog entries. **DAIRI-05 is fixed and verified locally for this failure/recovery path.** This does not verify every catalog error condition or staging behavior.
- Browser evaluation in the available read-only browser scope returned `undefined` for both `localStorage` and `sessionStorage`, so live key inspection was inaccessible. Unit persistence tests pass. Signed-in sign-out/expiry, admin UI authorization, customer cross-user browser access, and browser retry after auth/network failures were not completed. Prior database integration evidence remains the only evidence for those role boundaries; the destructive fixture-cleaning suite was not rerun in Phase 4.

### PDF defect status

- The print CSS fix keeps the standard cover masthead and image positioned within a single page; the new source-contract regression test passes.
- A temporary local HTML fixture using production styles generated `/tmp/dairi-phase4-standard-0.pdf`; `pdfinfo` reported **1 page**, and the rendered page showed the masthead and cover image together. Fixture PDFs for 1 and 9 products were also generated in Chrome; preview showed cover plus product content. These are harness documents, not exports from the authenticated application route.
- The real application export route could not be completed for 0/1/9/10/27 in this pass. The 10-product preview showed 3 pages with the cover intact, but that output was not saved; 27 was not generated. **Keep the PDF finding open / fixed but not verified until actual application exports at all five counts are saved and visually inspected.** The previously verified DAIRI line-sheet output is preserved and its implementation was not changed in this pass.

### Current finding classification

| Status | Findings | Phase 4 evidence / remaining acceptance |
|---|---|---|
| Fixed and verified locally | DAIRI-03, DAIRI-05 | DAIRI-03 retains Phase 3 disposable DB plus browser guest checkout/replay evidence. DAIRI-05 additionally passed backend outage/retry in browser. |
| Fixed but not fully verified | DAIRI-10, standard catalog PDF pagination | Persistence unit tests pass; browser storage/sign-out/expiry inaccessible. CSS regression and 0-product harness PDF pass; real route outputs at 0/1/9/10/27 remain. |
| Requires configuration | DAIRI-01, DAIRI-04, DAIRI-06 | Isolated project/host identity, trusted IP/origin policy, controlled sender and mail delivery are not configured/evidenced. |
| Requires client input | DAIRI-02, DAIRI-07, DAIRI-09 | Approved legal text, shipping/tax rules and quote acceptance, and unpaid cancellation/discount rule remain. |
| Still open | DAIRI-08, DAIRI-11, DAIRI-12 | Signed-in browser authorization and error recovery; atomic product/variant writes; supported clean install/typecheck/dependency/toolchain evidence remain. |

### Release decisions

1. **Internal isolated staging: NO-GO.** No staging project identity/isolation evidence; Edge static checks unavailable; PDF route verification incomplete; remaining required environment gates are listed in `RELEASE_GATE.md`.
2. **VIP client UAT: NO-GO.** Gate A is not clear, and client business approvals plus controlled client-facing content/email remain outstanding.
3. **Production: NO-GO.** Staging, client approvals, operations/rollback and production controls are not verified.

No production service, remote service, real customer record, or destructive database operation was used. See `RELEASE_GATE.md`, `STAGING_SETUP.md`, and `CLIENT_DECISIONS.md` for finite next actions.

## Phase 5 final technical verification — 2026-10-24

This pass continued on `fix/audit-remediation`. All database work used the already-running disposable local Supabase project `dairi-phase2-test-20261024` on loopback port 55421. No remote or production service was contacted; no existing records were deleted, and no database reset was run. Three synthetic accounts (one admin and two customers) and one synthetic USD order were added and remain in that disposable stack.

### Completed and verified

- **Actual authenticated catalog export, 0 products:** before the fix, Chrome's print preview showed two pages. The saved PDF `/tmp/dairi-phase5-catalog-0.pdf` confirmed the split: page 1 held the masthead and page 2 held the cover artwork. The export stylesheet was changed so only the selected print root participates in pagination and the cover retains its flex layout. The regenerated `/tmp/dairi-phase5-catalog-0-fixed.pdf` is one A4 page; the rendered page shows the masthead and cover image together with no extra page.
- **Actual authenticated catalog export, 1 product:** `/tmp/dairi-phase5-catalog-1.pdf` is two A4 pages (cover plus one product page). The rendered product page contains fixture SKU `P3-001` and dynamic price `$20.00`; no extra page was present.
- **Actual authenticated DAIRI line sheet, 1 product:** `/tmp/dairi-phase5-line-sheet-1.pdf` is five A4 pages (cover, contact, product, price list, back cover). Every page was rendered and visually checked after the shared print stylesheet changed. SKU `P3-001` and `$20` appear on the expected product/price pages; no blank page appeared. Earlier Phase 3 evidence for line-sheet counts 0, 1, 9, 10 and 27 remains historical evidence; only count 1 was rerun in Phase 5.
- **Disposable backend authorization:** synthetic customer A read its own order. Customer B received zero rows for A's order and profile. Anonymous access returned zero lookbooks. The approved synthetic admin read the synthetic order. These direct Auth/REST checks passed; they do not substitute for browser route/UI verification.
- **Build reproducibility:** final `node_modules/.bin/vite build --configLoader runner --outDir /tmp/dairi-phase5-build-final3` passed after the print fix (1,893 modules transformed). The canonical repository `dist/` build had previously hit sandbox `EPERM` while writing Vite temp/output files; the same build succeeds in `/tmp`, so the observed failure is an environment write restriction rather than a Vite compilation/configuration failure. Existing `dist/` artifacts were not overwritten.
- `npm run test:audit`: **16 passed, 0 failed** after updating the CSS contract test to cover print-root isolation and the flex cover layout.
- `git diff --check`: **passed** after code and test changes.

### Missing verification and observed tool failure

- **9, 10 and 27-product standard catalog PDFs:** not verified. The authenticated app showed the 9-product fixture loaded with 9 products and one product page, but the browser's `window.print()` flow remained at “Preparing…” and the Chrome app stopped responding to accessibility calls. No PDF was saved or inspected for these counts. No claim is made for 10 or 27.
- The print handoff failure is an observed browser-session failure during the 9-product attempt, but its cause could not be isolated between app, Chrome print preview and the UI automation bridge. Treat higher-count PDF exports as **unverified**, not as a confirmed application defect.
- **Browser storage privacy, sign-out, session expiration and UI authorization:** not verified. The browser evaluation scope did not expose `localStorage` or `sessionStorage`, and Chrome became unresponsive during the higher-count print attempt. The direct REST checks above verify selected RLS boundaries only. No live guest-summary retention, sign-out clearing, session expiration, admin page denial, or customer account navigation test was completed in this pass.
- **Edge Function static checks:** `deno` and a project-local Deno executable were not found. Formatting, lint, typechecking and Deno tests were not run; use the independent commands in `STAGING_SETUP.md`.
- Browser-controlled failure recovery for email delivery, token expiry and customer-facing retry was not rerun. Prior Phase 4 catalog outage/retry evidence remains separately recorded.

### Phase 5 finding classification

| Status | Findings / areas | Evidence / remaining acceptance |
|---|---|---|
| Fixed and verified locally | DAIRI-03, DAIRI-05; standard catalog cover geometry at 0 and 1 products | Existing checkout replay/recovery evidence and Phase 4 outage/retry evidence remain. Actual app PDFs at 0 and 1 now pass. The full 0/1/9/10/27 catalog matrix is still required before closing the PDF finding. |
| Fixed but not fully verified | DAIRI-10; standard catalog pagination; browser role/session flows | Persistence unit tests pass; direct local RLS checks pass for the tested rows. Storage/session and UI authorization remain unverified; 9/10/27 catalog outputs remain unverified. |
| Requires configuration | DAIRI-01, DAIRI-04, DAIRI-06; Edge Deno checks | Staging identity, trusted IP/origin policy, controlled sender and approved Deno runtime remain unavailable/configuration-dependent. |
| Requires client input | DAIRI-02, DAIRI-07, DAIRI-09 | Approved legal content, shipping/tax decisions, and unpaid cancellation/discount behavior remain pending. |
| Still open | DAIRI-08, DAIRI-11, DAIRI-12; 9/10/27 PDF outputs; browser persistence/auth flows | Complete browser checkout/admin/customer error recovery, atomic product/variant writes, supported toolchain evidence, actual higher-count PDFs, storage/sign-out/expiry, and role navigation checks. |

### Phase 5 release decisions

1. **Internal isolated staging: NO-GO.** 0/1 catalog exports now pass, but 9/10/27 exports, browser session checks, Deno checks and remote staging isolation are not verified; the remaining Gate A requirements still apply.
2. **VIP client UAT: NO-GO.** Gate A is not clear, and client business approvals plus controlled customer-facing content/email remain outstanding.
3. **Production: NO-GO.** Staging, client approvals, operational recovery and production controls are not verified.

### Synthetic data retention

The disposable local stack now contains `phase5-admin@example.test`, `phase5-customer-a@example.test`, `phase5-customer-b@example.test`, and one synthetic order numbered `P5-TEST-ISO-1792874257316`. These are test records only. They were left in place rather than performing database cleanup. Credentials are stored only in a mode-0600 temporary file under `/tmp` for local QA; no credential is included in this report.


## Phase 6 targeted verification and staging handoff — 2026-10-24

Phase 6 stayed on `fix/audit-remediation`. Browser and DB checks used the running local app on loopback port 5176 and disposable Supabase project `dairi-phase2-test-20261024` on port 55421. Headless Chrome used a new temporary profile; no native print dialog, remote service, production project, or real customer account was used. No destructive operation or commit occurred.

### Actual authenticated DAIRI template PDFs

Chrome DevTools Protocol drove the actual admin login and `/lookbooks/<synthetic-fixture>/preview` route. The only preview PDF action invoked the actual DAIRI template handler; its `window.print()` handoff was replaced in the temporary test page by a readiness signal, then Chromium `Page.printToPDF` applied the production print CSS. Fonts and every image were awaited before export. PDFs were saved under `/tmp/dairi-phase6-pdfs/`, rendered with `pdftoppm`, and all page thumbnails were reviewed; representative product/price pages were inspected at full size.

| Fixture products | PDF pages | Product sheets | Product cards | Verification |
|---:|---:|---:|---:|---|
| 0 | 3 | 0 | 0 | A4; cover/contact/back; no blank page |
| 1 | 5 | 1 | 1 | A4; one product and price appendix; no blank page |
| 9 | 5 | 1 | 9 | A4; exact 9-card sheet; no blank page |
| 10 | 6 | 2 | 10 | A4; boundary paginates 9+1 across two sheets; no blank page |
| 27 | 7 | 3 | 27 | A4; 9+9+9 product sheets; all 27 prices present; no blank page |

All page dimensions reported by `pdfinfo` were approximately 595 × 842 pt A4. `pdftotext` found every expected SKU twice for the 27-product output (once on product sheets and once in the price appendix), 27 numeric USD prices after correcting a malformed *synthetic fixture only*, and no `Price unavailable` label. Fixture `P3-009` intentionally/accidentally had no product image and rendered the designed “Image unavailable” fallback without clipping. The 27-product fixture's P3-027 database price was `NaN`; a targeted update changed only this synthetic product to `$52.50`, then the actual route export was repeated and the PDF showed `$52.50`. No customer, production, or remote data was changed. Earlier one-product DAIRI line-sheet export remains structurally unchanged and its Phase 5 visual evidence is retained.

### Headless browser security and persistence checks

Using the synthetic local admin in headless Chrome:

- Admin authentication and an admin-only route loaded successfully.
- `localStorage` held only `dairi-local-store-v1` plus Supabase auth while signed in. The persisted app object contained products, collections, lookbooks, cart, wishlist, and settings; it contained no orders, subscriber/support queues, or wholesale price field.
- Before UI sign-out, synthetic guest-order/retry sentinels were placed in `sessionStorage`. Sign-out returned to admin login and removed the Supabase auth item and both session items.
- Direct unauthenticated navigation to `/products` redirected to `/auth/login`.
- Setting the synthetic session expiry to the past and invalidating its refresh token caused `/products` to redirect to `/auth/login`.
- As a guest, browser storage had no auth token or session keys and persisted state contained no order/contact queues. An in-stock synthetic item was added through the storefront, then the page was reloaded; the cart item remained and appeared on `/store/cart` with no order/contact data persisted. No checkout was submitted.
- Customer A/B cross-customer order/profile denial and anonymous lookbook denial are retained from the Phase 5 direct REST checks; not repeated because no code affecting RLS changed. A customer-signed-in browser session and a live guest-checkout order-confirmation retention flow were not run in Phase 6.

### Tooling and release gate distinctions

- Installed Chrome plus native CDP provided the deterministic export and auth/storage checks without adding Playwright/Puppeteer dependencies. The prior native Chrome print-dialog stall was not repeated.
- Deno CLI is absent on the host and inside the disposable Supabase Edge Runtime container. No format/lint/typecheck/test command was run. The controlled Deno 2.x CI instructions are in `STAGING_SETUP.md`. This tooling gap is not a standalone blocker for a private synthetic-data staging deployment if provider function compilation and synthetic Edge smoke pass; it remains a pre-UAT engineering check.
- The 0/1/9/10/27 template export matrix now passes locally and does not block internal staging. It must be rerun only when template/print CSS changes, and approved client product/contact content is needed before UAT.
- Existing `npm run test:audit` now passes **17/17** after adding the single-template-download regression. The Vite build to `/tmp/dairi-preview-single-download-build` passes; repository `dist/` remains untouched.

### Gate decisions and remaining owners

1. **Internal isolated staging: NO-GO pending external setup.** This is no longer blocked by PDF or guest/admin local storage verification. Project/host identity, restricted staging access, actual Supabase function-ingress rate limiting, host build/runtime, migration/RLS rehearsal, staging bucket and function smoke remain. Actions are prioritized in `RELEASE_GATE.md` and executable in `STAGING_SETUP.md`.
2. **VIP client UAT: NO-GO.** Gate A must pass first; client must approve legal and commerce decisions, catalog/PDF contact data, and customer-facing copy; controlled staging email and customer-browser workflows must pass.
3. **Production: NO-GO.** UAT approval, production infrastructure/secrets/domain, legal and operational decisions, backup/monitoring/rollback, and payments (if later requested) remain outside Phase 6.

Synthetic admin/customer accounts and test orders remain in disposable local Supabase; synthetic P3-027 price is `$52.50` after the targeted fixture correction. The temporary credential file remains under `/tmp` with mode 0600 and is not included here.
