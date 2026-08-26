import fs from 'node:fs';
import path from 'node:path';
import { PRICES, provision, stripeClient } from './provision-stripe-environment.ts';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(__dirname, '../helpers/services/stripe/fixtures');

// Pinned to what ghost/core ships. Response shapes are version-dependent, so a
// fixture captured at any other version would describe an API we do not call.
const API_VERSION = '2020-08-27';
function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

/**
 * A captured Checkout Session carries a working payment link. Committed, that is a URL
 * any reader of the repository can open and pay against the account it was captured
 * from, firing its webhooks. Nothing asserts on the value, only that the field is
 * there, so it is replaced with one of the same shape.
 */
function redactSessionUrl<T extends object>(object: T): T {
  if ('object' in object && object.object === 'checkout.session' && 'url' in object) {
    return { ...object, url: 'https://checkout.stripe.com/c/pay/cs_test_redacted' };
  }
  return object;
}

function save<T extends object>(name: string, object: T): T {
  const written = redactSessionUrl(object);
  fs.writeFileSync(
    path.resolve(fixtureDir, `${name}.json`),
    `${JSON.stringify(written, null, 2)}\n`,
  );
  log(`  ${name} (${Object.keys(object).length} keys)`);
  return object;
}

const stripe = stripeClient();

async function main(): Promise<void> {
  fs.mkdirSync(fixtureDir, { recursive: true });
  log(`Capturing against Stripe test mode at API version ${API_VERSION}\n`);

  // Provision first, so a capture run against a fresh account produces the same
  // fixtures as one against an account that has been captured from before.
  const { product, prices, coupon } = await provision(stripe);
  const priceByNickname = (nickname: (typeof PRICES)[number]['nickname']) => {
    const price = prices.find((candidate) => candidate.nickname === nickname);
    if (!price) {
      throw new Error(`Provisioning did not produce a ${nickname} price`);
    }
    return price;
  };

  save('product', product);
  const monthly = save('price.monthly', priceByNickname('Monthly'));
  save('price.yearly', priceByNickname('Yearly'));
  const complimentary = save('price.complimentary', priceByNickname('Complimentary'));

  save('coupon', coupon);

  const customer = save(
    'customer',
    await stripe.customers.create({
      email: `fixture-${Date.now()}@example.com`,
      name: 'Fixture Customer',
    }),
  );
  const paymentMethod = save(
    'payment_method',
    await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id }),
  );
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });

  save(
    'subscription.paid',
    await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: monthly.id }],
      default_payment_method: paymentMethod.id,
    }),
  );
  // The comped shape. member-repository decides a member is comped by matching
  // plan.nickname against 'Complimentary', so this fixture is what that check reads.
  save(
    'subscription.complimentary',
    await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: complimentary.id }],
    }),
  );

  const urls = {
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
  };
  save(
    'checkout_session.subscription',
    await stripe.checkout.sessions.create({
      ...urls,
      mode: 'subscription',
      line_items: [{ price: monthly.id, quantity: 1 }],
    }),
  );
  save(
    'checkout_session.shipping',
    await stripe.checkout.sessions.create({
      ...urls,
      mode: 'subscription',
      line_items: [{ price: monthly.id, quantity: 1 }],
      shipping_address_collection: { allowed_countries: ['GB', 'US'] },
    }),
  );
  save(
    'checkout_session.donation',
    await stripe.checkout.sessions.create({
      ...urls,
      mode: 'payment',
      submit_type: 'donate',
      line_items: [
        { price_data: { currency: 'usd', unit_amount: 1000, product: product.id }, quantity: 1 },
      ],
      custom_fields: [
        {
          key: 'donation_message',
          label: { type: 'custom', custom: 'Add a personal note' },
          type: 'text',
          optional: true,
        },
      ],
    }),
  );

  // Without this there is no way to tell how stale the fixtures are, which makes
  // the "fixtures go stale" trade-off unmeasurable rather than merely accepted.
  save('manifest', {
    captured_at: new Date().toISOString(),
    api_version: API_VERSION,
    stripe_node: process.env.npm_package_dependencies_stripe ?? 'see e2e/package.json',
    note: 'Regenerate with `pnpm stripe:fixtures`. Completed checkout is captured separately by hand.',
  });

  log('\nDone. A completed checkout cannot be captured here: Stripe blocks automating');
  log('its hosted page, so checkout_session.completed must be captured by hand.');
}

main().catch((error: Error) => {
  log(`Capture failed: ${error.message}`);
  process.exit(1);
});
