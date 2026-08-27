import { asSessionCreateParams, provision, stripeClient } from './provision-stripe-environment.ts';
import { readFileSync } from 'node:fs';

/**
 * Measures the checkout constraints the fake Stripe server enforces.
 *
 * The limits in `fake-stripe-server.ts` cannot be taken from Stripe's docs or its
 * published OpenAPI spec, because both disagree with the API: the spec carries no
 * `maxItems` on `custom_fields`, states the `customer_update` rule only in prose,
 * and marks `allowed_countries` required when the API does not. This script is how
 * those limits were established, and how to re-establish them when Stripe moves one.
 *
 * Run: STRIPE_SECRET_KEY=sk_test_... pnpm --filter @tryghost/e2e stripe:probe
 */

const API_VERSION = '2020-08-27';

// Read from the pinned SDK's own union at probe time, so this measures whatever that
// artefact currently claims rather than a copy of it that could already have drifted.
const ALL_UNION_CODES: string[] = (() => {
  const types = new URL(
    '../../ghost/core/node_modules/stripe/types/2020-08-27/Checkout/Sessions.d.ts',
    import.meta.url,
  );
  const source = readFileSync(types, 'utf8');
  const start = source.indexOf('type AllowedCountry =');
  const union = source.slice(start, source.indexOf(';', start));
  return [...new Set(union.match(/'[A-Z]{2}'/g)?.map((code) => code.slice(1, -1)) ?? [])];
})();

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

// One place decides what a usable key is, and refuses a live one.
const stripe = stripeClient();

const field = (overrides: Record<string, unknown> = {}) => ({
  key: 'probe',
  label: { type: 'custom' as const, custom: 'Probe' },
  type: 'text' as const,
  ...overrides,
});

async function probe(name: string, params: Record<string, unknown>): Promise<void> {
  try {
    await stripe.checkout.sessions.create(asSessionCreateParams(params));
    log(`  ACCEPTED  ${name}`);
  } catch (error) {
    log(`  REJECTED  ${name}`);
    log(`            ${(error as Error).message}`);
  }
}

async function main(): Promise<void> {
  // Through provision() rather than a local lookup: it paginates and matches the whole
  // price contract, so this cannot pick up a differently-priced Monthly from another
  // account, or miss ours because it sits beyond the first page.
  const { prices } = await provision(stripe);
  const monthly = prices.find((price) => price.nickname === 'Monthly');
  if (!monthly) {
    log('Provisioning did not produce a Monthly price.');
    process.exit(1);
  }

  const base = {
    mode: 'subscription',
    line_items: [{ price: monthly.id, quantity: 1 }],
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
  };

  log(`Probing Stripe test mode at API version ${API_VERSION}\n`);
  await probe('label at 50 characters', {
    ...base,
    custom_fields: [field({ label: { type: 'custom', custom: 'a'.repeat(50) } })],
  });
  await probe('label at 51 characters', {
    ...base,
    custom_fields: [field({ label: { type: 'custom', custom: 'a'.repeat(51) } })],
  });
  await probe('three custom fields', {
    ...base,
    custom_fields: [1, 2, 3].map((n) => field({ key: `probe_${n}` })),
  });
  await probe('four custom fields', {
    ...base,
    custom_fields: [1, 2, 3, 4].map((n) => field({ key: `probe_${n}` })),
  });
  await probe('underscore in key', { ...base, custom_fields: [field({ key: 'probe_key_name' })] });
  await probe('customer_update without customer', {
    ...base,
    customer_update: { address: 'auto' },
  });
  await probe('shipping_address_collection without allowed_countries', {
    ...base,
    shipping_address_collection: {},
  });

  // Whether the SDK's own `AllowedCountry` union can be trusted as the list Ghost enforces
  // when a publisher saves. The union is a published artefact, and published artefacts have
  // already disagreed with this API three times above, so it is measured rather than read.
  //
  // Two directions matter. A code the union carries but Stripe refuses would have Ghost
  // accept a setting that breaks every checkout for that tier. A code Stripe accepts but the
  // union omits would have Ghost refuse a country a publisher can legitimately ship to.
  const country = (code: string) => ({
    ...base,
    shipping_address_collection: { allowed_countries: [code] },
  });

  log('\n  -- expected to be accepted --');
  await probe('GB (baseline)', country('GB'));

  log('\n  -- in the SDK union, absent from a general ISO country list --');
  for (const code of ['AC', 'BV', 'TA', 'XK', 'ZZ']) {
    await probe(`${code}`, country(code));
  }

  log('\n  -- expected to be refused --');
  await probe('UK (the usual slip for GB)', country('UK'));

  log('\n  -- in a general ISO country list, absent from the SDK union --');
  for (const code of [
    'AS',
    'CC',
    'CU',
    'CX',
    'FM',
    'HM',
    'IR',
    'KP',
    'MH',
    'MP',
    'NF',
    'PW',
    'SD',
    'SY',
    'UM',
    'VI',
  ]) {
    await probe(`${code}`, country(code));
  }

  log('\n  -- how many countries one session will take --');
  await probe('every country in the union', {
    ...base,
    shipping_address_collection: { allowed_countries: ALL_UNION_CODES },
  });

  // Collecting for a member who already has a Stripe customer, which is every signed-in
  // checkout: a free member upgrading, or anyone buying a second time. Ghost sends the
  // collection parameters and no `customer_update`, because it reads what was collected
  // off the completed session rather than off the customer. Stripe may still require the
  // pair — it does for automatic tax, which is why `_applyAutomaticTaxSessionOptions` sets
  // `customer_update` only when there is a customer. If it does here too, then turning
  // shipping on breaks checkout for exactly the members most likely to buy, and every test
  // we have would miss it: they all check out anonymously.
  const customer = await stripe.customers.create({ email: `probe-${Date.now()}@example.com` });
  const withCustomer = { ...base, customer: customer.id };
  const shipping = { allowed_countries: ['GB'] };

  log('');
  await probe('shipping_address_collection with customer, no customer_update', {
    ...withCustomer,
    shipping_address_collection: shipping,
  });
  await probe('shipping_address_collection with customer and customer_update', {
    ...withCustomer,
    shipping_address_collection: shipping,
    customer_update: { shipping: 'auto' },
  });
  await probe('tax_id_collection with customer, no customer_update', {
    ...withCustomer,
    tax_id_collection: { enabled: true },
  });
  await probe('phone_number_collection with customer, no customer_update', {
    ...withCustomer,
    phone_number_collection: { enabled: true },
  });
  await probe('custom_fields with customer, no customer_update', {
    ...withCustomer,
    custom_fields: [field()],
  });

  log('\nEach REJECTED message is the string the fake server should return.');
}

main().catch((error: unknown) => {
  // A rejection need not be an Error, and the stack is what says which of a dozen
  // sequential Stripe calls failed.
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`Probe failed: ${detail}\n`);
  process.exit(1);
});
