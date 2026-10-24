# DAIRI Client UAT Checklist

Use only the isolated staging site after the release gates in `RELEASE_DECISION.md` are cleared. No real payment should be attempted; checkout is currently an unpaid order request. For each item, the client or QA tester marks one result and records notes.

**Remediation note (2026-10-24):** release remains NO-GO. Disposable-local database tests pass for checkout idempotency and auth/RLS boundaries, but browser storefront-to-order verification, environment gates, and client inputs remain. Do not treat this checklist as cleared. Finding status is in `REMEDIATION_PLAN.md` and `RELEASE_DECISION.md`.

## Storefront

- [ ] Pass [ ] Fail — On desktop, tablet, and phone, the storefront opens without layout overlap or broken navigation. **Expected:** menus, text, product imagery, and buttons fit the screen and remain usable.
- [ ] Pass [ ] Fail — Open the shop and browse each approved category. **Expected:** only published/visible approved products appear in the correct category.
- [ ] Pass [ ] Fail — Search by product name and style number; try a term with no matches. **Expected:** matching products open correctly and no-match state is clear.
- [ ] Pass [ ] Fail — Sort by price and name; apply and clear price/category filters. **Expected:** displayed products and prices update consistently.
- [ ] Pass [ ] Fail — Open a product, select each color and size, and view its details. **Expected:** correct image, SKU/size combination, price, stock state, and description appear.
- [ ] Pass [ ] Fail — Try an out-of-stock option. **Expected:** it is clearly marked unavailable and cannot be added to the bag.
- [ ] Pass [ ] Fail — Open footer links for Privacy, Terms, Returns, Contact, and Wholesale. **Expected:** each link opens the approved content or correct application page, not a generic unrelated screen.

## Customer account and wholesale

- [ ] Pass [ ] Fail — Register a new staging customer and confirm the email. **Expected:** one account is created and confirmation returns the customer to DAIRI.
- [ ] Pass [ ] Fail — Sign in, sign out, then sign in again. **Expected:** account state is clear and logout ends the session.
- [ ] Pass [ ] Fail — Request a password reset and set a new password. **Expected:** only the account owner can use the time-limited link; the new password works.
- [ ] Pass [ ] Fail — Submit a wholesale application with complete business details. **Expected:** the customer sees a clear submitted/pending state and cannot create duplicate pending applications.
- [ ] Pass [ ] Fail — As admin, approve/reject the application and set the MOQ. **Expected:** the decision appears in the customer account and wholesale prices are visible only after approval.
- [ ] Pass [ ] Fail — Submit a wholesale checkout below and at MOQ. **Expected:** below-MOQ order is blocked; valid MOQ order uses the approved variant wholesale prices.

## Cart and unpaid checkout

- [ ] Pass [ ] Fail — Add multiple variants, change quantities, remove an item, and refresh the page. **Expected:** the bag shows the correct variants and quantities.
- [ ] Pass [ ] Fail — Change a product price or stock in the admin after placing it in a bag. **Expected:** checkout uses current server-side catalog values and rejects unavailable stock.
- [ ] Pass [ ] Fail — Enter valid delivery details and submit an order. **Expected:** an unpaid order is created with an accurate server-calculated USD total; no payment is collected.
- [ ] Pass [ ] Fail — Leave shipping/tax rules unconfigured. **Expected:** checkout clearly says the studio must confirm those amounts before payment.
- [ ] Pass [ ] Fail — Use a valid, invalid, expired, and ineligible discount code (if client-approved test codes exist). **Expected:** only eligible discounts apply and totals match the approved rules.
- [ ] Pass [ ] Fail — Retry checkout after a simulated timeout. **Expected:** one order and one inventory reservation exist for the checkout attempt. **Current release gate:** verify the complete browser-to-Edge workflow and UI recovery before this can pass.
- [ ] Pass [ ] Fail — Reopen order confirmation and customer order history. **Expected:** correct order details are visible only to the proper account; guest-order behavior is explained.

## Admin and fulfillment

- [ ] Pass [ ] Fail — Sign in as admin and create/edit/publish/hide a product with variants. **Expected:** valid content saves and storefront reflects it; invalid SKU/stock values are rejected.
- [ ] Pass [ ] Fail — Upload accepted and rejected image types/sizes. **Expected:** accepted images display; invalid/oversize files show an understandable error and leave no orphan files.
- [ ] Pass [ ] Fail — Create/edit a collection and lookbook; preview and export the lookbook PDF. **Expected:** selected products, branding, prices, and images are correct on every page.
- [ ] Pass [ ] Fail — Cancel an unpaid order. **Expected:** order is marked cancelled, reserved stock is released exactly once, and any discount policy is applied consistently.
- [ ] Pass [ ] Fail — Attempt the same admin tracking action as a customer. **Expected:** request is denied and order does not change.
- [ ] Pass [ ] Fail — As admin, add supported carrier and tracking details. **Expected:** order is marked shipped and account tracking link is correct.
- [ ] Pass [ ] Fail — Check order email delivery in a controlled mailbox. **Expected:** confirmation/shipment message arrives once with correct order details. **Current release gate:** verified sender and actual delivery must be configured first.

## Client sign-off

- Approved catalog and photography loaded: ____________________
- Approved shipping/tax and returns policies: ____________________
- Approved privacy/terms content: ____________________
- UAT tester and date: ____________________
- Open issues / sign-off notes: ____________________

**Phase 3 engineering checks (not client UAT):** Local synthetic guest checkout, duplicate-click check, Edge method/auth/input checks, and page-by-page DAIRI PDF QA are recorded in [PHASE3_QA_EVIDENCE.md](./PHASE3_QA_EVIDENCE.md). VIP UAT remains NO-GO.
