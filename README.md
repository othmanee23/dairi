# DAIRI

DAIRI is a fashion storefront and catalog admin built with React, React Router, and Vite.

## Run locally

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Vite prints the local URL when the development server starts. Build the static app with:

```sh
pnpm build
```

## Local preview behavior

Catalog edits, collections, lookbooks, shopping bag, wishlist, sample orders, support requests, newsletter signups, settings, and the demo admin session are saved in this browser's local storage. The admin sign-in accepts any non-empty email and password for local preview only.

Checkout creates a sample order without taking payment. Password reset does not send email. A hosted launch needs server-backed authentication and data storage, a payment provider, transactional email, and order fulfillment configured for DAIRI.
