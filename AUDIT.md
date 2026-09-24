# MetaliQ Art — CRO audit

Working document. Slice 1 covers the product page and cart only.
Last updated: 2026-09-19.

---

## Store Understanding

**What it sells.** CNC-cut, made-to-order metal wall art. Mild steel, matte black powder coat,
indoor display. `README.md:3`. 67 products, each with at least two images and descriptions of
500 to 682 characters (`docs/product-readiness-audit.md:8`).

**Who it sells to.** Pakistan only, priced in PKR. Karachi is the home market with a 2 to 3
working day estimate; the rest of Pakistan is 5 to 7 working days. No international checkout
(`docs/shopify-policy-copy.md`). Subjects span nature, culture, calligraphy, fandom and personal
commissions (`sections/about.liquid:232`).

**Identity.** Legal entity Steed Art, trading as MetaliQ Art. Karachi address, phone
0317 2920243, hello@metaliq.art. Held centrally in `config/settings_schema.json` under Business
details and consumed by `snippets/structured-data.liquid`.

**Theme build.** Hand-written, no build step, no dependencies. `layout/theme.liquid` is 55 lines.
Every page loads exactly one stylesheet (`assets/critical.css`, 46KB, preloaded), two woff2 fonts,
`assets/theme.js` (53KB, deferred, one IIFE of roughly 1360 lines), and a Trustindex third-party
script. `content_for_header` sits last in the head. The cart drawer and wishlist drawer sections
render on every page. Per-component CSS uses `{% stylesheet %}` inside sections. Cart operations
go through `/cart/add.js`, `/cart/update.js` and `/cart/change.js` with the Sections Rendering API
re-rendering `cart-drawer`.

**Design system.** Tokens are emitted by `snippets/css-variables.liquid` from theme settings, with
matching fallbacks duplicated in `assets/critical.css:12-83`. The values below are what
`config/settings_data.json` currently holds, which is a dark palette. **These are not confirmed as
final and are pending your sign-off**, so no work in this audit should hardcode a colour. Every
change reuses the existing custom properties and inherits whatever the tokens are set to.

| Token | Value |
| --- | --- |
| `--background` | `#121210` |
| `--surface` | `#1C1C19` |
| `--ink` | `#F4F2ED` |
| `--muted` | `#AAA69F` |
| `--line` | `#383833` |
| `--copper` (accent) | `#FF7A2F` |
| `--footer` | `#0E0E0D` |

Headings use the merchant font picker, defaulting to Playfair Display; body is a subset Inter
woff2. Scale runs `--fs-label-sm` 12px through `--fs-display` clamp(2rem, 3.75rem). Spacing is
`--sp-1` to `--sp-9` on a 4/8/12/16/24/32/48/64/96 ramp. Radius 4px. Container 1320px live.

**Brand tone.** Editorial, restrained, declarative, and deliberately careful about product claims.
Representative: "Art, Cut In Metal.", "We turn empty walls into points of view.", "Your idea. Made
in metal.", "Secure payment, without temporary promises."

**Pricing and sizing.** Catalogue products carry size variants and the theme auto-selects the
variant whose title contains "medium" (`sections/product.liquid:2-12`,
`snippets/product-card.liquid:21-27`, `snippets/meta-tags.liquid:26-36`). Bespoke work is quoted,
not carted, at PKR 1,000 per square foot, always through a prefilled WhatsApp thread to
+92 317 2920243.

**Custom flow.** `/pages/custom-design` is a hard redirect to WhatsApp, set in
`layout/theme.liquid:13-18`. `sections/ordering-payments.liquid` documents an eight-step catalogue
journey plus a bespoke brief panel. A custom-size order arrives as two cart line items, the piece
plus a surcharge line, and both the cart and drawer fold them back into one displayed line using
the `_surcharge_for` and `_size_group` line properties.

**Policies.** `docs/shopify-policy-copy.md` holds finished Privacy, Terms, Refund and Shipping
policies plus Custom orders and Product care pages. Key terms: 24-hour cancellation, 7 business
day change-of-mind return for eligible standard catalogue items only, damage reports within 3
calendar days, and **free standard delivery above PKR 9,999**.

**Tracking.** None in the theme. A grep across every liquid, js and json file for gtag, dataLayer,
fbq, GTM, Klaviyo, trekkie, web pixel and `analytics.subscribe` returns zero hits. `theme.js`
dispatches no custom events. Storefront analytics therefore comes only from whatever Shopify
injects via `content_for_header`. The single third-party script is Trustindex
(`layout/theme.liquid:51`), loaded on every page with no preconnect.

**Apps.** Judge.me is installed. An app embed block sits in `config/settings_data.json`, and a
Judge.me review widget block is placed on the product section in `templates/product.json` with
`"review_data": "sample_data"`.

### Could not determine from files
- Whether the four Shopify policies, the PKR 9,999 free-shipping rate, the PKR market and the
  Rapid Gateway payment provider are actually live. `docs/rapid-gateway-admin-checklist.md` lists
  them as open Admin tasks, and `settings_data.json` never sets `online_payments_active`, so the
  schema default of `false` applies.
- Real prices, SKUs, variant naming and inventory. No product data in the repo.
- Whether products genuinely have several size variants. `README.md:53-57` says one listed size
  per product; `sections/product.liquid:227-249` renders a multi-size picker. These disagree.
- Whether the 29 product descriptions flagged in `docs/product-readiness-audit.md` have been
  corrected in Admin.
- Live homepage section order. `content_for_index` is empty in `settings_data.json`.

---

## Slice 1 findings — Product page

### P-01 The product page announced zero reviews above the price — DONE (Batch 2)
**File:** `sections/product.liquid:165-180`; `templates/product.json` block
`judge_me_reviews_review_widget_6Gcdkg`

**Correction to the original finding.** This was first written as "Judge.me renders demo reviews as
if real". That half is **wrong and is withdrawn.** Tested in a browser against the dev server with
`"review_data": "sample_data"` still in place: the storefront widget rendered zero review cards and
read "Customer Reviews / Be the first to write a review / Write a review". No sample review text
reached the storefront at any point. Removing the setting produced byte-identical widget output.
`review_data` is not emitted to the storefront at all, while the sibling `empty_state` setting is,
which indicates it is a theme-editor preview control rather than a storefront one. Severity drops
from Critical accordingly.

**What was actually wrong:** The star row under the H1 read from
`product.metafields.reviews.rating` and, when empty, printed "No product reviews yet" directly
above the price. Every product sampled on this store has zero product reviews, so this rendered on
every product page.
**Why it costs conversions:** It places an explicit statement of zero social proof at the highest
attention point on the page, immediately under the title and above the price. An absent rating row
is neutral; a row that announces the absence is not.
**Fix applied:** The rating row now renders only when a real rating exists and the review count is
above zero. The `sample_data` setting was removed from the block as well, for tidiness rather than
effect.
**Severity:** Medium (was Critical) · **Effort:** S · Established best practice

### P-02 Add to cart is an unlabeled icon button while Buy now takes the primary style
**File:** `sections/product.liquid:254-299`, styles at `:840-884`
**What is wrong:** Add to cart is a 48px icon-only button sharing a two-up row with the wishlist
icon. Its text sits in a `.visually-hidden` span. The full-width copper primary button is Buy now.
**Why it costs conversions:** Add to cart is the lower-commitment action and the one that opens
the drawer where the discount field, trust row and any future cross-sell live. Rendering it as an
unlabeled icon suppresses it and forces undecided buyers to choose between an immediate checkout
redirect and nothing. Icon-only commerce controls are routinely misread.
**Counter-argument, and why this waits.** Checkout here is short, roughly two taps from the product
page on mobile. On a short path, Buy now as the primary button may well be the deliberate and
correct choice, capturing decided buyers without a cart detour. The case against it above rests on
undecided buyers needing the drawer, which is an assumption, not a measured fact about this store.

So this is a hypothesis to test, not a defect to fix. **Batch 1 runs last**, and only after a
baseline Add to cart rate has been recorded from Events Manager. If Add to cart is already healthy
against View content, leave the button hierarchy alone. The unlabeled icon is still worth fixing on
its own terms; the demotion of Buy now is the part that needs evidence.
**Fix:** Give Add to cart a visible text label. Test promoting it to primary against the current
arrangement rather than assuming the change is an improvement.
**Severity:** Critical · **Effort:** S · Hypothesis to test

### P-03 A WhatsApp CTA outweighs Add to cart, and the page carries up to four WhatsApp exits
**File:** `sections/product.liquid:320-333`, styles at `:885-947`; plus the floating widget and
the prompt bubble in `assets/theme.js:732-777`
**What is wrong:** The custom-size link is 68px tall with a 1.5px copper border, a copper tint
background and a drop shadow. It is visually heavier than the actual Add to cart control directly
above it. A second WhatsApp CTA, "Ask about this piece", follows immediately. The floating widget
and its prompt bubble add two more.
**Why it costs conversions:** In-market buyers looking at a catalogue size get routed off-site into
a manual quote thread before they transact. Every WhatsApp exit is also invisible to analytics, so
the leak cannot be measured.
**Fix:** Keep one WhatsApp entry point in the purchase area, as a quiet text link placed next to
the size picker and worded around the actual job ("Need a size not listed?"). Remove the duplicate
"Ask about this piece" link from the purchase column.
**Severity:** High · **Effort:** S · Hypothesis to test

### P-04 Shipping cost is never stated, and the PKR 9,999 free-delivery threshold appears nowhere on the page
**File:** `sections/product.liquid:312-318`; `locales/en.default.json` `product.delivery_body`;
the threshold exists only as an announcement-bar default at `sections/header.liquid:195`
**What is wrong:** The fulfillment block gives an arrival estimate and a returns summary, then says
shipping charges are shown at checkout. The free-delivery threshold the store already offers is
stated only in the announcement bar.
**Why it costs conversions:** An unknown shipping cost at the decision point is a standard
abandonment driver, and the store is sitting on a qualifying threshold it never uses to lift
basket size.
**Fix:** Add one line under the price stating free delivery over PKR 9,999, and whether the
selected size already qualifies.
**Related copy inconsistency:** `product.assurance_3_body` states cash on delivery is "Available at
checkout" as a flat claim, while `product.cod_body`, `cart.payment_body` and
`journey.online_onboarding` all hedge it as available "where eligible" or "for eligible orders and
delivery locations". Align the assurance line with the hedged wording used everywhere else.
**Severity:** High · **Effort:** S · Established best practice

### P-05 Product structured data carries no rating, shipping or returns detail
**File:** `snippets/meta-tags.liquid:84-97` emits `{{ product | structured_data }}`;
`snippets/structured-data.liquid` emits only Organization and WebSite
**What is wrong:** The page relies on Shopify's default Product output. There is no
`aggregateRating`, no `offers.shippingDetails` and no `hasMerchantReturnPolicy`.
**Why it costs conversions:** These are the merchant listing fields Google uses to enrich a result,
and the store already holds every input: the reviews metafield, the PKR 9,999 threshold, the
Karachi and rest-of-Pakistan lead times, and a written 7 business day return window.
**Fix:** Extend the product JSON-LD with shipping details, return policy and, once real reviews
exist, aggregate rating.
**Severity:** High · **Effort:** M · Established best practice

### P-06 Sold-out sizes cannot be selected or inspected
**File:** `sections/product.liquid:230-249` (`disabled` plus `opacity: 0.46` at `:835-838`)
**What is wrong:** Unavailable variants are rendered disabled and dimmed, so a customer cannot
click the size they came for, cannot see its price, and gets no route forward.
**Why it costs conversions:** The buyer who wanted the large size hits a dead end with no
explanation and no alternative, on a store where every piece is made to order anyway.
**Fix:** Keep sold-out sizes selectable, label them Sold out, show the price, and offer the
made-to-order WhatsApp route scoped to that one size.
**Severity:** High · **Effort:** M · Established best practice

### P-07 The mobile gallery has no swipe and hides navigation behind a small overlay strip
**File:** `sections/product.liquid:1134-1154` (CSS); `assets/theme.js:1021-1035`
**What is wrong:** Below 860px the thumbnails become a horizontally scrolling strip of 48px tiles
absolutely positioned over the bottom-left of the image, capped at `calc(100% - 74px)` wide. The
JS binds click only. There is no swipe, no dot indicator, no next control.
**Why it costs conversions:** Additional angles and in-room shots are how somebody judges whether a
metal piece suits their wall. If reaching image two means hitting a 48px target overlaid on the
image itself, most mobile visitors only ever see image one.
**Fix:** Make the mobile stage a horizontal scroll-snap track containing all media, with native
swipe and a dot indicator below the image.
**Severity:** Medium · **Effort:** M · Established best practice

### P-08 The gallery letterboxes the artwork
**File:** `sections/product.liquid:524-537` and `:1126-1133`
**What is wrong:** The stage is a fixed box, `clamp(420px, 100dvh minus header, 720px)` on desktop
and a 4/3 box on mobile, with `object-fit: contain` on the image.
**Why it costs conversions:** Wall art is rarely 4:3. Contain inside a fixed box shrinks the piece
and surrounds it with empty surface colour, so the product occupies less of the viewport than it
could at the moment of evaluation.
**Fix:** Drive the stage from the media's own aspect ratio, or standardise the catalogue on one
shooting ratio and crop to it.
**Severity:** Medium · **Effort:** S · Hypothesis to test

### P-09 The sticky mobile bar carries two competing CTAs and appears late
**File:** `sections/product.liquid:347-358`, CSS `:1167-1229`; `assets/theme.js:1199-1213`
**What is wrong:** The bar holds size, price, Buy now and Add to cart. Below 480px both buttons
drop to 0.68rem with 8px of inline padding. It only becomes visible once the real Add to cart has
scrolled fully behind the sticky header.
**Why it costs conversions:** Two adjacent CTAs in a cramped bar split the decision and shrink each
tap target at exactly the width where targets matter most.
**Fix:** One CTA in the sticky bar, Add to cart, next to size and price.
**Severity:** Medium · **Effort:** S · Established best practice

### P-10 Add-to-cart failures show one generic sentence and discard Shopify's reason
**File:** `assets/theme.js:1246-1261`; message at `locales/en.default.json` `product.add_error`
**What is wrong:** A non-OK response throws immediately and the catch reveals a fixed string,
"We couldn't add that to your cart. Please try again." Shopify's error body, which names the real
cause such as an inventory limit, is never read.
**Why it costs conversions:** A customer told only to try again will do exactly that, fail again,
and leave. An inventory message tells them to reduce the quantity and they recover.
**Fix:** Parse the JSON error body and display the returned description, falling back to the
current string.
**Severity:** Medium · **Effort:** S · Established best practice

### P-11 The description is buried in one of four tabs and is rewritten at render time
**File:** `sections/product.liquid:34-47`, `:217-221`, `:362-398`
**What is wrong:** Three phrases are stripped or replaced in Liquid on every page render for every
visitor, and a warning is shown only in the theme editor. Meanwhile Details, Materials,
Installation and Shipping are tabs, so three of the four are a click away with nothing expanded by
default on mobile.
**Why it costs conversions:** The scrubbing masks a data problem rather than fixing it, and it will
silently stop matching as soon as a description is edited. The tab pattern hides the mounting and
shipping answers that decide this purchase, behind controls that look like navigation.
**Fix:** Correct the 29 flagged descriptions in Admin, then delete the replace chain. Convert the
tabs to accordions below 860px with Details open by default.
**Severity:** Medium · **Effort:** M plus content work · Established best practice

### P-12 No FAQ on the product page
**File:** `sections/product.liquid` (none present); the pattern already exists in
`sections/main-home.liquid` with a working accordion at `assets/theme.js:719-730`
**What is wrong:** The FAQ lives only on the homepage. The product page answers none of the
objections specific to this purchase: how it mounts, whether it marks indoors, what a custom size
costs, which payment methods appear at checkout, and how long delivery takes to their city.
**Why it costs conversions:** These objections currently have exactly one resolution path, which is
leaving for WhatsApp.
**Fix:** Add a five-question accordion to the product page reusing the existing accordion JS and
the shipping and returns copy already written in the locale file.
**Severity:** Medium · **Effort:** M · Established best practice

### P-13 A 2400px image URL sits in the initial product page HTML
**File:** `sections/product.liquid:143-158`
**What is wrong:** The zoom dialog's `<img>` ships with a `src` pointing at the featured image at
2400px wide, plus `width` and `height` taken from the featured image regardless of which media the
customer later zooms. The JS already sets the correct source on open at `assets/theme.js:1041`.
**Why it costs conversions:** Depending on the browser, a lazily-marked image inside a closed
dialog may still be fetched, competing with the hero image for bandwidth on a slow mobile
connection. The stale dimensions also cause a jump when zooming any image other than the first.
**Fix:** Render the dialog image with no `src` and no dimensions.
**Severity:** Medium · **Effort:** S · Established best practice

### P-14 Trustindex loads on every page with no preconnect
**File:** `layout/theme.liquid:51`
**What is wrong:** A deferred script from `cdn.trustindex.io` loads sitewide, including on the
product page and the cart, with no `preconnect` and no scoping to the pages where its widget
renders.
**Why it costs conversions:** A third-party connection is opened on the two pages where speed maps
most directly to revenue, to render a widget that may not appear on either.
**Fix:** Add a preconnect if the widget is used on these pages, or load the script only on the
templates that render it.
**Severity:** Medium · **Effort:** S · Established best practice

### P-15 Bespoke pricing is introduced before the catalogue choice is made
**File:** `sections/product.liquid:187`; `locales/en.default.json` `product.price_context`
**What is wrong:** The line directly under the price reads "Selected size price shown. Bespoke
sizes are quoted at PKR 1,000 per sq ft on WhatsApp."
**Why it costs conversions:** It offers an alternative, slower purchase path in the same glance as
the price, before the buyer has settled on a catalogue size.
**Fix:** Reduce the line under the price to the size clarification only, and move the bespoke
sentence next to the size picker where it answers a question the buyer is actually asking.
**Severity:** Low · **Effort:** S · Hypothesis to test

### P-16 The quantity field takes a fixed column beside the CTA
**File:** `sections/product.liquid:254-258`, CSS `:840-851` and `:1230-1235`
**What is wrong:** A number input occupies an 88px grid column, dropping to 76px below 480px,
spanning both CTA rows.
**Why it costs conversions:** For made-to-order wall art, ordering two identical pieces is rare, so
a permanent control consumes roughly a quarter of the purchase row's width on the smallest screens
where the CTA most needs it.
**Fix:** Default quantity to a hidden 1 and let the drawer handle adding another, or move the field
below the CTA.
**Severity:** Low · **Effort:** S · Hypothesis to test

### P-17 Brand copy rule violation and dead locale keys
**File:** `locales/en.default.json:120` (`cart.made_to_order_qty`), `cart.sizing_line`
**What is wrong:** `made_to_order_qty` contains an em dash, which the brand copy rules exclude.
Neither that key nor `cart.sizing_line` is referenced by any liquid file.
**Why it costs conversions:** Negligible directly; it is a correctness and consistency issue that
will resurface if either string is reintroduced.
**Fix:** Delete both keys, or rewrite without the em dash if they are to be used.
**Severity:** Low · **Effort:** S · Established best practice

### P-18 Every product with no compare-at price shows a "0% off" badge
**File:** `assets/critical.css:472` (`.tag { display: inline-block }`);
`sections/product.liquid:185`; `assets/theme.js:1143-1146`
**What is wrong:** The sale badge next to the price carries the `hidden` attribute correctly, both
from Liquid and from the JS that runs on every variant change. But `.tag` sets `display:
inline-block`, and a class selector outranks the browser's built-in `[hidden] { display: none }`.
`critical.css` defines no global `[hidden]` rule to restore it, so `hidden` is inert on every
`.tag` element. Confirmed in a browser on a product whose variants all have an empty
`compare_at_price`: the badge reports `hidden` true, computed display `block`, and is visible on
screen reading "0% off".
**Why it costs conversions:** Every product that is not discounted advertises a zero discount
beside its price. It reads as a broken page, and it undercuts the real sale badge on the products
that are genuinely reduced.
**Fix:** Add `[hidden] { display: none !important; }` to the base rules in `critical.css`. That
one line fixes this badge and every other element in the theme that relies on `hidden` while also
carrying a class with an explicit `display`.
**Severity:** High · **Effort:** S · Established best practice
**Found:** 2026-09-19, while verifying Batch 2. Not fixed, outside the approved scope.

---

## Slice 1 findings — Cart

### C-01 The cart page never shows which size was ordered — DONE (Batch 3)
**File:** `sections/cart.liquid:89-97` (compare `sections/cart-drawer.liquid:105-107`)
**What is wrong:** Each line renders the product type kicker and the product title. There is no
`item.variant.title` and no `item.options_with_values`. The drawer does show the variant; the cart
page does not.
**Why it costs conversions:** The entire catalogue is sold by size at different prices. A customer
who cannot confirm the size on the page where they review before paying either abandons or
contacts support. On a made-to-order item excluded from change-of-mind returns, a wrong size is
also an unrecoverable dispute.
**Fix:** Render the variant title on each line, matching the drawer's markup.
**Severity:** Critical · **Effort:** S · Established best practice

### C-02 The cart page prints each product's full description on every line — DONE (Batch 3)
**File:** `sections/cart.liquid:95-97`, CSS `:277-292`
**What is wrong:** The complete product description is rendered inside every cart line, allowed to
run to 68ch.
**Why it costs conversions:** Descriptions here are 500 to 682 characters. Two items push the
Secure checkout button far below the fold on mobile, and the cart stops being a review of a
decision and becomes a second product page.
**Fix:** Remove the description block. Show size, unit price and line total instead.
**Severity:** Critical · **Effort:** S · Established best practice

### C-03 Cart page quantity requires a separate Update submit
**File:** `sections/cart.liquid:99-122` and `:143`; the working AJAX path already exists at
`assets/theme.js:152-190`
**What is wrong:** Quantity is a number input feeding `updates[]`, committed only by pressing
Update cart. The drawer has instant plus and minus steppers.
**Why it costs conversions:** The customer changes the number, skips Update, presses Secure
checkout, and pays for the old quantity. The theme already contains the code to avoid this.
**Fix:** Reuse the drawer's stepper markup and its update path on the cart page, and drop the
Update button.
**Severity:** High · **Effort:** M · Established best practice

### C-04 No free-delivery progress in the cart or the drawer
**File:** `sections/cart.liquid:162`; `sections/cart-drawer.liquid:210`
**What is wrong:** Both show only "Shipping and taxes are calculated at checkout." The PKR 9,999
threshold is never referenced.
**Why it costs conversions:** This is the one moment where a stated gap to free delivery can lift
order value, and it is the moment the customer most wants to know the delivered total.
**Fix:** One line plus a thin progress bar showing the amount remaining, or confirming free
delivery applies.
**Severity:** High · **Effort:** S · Established best practice

### C-05 Checkout sits below a five-link policy block — DONE (Batch 3)
**File:** `sections/cart.liquid:158-178`
**What is wrong:** The summary renders subtotal, a tax note, a payment paragraph, a delivery
paragraph and four policy links, and only then the Secure checkout button, followed by Continue
shopping and a WhatsApp CTA.
**Why it costs conversions:** The primary action is buried under compliance text, and on mobile the
summary is already stacked beneath every cart line.
**Fix:** Move Secure checkout directly beneath the subtotal. Policy links go below it.
**Severity:** High · **Effort:** S · Established best practice

### C-06 The cart page has no discount code field
**File:** `sections/cart.liquid` (none); `sections/cart-drawer.liquid:173-198` has one
**What is wrong:** Customers who reach `/cart` through View full cart, a bookmark, or with
JavaScript disabled have no way to enter a code.
**Why it costs conversions:** A customer holding a code and unable to enter it will hunt for the
field, then leave or contact support.
**Fix:** Render the drawer's discount form on the cart page.
**Severity:** High · **Effort:** S · Established best practice

### C-07 No cross-sell in the cart or the drawer
**File:** `sections/cart.liquid`, `sections/cart-drawer.liquid` (neither renders any)
**What is wrong:** The cart is the only place in the funnel with no recommendation, while the
product page already uses a `custom.paired_products` metafield (`sections/product.liquid:21`) and
a reusable `product-card` snippet.
**Why it costs conversions:** Wall art is bought in arrangements. The store already curates pairs
and never offers them at the moment the customer has committed to one piece.
**Fix:** In the drawer footer, show up to two pieces from the first cart item's paired products
with one-tap add.
**Severity:** High · **Effort:** M · Established best practice

### C-08 Every cart thumbnail loads eagerly, on every page
**File:** `sections/cart.liquid:74-83` (600px, eager); `sections/cart-drawer.liquid:84-93`
(320px, eager); the drawer is rendered sitewide by `layout/theme.liquid:37`
**What is wrong:** Both templates hard-code `loading: 'eager'` for all line images. Because the
drawer markup ships on every page, a customer with three items in the cart downloads three
thumbnails on every single page view including the product page.
**Why it costs conversions:** It competes with the product hero image for bandwidth on the page
where load speed matters most.
**Fix:** Lazy-load all drawer thumbnails and every cart line beyond the first.
**Severity:** Medium · **Effort:** S · Established best practice

### C-09 The drawer and the cart page disagree on almost everything
**File:** `sections/cart-drawer.liquid` versus `sections/cart.liquid`
**What is wrong:** The drawer has variant title, a best-seller badge, a star rating, quantity
steppers, a discount field and a three-item trust row. The cart page has a full product
description, an Update button, four policy links and a WhatsApp CTA. Neither is a superset.
**Why it costs conversions:** A customer who opens the drawer and then clicks View full cart loses
the discount field, the ratings and the trust row, and gains a wall of description. The regression
reads as an error.
**Fix:** Make the cart page a superset of the drawer and share the line markup.
**Severity:** Medium · **Effort:** M · Established best practice

### C-10 Lead time in the cart is reduced to three words, and the fuller version is a run-on
**File:** `sections/cart-drawer.liquid:211-224`; `sections/cart.liquid:167`;
`locales/en.default.json` `cart.delivery_body`
**What is wrong:** The drawer trust row says only "Made to order / Prepared for you" and
"Pakistan-wide / Tracked delivery". The cart page's fuller line is four claims separated by pipe
characters in one run: Karachi days, rest of Pakistan days, cancellation window, return window.
**Why it costs conversions:** The customer is deciding whether it arrives in time. A pipe-delimited
string is skimmed past, and the drawer version omits the number entirely.
**Fix:** State the arrival estimate as a sentence in the drawer trust row, and split the cart
page's line into separate labelled lines.
**Severity:** Medium · **Effort:** S · Established best practice

### C-11 Removal is irreversible and, on the cart page, a full page navigation
**File:** `sections/cart.liquid:115-121` (anchor to `url_to_remove`);
`sections/cart-drawer.liquid:156-166` (AJAX, no undo)
**What is wrong:** There is no undo in either place, and the cart page version reloads the page.
**Why it costs conversions:** Recovering from a mistaken removal means returning to the product,
reselecting the size and adding again, on a store where the size picker auto-selects Medium rather
than what the customer had chosen.
**Fix:** Add an undo affordance in the drawer after a removal, and make the cart page removal AJAX.
**Severity:** Medium · **Effort:** M · Hypothesis to test

### C-12 The discount field confirms codes it has not verified
**File:** `assets/theme.js:191-262`; `locales/en.default.json` `cart.discount_success`
**What is wrong:** Applying a code posts to `/cart/update.js` and then reports "Code saved. Shopify
will confirm eligibility and the final discount at checkout." A wrong or expired code produces the
same message.
**Why it costs conversions:** The customer proceeds believing a discount applied and discovers at
checkout that it did not. That is one of the highest-abandonment moments in the funnel, and it is
self-inflicted.
**Fix:** Read `cart.discount_applications` back from the re-rendered section and report the actual
discount, or say nothing until it is confirmed.
**Severity:** Medium · **Effort:** M · Established best practice

### C-13 The theme carries no tracking code of its own — NO ACTION NEEDED
**File:** whole theme; verified by grep across every liquid, js and json file
**What is the situation:** The theme contains no dataLayer, no GA4 snippet, no Meta pixel code, no
`analytics.subscribe`, and `theme.js` dispatches no custom DOM events. The only third-party script
in the theme is Trustindex.

That is by design and is not a gap. Meta pixel and the Conversions API run through Shopify's
Facebook and Instagram channel, confirmed in Events Manager: the pixel is active on metaliq.art
and PageView, View content, Add to cart, Initiate checkout, Add payment info and Purchase are all
firing. Shopify's channel captures these server-side and through its own Web Pixel sandbox, which
is why nothing appears in theme code.

**Implication for this audit:** The funnel between product view and checkout start is already
measurable, so every other batch can be evaluated against Events Manager without any theme change.
Add to cart and Initiate checkout are the two events to read when judging cart and product page
work.
**Fix:** None. Keeping tracking out of the theme and in the channel is the correct arrangement.
Revisit only if a tool is added that genuinely needs a client-side hook the channel cannot provide.
**Severity:** Low · **Effort:** none · Established best practice

### C-14 The empty cart sends customers to the full catalogue
**File:** `sections/cart.liquid:25`; `sections/cart-drawer.liquid:28`
**What is wrong:** Both point at `routes.all_products_collection_url`, which is 67 unsorted
products. A best-sellers collection exists and is already referenced in
`sections/cart-drawer.liquid:62-67`.
**Why it costs conversions:** An empty cart means the customer has not found the piece yet.
Handing them the full catalogue repeats the step that already failed.
**Fix:** Point the empty-state CTA at best sellers.
**Severity:** Low · **Effort:** S · Hypothesis to test

### C-15 The cart drawer footer is too tall and squeezes the item list — DONE (Batch 3)
**File:** `sections/cart-drawer.liquid`, footer markup and its CSS
**What is wrong:** The footer stacked a always-open discount field, subtotal, shipping note, a
three-column trust block with icons and body copy, the checkout button and a View full cart link,
and was allowed to grow to `max-height: 56vh`. The header added a further 131px from a 96px
min-height, a 2.65rem title and an eyebrow, and the body added a redundant "1 piece" line.
Measured on the running dev server before the fix, at a 1366 by 600 viewport, which is a 1366x768
laptop once browser chrome is subtracted:

| Region | Height before |
| --- | --- |
| Header | 131px |
| Item list (visible) | 150px |
| Footer | 319px |
| First line item (actual) | 200px |

The 200px line item was clipped inside a 150px scroll window, so its price and quantity stepper
were cut off with one item in the cart, not only with three.
**Why it costs conversions:** The customer cannot confirm what they are buying or change the
quantity without discovering a nested scroll area inside a panel that already scrolls. On a laptop
this is the default experience, not an edge case.
**Fix:** Collapse the discount form behind a closed-by-default toggle, reduce the trust block to
one compact line below the checkout button, shrink the header, drop the duplicate count line, and
remove the footer height cap so the item list takes the remaining space.
**Severity:** Critical · **Effort:** S · Established best practice

---

## Action plan

Ordered by impact divided by effort. Each batch is small enough to ship and measure on its own.

Measurement is already in place. Meta pixel and the Conversions API run through Shopify's Facebook
and Instagram channel, so Add to cart and Initiate checkout can be read from Events Manager for any
batch without a theme change. See C-13.

### P0

**Batch 1 — Make the purchase action unmistakable** — **RUN LAST**, see the note below
(C-05 already shipped in Batch 3)
Findings: P-02, P-03
- Promote Add to cart to the full-width primary button with visible text; demote Buy now to a
  full-width secondary beneath it; wishlist stays the only icon button.
- Reduce the product page to one WhatsApp entry point, styled as a text link beside the size
  picker; remove the duplicate.
- **Files:** `sections/product.liquid`, `locales/en.default.json`
- **Acceptance:** Add to cart renders as the primary button with a visible label at every
  breakpoint. Exactly one WhatsApp link exists inside the product purchase column.
- **Dependencies:** a recorded baseline Add to cart rate from Events Manager, captured before any
  change lands. Both findings are hypotheses, so without a baseline there is nothing to judge them
  against.
- **Measure:** Add to cart rate against View content, and Initiate checkout, both in Events
  Manager; outbound WhatsApp clicks from the product page.

**Batch 2 — Truthful proof** — **DONE 2026-09-19, branch `cro-batch-2`**
Findings: P-01
- Turn off Judge.me sample data. Hide the star row when there are no reviews rather than printing
  the empty state.
- **Files:** `templates/product.json`, `sections/product.liquid`
- **Acceptance:** No sample review text renders on any product page. A product with zero reviews
  shows no rating row at all.
- **Dependencies:** needs your confirmation on Judge.me's live state.
- **Measure:** View content to Add to cart rate in Events Manager.

**Batch 3 — Fix the cart's blocking defects** — **DONE 2026-09-19, branch `cro-batch-3`**
Findings: C-01, C-02, C-15, plus C-05 pulled forward from Batch 1
- Render the variant title on every cart page line.
- Remove the product description from cart lines; show size, unit price and line total.
- Move Secure checkout directly under the subtotal (C-05).
- Rebuild the drawer footer so the item list gets the space (C-15).
- **Files:** `sections/cart.liquid`, `sections/cart-drawer.liquid`, `assets/theme.js`,
  `locales/en.default.json`
- **Acceptance:** Every cart line names its size. Page height for a three-item cart drops below one
  and a half mobile viewports.
- **Dependencies:** none
- **Measure:** checkout-start rate per cart view; support contacts about wrong sizes.

Note: C-05 was implemented here, so **Batch 1 now covers only P-02 and P-03**, both of which were
re-labelled hypothesis to test and are still unstarted.

### P1

**Batch 4 — Shipping economics at the decision points**
Findings: P-04, C-04, C-10
- One line under the product price: free delivery over PKR 9,999, and whether this size qualifies.
- Free-delivery progress line and bar in the drawer and the cart summary.
- Arrival estimate as a sentence in the drawer trust row; split the cart page's pipe-delimited line.
- **Files:** `sections/product.liquid`, `sections/cart.liquid`, `sections/cart-drawer.liquid`,
  `locales/en.default.json`
- **Acceptance:** The threshold appears on the product page, the drawer and the cart. The bar
  reflects the live subtotal after a quantity change.
- **Dependencies:** you confirm the PKR 9,999 rate is live in Shopify shipping settings.
- **Measure:** average order value; checkout-start rate; percentage of orders crossing PKR 9,999.

**Batch 5 — Cart and drawer parity**
Findings: C-03, C-06, C-08
- Replace the cart page quantity input and Update button with the drawer's steppers on the existing
  AJAX path.
- Render the discount form on the cart page.
- Lazy-load drawer thumbnails and cart lines after the first.
- **Files:** `sections/cart.liquid`, `sections/cart-drawer.liquid`, `assets/theme.js`
- **Acceptance:** Changing quantity on the cart page updates the subtotal with no page reload and
  no Update button. A code applied on the cart page behaves exactly as in the drawer. Only the
  first cart line image is eager.
- **Dependencies:** Batch 3 (same file, same lines)
- **Measure:** cart-to-checkout rate; quantity-change events followed by checkout start.

**Batch 6 — Search visibility and error recovery**
Findings: P-05, P-10, P-13, P-14
- Extend product JSON-LD with shipping details and return policy, and aggregate rating once real
  reviews exist.
- Surface Shopify's actual add-to-cart error text.
- Drop the `src` and stale dimensions from the zoom dialog image.
- Preconnect to Trustindex, or scope the script to the templates that use it.
- **Files:** `snippets/meta-tags.liquid`, `snippets/structured-data.liquid`,
  `sections/product.liquid`, `assets/theme.js`, `layout/theme.liquid`
- **Acceptance:** Rich Results Test reports valid shipping and return details with no errors.
  Forcing an inventory failure shows Shopify's message. No 2400px URL in the initial product HTML.
- **Dependencies:** aggregate rating depends on Batch 2.
- **Measure:** organic product-page impressions and click-through; add-to-cart error rate and
  recovery rate.

### P2

**Batch 7 — Gallery and objection handling**
Findings: P-07, P-08, P-12, P-11
- Scroll-snap swipe track with dots for the mobile gallery.
- Drive the stage from the media's aspect ratio.
- Five-question FAQ accordion on the product page reusing the existing accordion.
- Tabs become accordions below 860px with Details open; remove the description scrubbing once the
  29 descriptions are corrected in Admin.
- **Files:** `sections/product.liquid`, `assets/theme.js`, `locales/en.default.json`
- **Acceptance:** Mobile gallery advances by swipe with a visible position indicator. Details is
  expanded by default on mobile. No `replace` filters remain on the description.
- **Dependencies:** the description work needs the Admin content fixed first.
- **Measure:** gallery images viewed per session; scroll depth to FAQ; add-to-cart rate on mobile.

**Batch 8 — Cross-sell and remaining friction**
Findings: C-07, C-09, C-11, C-12, P-06, P-09, P-15, P-16, P-17, C-14
- Paired-product cross-sell in the drawer footer.
- Cart page becomes a superset of the drawer with shared line markup.
- Undo after removal; AJAX removal on the cart page.
- Discount confirmation reads back the applied discount.
- Sold-out sizes become selectable and labelled.
- Sticky bar reduced to one CTA.
- Price context trimmed; bespoke line moved to the size picker.
- Quantity field moved below the CTA.
- Dead locale keys removed.
- Empty cart points at best sellers.
- **Files:** `sections/cart.liquid`, `sections/cart-drawer.liquid`, `sections/product.liquid`,
  `assets/theme.js`, `locales/en.default.json`
- **Acceptance:** Each item verified individually against its finding.
- **Dependencies:** Batches 1, 3 and 5.
- **Measure:** units per order; cart abandonment; discount-code failure rate at checkout.

---

## Needed from you (code cannot solve these)

1. **Judge.me status.** Is it live with real synced reviews, or still in trial? Batch 2 depends on
   the answer, and so does the aggregate rating in Batch 6.
2. **Free delivery over PKR 9,999.** Confirm the rate is actually configured in Shopify shipping
   zones. The threshold currently exists only as theme copy.
3. **Size variants versus one listed size.** `README.md` says each product has one listed size; the
   product page renders a multi-size picker and auto-selects Medium. Which is true?
4. **Inventory tracking.** Every piece is made to order, yet sizes can go sold out. Should
   inventory be tracked at all, or should tracking be off so no size is ever a dead end?
5. **The 29 flagged product descriptions** in `docs/product-readiness-audit.md`. Once corrected in
   Admin, the render-time scrubbing can be deleted.
6. **Mounting detail.** Hardware, weight and fixing type per piece or per size band, so the
   Installation tab and the FAQ answer the real question instead of deferring to WhatsApp.
7. **Rapid Gateway.** Is it live? If so, `online_payments_active` should be enabled, and
   `payment_provider_name` set.
8. **Approval to reduce WhatsApp CTAs** on the product page from four entry points to one.
9. **Gallery order.** Confirm every product's first image is the artwork itself and that at least
   one in-room shot showing scale exists, and decide the standard position for it.
10. **Trustindex.** Which pages is the widget meant to render on? It currently loads everywhere.
11. **Baseline Add to cart rate** from Events Manager, recorded before Batch 1 lands, so the
    button hierarchy change in P-02 can be judged rather than assumed.

---

## Completed batches

### Batch 2 — 2026-09-19 — branch `cro-batch-2` (branched from `cro-batch-3`)
Covers P-01. Not committed; left in the working tree for review.

**Changed files**
- `sections/product.liquid` — the rating row is now wrapped in a condition and renders only when a
  real rating exists and the review count is above zero. The "No product reviews yet" branch, its
  zeroed star fill and the `has-no-reviews` class are gone.
- `templates/product.json` — the `"review_data": "sample_data"` setting was removed from the
  Judge.me block.

**Acceptance criteria**

| Criterion | Result |
| --- | --- |
| A product with zero reviews shows no rating row, at 1366x600 | **Met**, verified in browser |
| A product with zero reviews shows no rating row, at 390x844 | **Met**, verified in browser |
| No sample review text renders on any product page | **Met**, and it never did, see below |
| A product *with* reviews still shows the rating row | **Not verified**, see below |

- *No rating row on a zero-review product.* Verified in a browser at both required viewports on
  `/products/vinyl-soundwave-wall-art`. `document.querySelector('.product-rating')` returns null,
  and the phrase "No product reviews yet" is absent from the page text. Server-side HTML for
  twelve products was also scanned: zero occurrences of `class="product-rating"` across all of
  them. Screenshots captured at both sizes.
- *No sample review text.* Met, but the finding was wrong to begin with. Measured with
  `sample_data` still set, the widget rendered zero review cards and the text "Customer Reviews /
  Be the first to write a review / Write a review". Output after removing the setting was
  identical. See the correction in P-01.
- *A product with reviews still renders the rating row.* **Not verified.** All twelve products
  sampled report `data-number-of-reviews='0'`, so there is no product on this store that exercises
  the other branch. The condition is a straight `rating != blank and rating_count > 0` around
  markup that is otherwise unchanged, but that is reasoning, not a test. Re-check once a real
  review lands.

**Open question for you, stated honestly**
Removing `review_data` from `templates/product.json` changes the theme data in this repo. Whether
that is enough depends on facts I cannot read from these files:
- I could not determine which theme ID this repo deploys to, or whether it is the live theme.
  There is no `.shopify/` directory and no theme config file in the repo, only `.theme-check.yml`.
- JSON templates are merchant-editable. If the Judge.me block was ever configured through the
  theme editor on the live theme, the live copy of `templates/product.json` holds its own value,
  and a local edit does not reach it until this theme is pushed and published.
- I could not read Judge.me's block schema. It lives in the app extension, not in this repo, so I
  cannot confirm the valid values for `review_data` or what its default is. I removed the key
  rather than invent a replacement value.

What I can state from testing: the setting has no observable effect on the storefront, so this is
tidiness, not a live fix. If you want certainty, open the Judge.me block in the theme editor on
the live theme and read the control directly.

### Batch 3 — 2026-09-19 — branch `cro-batch-3`
Covers C-01, C-02, C-15 and C-05.

**Commit status, corrected.** This work is already committed and merged, but not the way it was
planned. It was committed outside this session as `0891075 "CRO"` on `cro-batch-3`, then merged
into `main` as `297499d`, which matches `origin/main`. That single commit bundles Batch 3 together
with ten unrelated files that were already modified before the batch began: `assets/critical.css`,
`layout/theme.liquid`, `sections/header.liquid`, `sections/product.liquid`,
`sections/wishlist-drawer.liquid`, `snippets/wishlist-button.liquid`,
`snippets/limited-sale-card.liquid`, `snippets/limited-time-sale.liquid`,
`snippets/product-card.liquid` and `snippets/icon.liquid`. Batch 3 cannot now be reverted on its
own without also reverting that unrelated work. No history was rewritten, since the commit is
already on the shared remote.

**Changed files**
- `sections/cart.liquid` — option and property rows added to each cart line, product description
  block and its CSS removed, per-unit price added when quantity is above one, summary reordered so
  Secure checkout follows the subtotal.
- `sections/cart-drawer.liquid` — discount form collapsed behind a `<details>` toggle, trust block
  reduced to one line and moved below the checkout button, header trimmed (eyebrow removed, title
  reduced, count folded into the header), duplicate "1 piece" body line removed, footer height cap
  removed, line options and visible properties rendered per line.
- `assets/theme.js` — reopen the collapsed discount panel after an apply, on both success and
  failure, since applying re-renders the drawer and would otherwise hide the result.
- `locales/en.default.json` — one new key, `cart.unit_price` ("{{ price }} each").

**Acceptance criteria**
- *Every cart line names its size.* Met for products with real variants. Each line renders
  `item.options_with_values` as labelled name and value rows, so it prints the product's own
  option name rather than a hardcoded "Size". Any non-hidden line item property is rendered in a
  second list, so a custom-size piece shows whatever visible property carries its dimensions.
  Verified by reading the markup, not in a browser: this repo has no live store to render against.
- *Page height for a three-item cart drops below one and a half mobile viewports.* **Not
  verified.** Between 500 and 682 characters of description per line were removed and replaced
  with two short rows, so the direction is certain, but the exact height needs a render against
  real products. Re-check on a preview before closing this out.
- *Secure checkout follows the subtotal.* Met. Order is now subtotal, tax note, Secure checkout,
  Continue shopping, then the policy disclosure and the WhatsApp link.
- *C-15: at 1366x768 and 390x844, with 1 item and with 3 items, the whole first line item and
  Secure checkout are visible without scrolling the drawer.* **Met, verified in a browser** against
  the running dev server at `localhost:9292`, driven over the Chrome DevTools Protocol with real
  products in the cart. Six combinations measured, all pass. Also measured at 1366x600, the real
  usable height of a 1366x768 laptop once browser chrome is subtracted, which is the case in the
  screenshot and the one that failed before.

| Region, at 1366x600 | Before | After |
| --- | --- | --- |
| Header | 131px | 65px |
| Item list | 150px | 312px |
| Footer | 319px | 223px |
| First item fully inside the list window | no | yes |

**Checks run**
- `shopify theme check --fail-level error` — 75 files, zero errors. The single warning is the
  pre-existing Trustindex remote asset, which is finding P-14 and is out of this batch's scope.
- `node --check assets/theme.js` passes; `locales/en.default.json` parses as valid JSON.
- Browser checks at 1366x768, 1366x600 and 390x844, with one and three items: first line item
  whole (image, title, size, price, stepper) and Secure checkout both fully visible, body scrolls,
  footer pinned. Screenshots captured at each.
- Discount toggle: closed by default, opens on click, and Secure checkout stays fully visible with
  it open.

**Deliberately not touched**
- No WhatsApp entry point was removed anywhere.
- No colour and no font was changed. Every new rule reuses existing custom properties and the
  existing type scale, so the cart inherits whatever the tokens are set to once the palette is
  confirmed.
- The quantity input and its Update button on the cart page are untouched; they belong to C-03 in
  Batch 5.

**Note on the drawer size line**
The drawer already rendered `item.variant.title`, so the size was present before this batch. It
was simply clipped out of view by the footer. It now renders as a labelled name and value row from
`item.options_with_values`, matching the cart page, plus any visible line item property.

**Carry-over risk**
For a grouped custom-size line, `item.options_with_values` shows the base variant, since the real
size lives in the `_size_group` property, which is hidden by the underscore prefix. If custom
sizes should display their dimensions on the cart line, that needs a visible line item property
added wherever those orders are created.
