# Contributing to the MetaliQ theme

## Before you push

Every change must pass the same checks CI runs:

```bash
shopify theme check      # must report no offenses
shopify theme dev        # look at the pages you touched, at 375px and 1440px
```

Both are cheap. The theme currently checks clean, and it should stay that way.

## Conventions

- **No hardcoded customer-facing text.** Storefront copy goes in `locales/en.default.json` and is
  rendered with `{{ 'key' | t }}`. Theme-editor labels go in `locales/en.default.schema.json` and
  are referenced as `"t:some.key"`. Only English is added here; translators handle the rest.
- **No hardcoded design values.** Colours, widths and radii come from CSS custom properties
  declared in `snippets/css-variables.liquid`, which reads them from theme settings.
- **Section-scoped CSS.** Page-specific styles belong in that section's `{% stylesheet %}` block.
  Only genuinely global styles go in `assets/critical.css`. If two sections need the same rules,
  put them in a snippet and render it from both — theme check will flag the alternative.
- **Never display a price the checkout will not charge.** See the made-to-order sizing section of
  the README. This is the one rule in this repo with money attached to it.
- **Readable source.** Liquid is rendered server-side; minifying it by hand buys nothing and costs
  reviewable diffs. One tag per line, formatted schemas.
- **Every snippet gets a `{% doc %}` header** describing its parameters.

## Steps

1. Create a branch: `git checkout -b short-description`
2. Make the change, run the checks above
3. Commit with a message that says what changed and why
4. Open a pull request

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).
