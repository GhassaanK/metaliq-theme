# Rapid Gateway launch checklist

Theme code cannot create Shopify resources or change payment, market, and shipping configuration. Complete this checklist in Shopify Admin before resubmitting the gateway application.

## 1. Publish the required policies

Go to **Settings > Policies** and paste the four reviewed drafts from `docs/shopify-policy-copy.md` into:

- Refund policy
- Privacy policy
- Terms of service
- Shipping policy

Save and confirm these exact routes load publicly:

- `https://metaliq.art/policies/refund-policy`
- `https://metaliq.art/policies/privacy-policy`
- `https://metaliq.art/policies/terms-of-service`
- `https://metaliq.art/policies/shipping-policy`

Shopify exposes saved policies in checkout. The theme footer links directly to all four canonical routes.

## 2. Create the public pages

Under **Online Store > Pages**, create and publish:

| Page title | Handle | Theme template |
| --- | --- | --- |
| About Us | `about` | `about` |
| Ordering & Payments | `ordering-and-payments` | `ordering-and-payments` |
| Custom Orders | `custom-orders` | `default page` |
| Product Care & Installation | `product-care-and-installation` | `default page` |

Use the reviewed copy in `docs/shopify-policy-copy.md` for the two informational pages. The footer detects these pages and links them only after they exist, preventing broken routes.

## 3. Confirm legal and store identity

In **Settings > Store details**, **Notifications**, and any invoice templates, use:

- Legal entity: Steed Art
- Trading brand: MetaliQ Art
- Email: hello@metaliq.art
- Phone: 0317 2920243
- Address: Plot No 635, Gali No 15, Sector-F, Punjab Road, Manzoor Colony, Karachi, Sindh, Pakistan

The full address must match the submitted business documents character for character. Send test order and shipping emails and confirm the sender/reply-to address is correct.

## 4. Payments and checkout

Keep customer-facing payment copy method-neutral: available payment methods are shown at checkout. Do not publish temporary gateway-onboarding status. Confirm that Cash on Delivery is enabled only for the orders and locations the business actually supports.

Confirm the manual Cash on Delivery method under **Settings > Payments** has clear customer instructions. After Rapid is activated:

1. Connect and configure Rapid in Shopify Payments settings.
2. Complete one low-value successful payment and verify the order is marked paid.
3. Test declined and abandoned payments; neither should enter production.
4. Refund the successful test and verify return to the original method.
5. Confirm that checkout accurately displays Rapid only after it is active and tested. The storefront policy copy does not need to expose implementation status.

Do not add a payment-receipt upload to checkout. Basic Shopify does not permit arbitrary checkout form customisation of that kind, and collecting a receipt is unnecessary for a connected gateway. Use Shopify's recorded transaction status. Bespoke customers should receive a secure draft-order invoice/payment link only after quote and design approval.

## 5. Currency and shipping

- Confirm store currency and the Pakistan market use PKR.
- Under **Settings > Shipping and delivery**, configure a Pakistan zone and the actual rates customers will pay.
- Test one Karachi address and one address elsewhere in Pakistan.
- Confirm shipping charges are visible before order submission.
- Keep storefront estimates at 2 to 3 working days for Karachi and 5 to 7 working days elsewhere in Pakistan after order confirmation. These estimates include normal made-to-order production and courier delivery; working days exclude Sundays and public holidays in Pakistan.

## 6. Custom requests

All custom-design calls to action open a prefilled WhatsApp conversation with **+92 317 2920243**. Test the header, home hero, homepage custom-design callout, product page, Ordering & Payments page, and footer. Customers can send reference images or documents directly in WhatsApp after starting the conversation.

Do not ask customers to send payment credentials in WhatsApp. Once the design, dimensions, price, and timeline are approved, issue a secure Shopify invoice or payment link.

## 7. Product and order readiness

For every active product, confirm:

- At least two clear, accurate images
- Description covering material, matte black powder-coated finish, dimensions, care, installation, made-to-order status, and delivery estimate
- Accurate PKR price and SKU
- Correct availability and inventory behaviour
- Custom-dimension enquiries open WhatsApp for a separate written quote
- Product, cart, checkout, confirmation, cancellation, and refund paths

## 8. Final public audit

- Keep the storefront public and password-free.
- Test the header, footer, policies, About, Ordering & Payments, custom-design WhatsApp calls to action, product, cart, and checkout pages on desktop and mobile.
- Confirm phone and email links work.
- Confirm no `Translation missing` text or 404 links appear.
- Run `shopify theme check --fail-level error`.
- Submit exactly `https://metaliq.art` to Rapid Gateway.
