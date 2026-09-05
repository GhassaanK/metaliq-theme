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
| Custom Design | `custom-design` | `custom-design` |

Set the Custom Design page in **Theme settings > Custom sizing > Quote page**.

## 3. Confirm legal and store identity

In **Settings > Store details**, **Notifications**, and any invoice templates, use:

- Legal entity: Steed Art
- Trading brand: MetaliQ Art
- Email: hello@metaliq.art
- Phone: 0317 2920243
- Address: Plot No 635, Gali No 15, Sector-F, Punjab Road, Manzoor Colony, Karachi, Sindh, Pakistan

The full address must match the submitted business documents character for character. Send test order and shipping emails and confirm the sender/reply-to address is correct.

## 4. Payments and checkout

Until Rapid Gateway is approved, leave **Theme settings > Commerce compliance > Online payments are active** disabled. The storefront then states that COD is active and online payments are onboarding.

Confirm the manual Cash on Delivery method under **Settings > Payments** has clear customer instructions. After Rapid is activated:

1. Connect and configure Rapid in Shopify Payments settings.
2. Complete one low-value successful payment and verify the order is marked paid.
3. Test declined and abandoned payments; neither should enter production.
4. Refund the successful test and verify return to the original method.
5. Enable **Online payments are active** and keep the provider name as `Rapid Gateway`.

Do not add a payment-receipt upload to checkout. Basic Shopify does not permit arbitrary checkout form customisation of that kind, and collecting a receipt is unnecessary for a connected gateway. Use Shopify's recorded transaction status. Bespoke customers should receive a secure draft-order invoice/payment link only after quote and design approval.

## 5. Currency and shipping

- Confirm store currency and the Pakistan market use PKR.
- Under **Settings > Shipping and delivery**, configure a Pakistan zone and the actual rates customers will pay.
- Test one Karachi address and one address elsewhere in Pakistan.
- Confirm shipping charges are visible before order submission.
- Keep storefront estimates at 4-7 working days for Karachi and 10-12 working days elsewhere in Pakistan, measured from confirmation.

## 6. Custom request uploads

Install **Hulk Contact Form Builder**, then add its app block to the Custom Design page in the theme editor. Configure fields for:

- Name, email, and phone
- Delivery city and full address
- Desired dimensions; display matte black powder-coated as the fixed finish
- Project description
- Reference images or documents (JPG, JPEG, PNG, and PDF)
- Required consent linking to the Privacy Policy

Send a test of every allowed file type and verify Steed Art receives both the submission and attachment. The native theme form remains a non-upload fallback and asks for a public reference link. It does not collect payment information.

## 7. Product and order readiness

For every active product, confirm:

- At least two clear, accurate images
- Description covering material, matte black powder-coated finish, dimensions, care, installation, made-to-order status, and delivery estimate
- Accurate PKR price and SKU
- Correct availability and inventory behaviour
- Custom-size area calculation, where offered
- Product, cart, checkout, confirmation, cancellation, and refund paths

## 8. Final public audit

- Keep the storefront public and password-free.
- Test the header, footer, policies, About, Ordering & Payments, Custom Design, product, cart, and checkout pages on desktop and mobile.
- Confirm phone and email links work.
- Confirm no `Translation missing` text or 404 links appear.
- Run `shopify theme check --fail-level error`.
- Submit exactly `https://metaliq.art` to Rapid Gateway.
