# MetaliQ

The Shopify theme for **MetaliQ** — custom CNC-cut metal wall art, made to order in Pakistan.

Built on Shopify's [Skeleton Theme](https://github.com/Shopify/skeleton-theme) and shaped into an
editorial storefront: a full-bleed hero, a staggered collection grid, and a made-to-order product
page that prices a piece by the wall it is going on.

## Getting started

You need the [Shopify CLI](https://shopify.dev/docs/api/shopify-cli). The
[Shopify Liquid VS Code extension](https://shopify.dev/docs/storefronts/themes/tools/shopify-liquid-vscode)
is strongly recommended for Liquid linting and completion.

```bash
shopify theme dev      # preview against a development store
shopify theme check    # lint — must pass clean before pushing
shopify theme push     # deploy
```

## Architecture

```
.
├── assets          # critical.css, theme.js, brand webfonts, icons
├── blocks          # reusable, nestable theme blocks
├── config          # global theme settings and their saved values
├── layout          # theme.liquid and password.liquid
├── locales         # en.default.json (storefront), en.default.schema.json (editor)
├── sections        # one section per page type, each owning its own CSS
├── snippets        # css-variables, fonts, product-card, breadcrumbs, address-fields
└── templates       # JSON templates, including templates/customers
```

### Styling

`assets/critical.css` holds only what every page needs: design tokens, the reset, layout
primitives, the header and footer, and shared components (buttons, form controls, product cards).
Everything page-specific lives in a `{% stylesheet %}` block inside its own section. Shopify
concatenates those into a single stylesheet and emits each one only once, so a shared block —
`snippets/account-styles.liquid`, for instance — can be rendered by several sections safely.

Design tokens are **not** hardcoded. `snippets/css-variables.liquid` renders every colour, width
and radius from `config/settings_schema.json` into CSS custom properties, so the palette is
editable in the theme editor. `critical.css` repeats the defaults in `:root` purely as a fallback.

### Typography

Fraunces (display) and Inter (body) ship with the theme as subset `.woff2` files.
`snippets/fonts.liquid` declares and preloads both — the `@font-face` `src` uses `asset_url` so it
matches the preload URL exactly, which a relative path inside `critical.css` would not.

## Made-to-order sizing

The product page lets a customer scale a piece to their wall. **Line item properties cannot change
what Shopify charges**, so the theme never shows a scaled price it cannot collect. Two modes:

**Configured (recommended).** Create a hidden product called something like *Custom sizing* with a
single variant priced at one unit of your currency (e.g. PKR 1), then select it under
**Theme settings → Custom sizing**. When a customer picks a custom size the theme adds two linked
line items via the Cart AJAX API: the piece itself, and however many surcharge units make up the
difference. The displayed price is then exactly what checkout collects, and the cart folds the two
lines back into one. The surcharge unit price is read from the product itself, so it cannot drift
out of sync with the setting.

**Not configured.** Custom sizes show the standard price plus a clearly labelled *estimate*, and
the add-to-cart button becomes **Request this size**, linking to the quote page with the piece and
dimensions prefilled into the contact form.

Two constraints worth knowing:

- A custom size can only be **larger** than the standard size. A line item can add money to a cart
  but never subtract it, so smaller-than-standard has to be quoted.
- Custom-size cart lines have a **fixed quantity**. The piece and its surcharge units must move
  together; adding the piece again is exact, re-deriving the ratio in the cart is not.

Pricing basis is per-product-template: **by area** (default — doubling the height quadruples the
price, matching sheet cost) or **by height**.

### Product metafields

Each product's standard dimensions come from two optional metafields:

| Namespace | Key              | Type    |
| --------- | ---------------- | ------- |
| `custom`  | `default_width`  | Decimal |
| `custom`  | `default_height` | Decimal |

If they aren't defined, the product section falls back to its own **Default width / Default
height** settings (2 × 2 ft out of the box), so the theme works before the metafields exist.

## Schemas

- **Single CSS property** driven by a setting → pass it as a CSS variable in `style="--x: …"`.
- **Multiple CSS properties** → switch a class and define the variants in `{% stylesheet %}`.
- All merchant-facing labels use `t:` keys from `locales/en.default.schema.json`; all
  customer-facing copy uses `{{ 'key' | t }}` from `locales/en.default.json`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). CI runs `shopify theme check` and validates every JSON
file on each push and pull request.

## License

See [LICENSE.md](./LICENSE.md). This theme is built on Shopify's Skeleton Theme, whose licence
grants broad rights but limits use to themes that integrate with Shopify — which is what this is.
