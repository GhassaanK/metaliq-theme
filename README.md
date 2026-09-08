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

Inter ships with the theme as a subset `.woff2` file and is preloaded from
`snippets/fonts.liquid`. Headings use the merchant-selectable Shopify font configured in the theme
settings, with Playfair Display as the default.

## Product dimensions and custom requests

Each catalog product has one listed size, recorded in its Shopify product description. The product
page does not calculate alternate sizes or label any size as standard. Customers who need different
dimensions open a prefilled WhatsApp conversation for a separate quote.

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
