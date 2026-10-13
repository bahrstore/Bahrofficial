# Bahr storefront

Headless Shopify storefront for Bahr (car and mobile accessories, Bahrain): React 19, Vite, TypeScript.
Shopify is the backend through the **Storefront API** (GraphQL); checkout and payment happen on
Shopify's hosted checkout. There is no server of our own.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the Shopify values
npm run dev
```

There is no mock or sample data: without the Shopify variables every page shows a "couldn't load" state and
the browser console says `Shopify is not configured`. Vite reads `.env` only at startup — restart
`npm run dev` after changing it.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` / `npm run typecheck` / `npm test` | ESLint, TypeScript, Vitest unit tests |

## Configuration

See `.env.example`. Only the **public Storefront token** belongs in the app — everything prefixed `VITE_`
ships to the browser. No Admin API access is used or needed.

All data comes from the Storefront API: `src/lib/shopify.ts` (the functions components use) →
`src/lib/storefront.ts` (GraphQL client).

## What the store must have in Shopify

- **Collections** with the handles `car-accessories`, `mobile-accessories` and `trending` — their
  products (in the collection's sort order) fill the three collection pages, and a product's collections
  set its breadcrumb. A missing collection shows the "page not found" screen.
- The same collections set each product's category everywhere else: the home page's All / Car / Mobile
  filter, the category label on cards and in search, and the "Trending" badge. A product in neither
  `car-accessories` nor `mobile-accessories` shows no category. The **`new` tag** shows the "New" badge.
- **Policies** (Settings → Policies): shipping, refund, privacy and terms of service. The footer's
  Delivery / Returns / Privacy / Terms pages show exactly what is published there.
- **Payments / delivery**: the site says "Cash on delivery available across Bahrain". Confirm the
  checkout really offers COD and ships across Bahrain, or change that copy in `src/data.ts`.
- **Markets**: Bahrain enabled with BHD, so `@inContext(country: BH)` prices match checkout.
- **Arabic**: product titles/descriptions translated (Translate & Adapt) to show in Arabic.

## Deploying

`dist/` is a static single-page app. Unknown paths must be rewritten to `index.html` so that
`/products/...`, `/collections/...` and `/pages/...` work on refresh and direct links — `vercel.json`
(Vercel) and `public/_redirects` (Netlify, Cloudflare Pages) already do this.
Set the `VITE_SHOPIFY_*` variables in the host's build environment.
