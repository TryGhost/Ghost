# @tryghost/checkout

What Ghost's Stripe Checkout can collect, and where it lands.

Three parties have to agree on this and none of them can import another's source:
Ghost Core builds the checkout session and validates what a publisher saves, Admin
offers the publisher only what that save would accept, and the end-to-end harness
models Stripe. A divergence between the first two is a setting that looks saved and
collects nothing.

## What is in here

- `STRIPE_ALLOWED_COUNTRIES` / `isStripeAllowedCountry` — the countries Stripe
  Checkout accepts in `shipping_address_collection`.
- `STRIPE_PORTS` / `STRIPE_PORT` / `isStripePort` — the names Stripe returns
  collected values under.
- `PORT_FIELD` — what each port supplies, and the custom field type that can hold it.
- `MAX_CHECKOUT_CUSTOM_FIELDS`, `MAX_CHECKOUT_LABEL_LENGTH`,
  `CHECKOUT_ELIGIBLE_FIELD_TYPES` / `isCheckoutEligible` — the caps Stripe enforces
  on checkout questions.

## Measured, not read

Every value here was established by `e2e/scripts/probe-stripe-constraints.ts` against
the live API at Ghost's pinned version, because the published artefacts disagree with
it: the OpenAPI spec carries no `maxItems` on `custom_fields` and states the
`customer_update` rule only in prose, and the SDK's `AllowedCountry` union omits `SD`,
which the API accepts. Re-probe before changing a value; do not read a new one off the
documentation.

Two consequences of the country list are worth knowing before touching it. A code
Stripe rejects fails the whole session create, so it is checked when a publisher
chooses a country rather than when a member tries to buy. And there is no sentinel for
"everywhere": `allowed_countries` is the only key `shipping_address_collection` has, so
omitting or emptying it removes the parameter and the checkout silently collects no
address. Any internal "all countries" representation has to be expanded to the full list
before the session is built.

Two guards live outside this package, where the things they compare live:
`ghost/core/test/unit/server/services/stripe/allowed-countries.test.ts` holds the list
against the Stripe SDK that Ghost pins, and against the separate copy the end-to-end
harness keeps. That copy is deliberate — a fake that shared this list could never catch
Ghost offering a country Stripe refuses.

## Develop

This is a workspace package in the Ghost monorepo. From the repo root:

```bash
pnpm --filter @tryghost/checkout build   # compile to build/ with tsc (ESM)
pnpm --filter @tryghost/checkout test    # type-check + unit tests
```

In-monorepo consumers resolve this package via the `source` export condition (raw
`src/*.ts`, no build needed in dev/test). Production and any published tarball use the
compiled `build/` output.

This package is ESM-only and compiled with `tsc` (`module: nodenext`). Relative imports
in `src/` must carry an explicit extension; write the real `.ts` one and `tsc` rewrites
it to `.js` on emit. `ghost/core` is CommonJS and consumes this through `require(esm)`,
which forbids top-level `await` anywhere in the module graph — keep module-level
initialization synchronous.
