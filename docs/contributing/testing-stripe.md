# Testing Stripe Locally

Use a Stripe test-mode account and Stripe's test payment details for all local
development. Never use live keys or real payment details.

## Receive production-shaped webhooks

Run:

```bash
pnpm dev:stripe
```

This follows the production webhook path. It publishes only Ghost's Stripe
webhook route through [Tailscale Funnel](https://tailscale.com/kb/1223/funnel).
Once Stripe is connected in Admin, Ghost registers a temporary webhook endpoint
using its pinned Stripe API version and removes it on shutdown. The site and
Admin remain on `localhost`.

Use this mode when webhook payload shape matters, such as when reading fields
from a checkout session. Ghost logs an error if an event arrives at a different
API version from the one it pins.

Funnel requires Tailscale 1.52 or newer, with MagicDNS, HTTPS certificates, and
Funnel enabled for the tailnet and node. The command reports when Tailscale is
missing, disconnected, or has no MagicDNS name. Other setup failures include
Tailscale's own error.

The webhook route is publicly reachable while the command runs, but every
request must have a valid Stripe signature. The tunnel closes when the command
stops. A forced kill can leave it running until Tailscale or the machine
restarts. Turn it off manually if this happens:

```bash
tailscale funnel --https=443 off
```

## Use the Stripe CLI fallback

When Tailscale is unavailable and exact webhook payload shape does not matter,
run:

```bash
pnpm dev:stripe --listen
```

This uses `stripe listen` in Docker and requires `STRIPE_SECRET_KEY` in the
environment or a local `.env` file. The key must be a test-mode key for the same
Stripe account connected to Ghost. The command does not require a local Stripe
CLI installation or `stripe login`. Never commit `.env` or Stripe credentials.

Stripe CLI renders events at the account's default API version rather than the
version Ghost pins. The command warns about this difference, and Ghost logs an
error when it receives a mismatched event.

## Test a paid membership

1. Start `pnpm dev:stripe`.
2. Connect a Stripe test-mode account in Ghost Admin under
   **Settings → Tiers**. Ghost registers the temporary webhook endpoint when the
   connection settings are saved. Follow the development log's instruction to
   restart if registration could not happen during the first connection.
3. Sign up for a paid membership through the local site's Portal using a
   [Stripe test card](https://docs.stripe.com/testing), such as
   `4242 4242 4242 4242` with any future expiry date and any three-digit CVC.
4. Confirm that the member becomes paid in Admin. This verifies that Ghost
   received and processed the webhook.

## Automated tests

Automated browser tests must use the E2E suite's fake Stripe service rather than
a real account:

```ts
test.use({stripeEnabled: true});
```

This gives the test an isolated Ghost environment, fake Checkout page, Stripe
test service, and signed webhook delivery. See the
[E2E Stripe fixture guide](../../e2e/README.md#stripe-fixtures) and the
[subscription lifecycle test](../../e2e/tests/public/stripe-webhook-subscription-lifecycle.test.ts)
for the current helpers and an example.

For the implementation behind Stripe Connect, tier creation, and subscription
checkout, see [Stripe flows](../codebase/stripe-flows.md).
