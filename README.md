# DAIRI

DAIRI is a fashion storefront and catalog admin built with React, React Router, and Vite.

See [`docs/admin-guide.md`](docs/admin-guide.md) for product, collection, lookbook, wholesale, order, and settings instructions.

## Run locally

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Vite prints the local URL when the development server starts. Build the static app with:

```sh
pnpm build
```

## Local backend setup (Supabase)

The project includes a versioned Supabase schema and local CLI configuration. Store prices and orders use US dollars (USD). No staging or production Supabase project is linked.

1. Start Docker Desktop.
2. Run `pnpm run backend:start` from the project directory.
3. In another terminal, run `pnpm run backend:functions` to serve the local customer endpoint.
4. Copy `.env.example` to `.env.local` and set the local API URL and publishable key shown by `pnpm run backend:status`.
5. Run `pnpm run backend:reset` once to apply migrations and seed the USD products, collection, lookbooks, and store defaults. **This resets the local database.**
6. Run `pnpm dev` and open `http://127.0.0.1:5173`.
7. In local Supabase Studio (`http://127.0.0.1:54323`), create an administrator user in Auth, then promote that exact user in the SQL editor: `update public.profiles set role = 'admin' where email = 'ADMIN_EMAIL';`

The local admin login validates a Supabase session and the profile's `admin` role. Products, collections, lookbooks, store settings, images, orders, support requests, and newsletter signups use Supabase. Cart and wishlist remain in the browser. Customer submissions run through the `customer-actions` Edge Function. Checkout creates an unpaid USD order using prices verified from the catalog; it does not take payment. Stripe is not configured. Run `pnpm run backend:lint` and `pnpm run build` for local checks. Keep `.env.local` and service-role keys out of Git; the browser only receives the publishable key.

## Search visibility

Public storefront routes set page titles and descriptions; product routes also add Product structured data using USD prices. The build creates `robots.txt` and a sitemap containing published products and collections from the configured public Supabase API. Local and staging builds stay `noindex` and disallow crawling unless `VITE_PUBLIC_SITE_URL` is set to the approved production HTTPS origin. Set that variable only for the production build after the client’s domain is connected and approved. Submit the resulting `/sitemap.xml` to Google Search Console after the client verifies domain ownership.

## Transactional email

Order confirmations and shipment notices are recorded in a database outbox as part of the order or shipment update. The Edge Function sends them through Resend when `RESEND_API_KEY` and `DAIRI_EMAIL_FROM` are configured as function secrets. For local delivery, copy `supabase/functions/.env.example` to `supabase/functions/.env` and use a Resend key plus a sender on a verified domain. Keep the actual `.env` file out of Git. If credentials are absent or delivery fails, the order or shipment update still succeeds and the email stays queued; an admin can retry queued email delivery from Client Activity. Scheduled retries can be enabled later with Supabase Cron. Never put the Resend key in a `VITE_` variable.
