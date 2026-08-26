# Stripe Flows

## Stripe Connect

Ghost has a Stripe Connect integration. The client ID is part of the Ghost
codebase, allowing any Ghost instance served over HTTPS to start the OAuth flow.

1. The user selects **Connect with Stripe** in Ghost Admin and is redirected to
   Stripe.
2. Stripe redirects the user to `stripe.ghost.org` after authorization.
3. `stripe.ghost.org` exchanges the authorization code and returns a
   base64-encoded payload containing `s`, `p`, `a`, `l`, `n`, and `i`. The `a`
   value is Stripe's OAuth `access_token`, not the account's secret key.
4. Ghost validates the state in `s`, then maps and stores the connection
   settings.

This flow is implemented in
[`services/members/stripe-connect.js`](../../ghost/core/core/server/services/members/stripe-connect.js).

## Stripe subscription checkout

1. Ghost receives a request to create a checkout session for a tier and billing
   cadence.
2. Ghost checks that the tier is not archived.
3. Ghost looks for the Stripe Price associated with the tier and cadence.
4. Ghost checks the price against Stripe.
5. If needed, Ghost creates the Stripe Product and Price and stores them
   locally.
6. Ghost creates a Stripe Checkout Session with that price.

## Creating a tier

1. Ghost receives a request to create a tier with monthly and yearly prices.
2. Ghost creates the corresponding Stripe Product and Prices.
3. Ghost stores their details in the database.

The checkout and tier price flows are implemented by
[`payments-service.js`](../../ghost/core/core/server/services/members/members-api/services/payments-service.js).
