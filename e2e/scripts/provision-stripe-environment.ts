import Stripe from 'stripe';

/**
 * Puts a Stripe test account into the state the fixtures are captured from.
 *
 * Fixtures are only comparable between captures if the account they came from held
 * the same entities, so this is the definition of that state. Run it against any
 * Stripe test account before capturing, and the fixtures it produces will match.
 *
 * Idempotent, and deliberately so: Stripe cannot delete a product that has prices,
 * so re-provisioning has to reuse what is already there rather than accumulate
 * near-identical copies.
 *
 * Run: STRIPE_SECRET_KEY=sk_test_... pnpm --filter @tryghost/e2e stripe:provision
 */

const API_VERSION = '2020-08-27';

export const PRODUCT_NAME = 'E2E Fixture Tier';
export const COUPON_NAME = 'Fixture coupon';

/**
 * The nicknames are the point. Ghost's own code matches on them: member-repository
 * decides a subscription is complimentary by comparing the plan nickname against
 * 'Complimentary', and product-repository writes 'Monthly' and 'Yearly'. A fixture
 * captured against differently-named prices would not exercise any of that.
 */
export const PRICES = [
  { nickname: 'Monthly', amount: 500, interval: 'month' },
  { nickname: 'Yearly', amount: 5000, interval: 'year' },
  { nickname: 'Complimentary', amount: 0, interval: 'year' },
] as const;

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function stripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.startsWith('sk_test_')) {
    log('STRIPE_SECRET_KEY must be set to a test-mode key (sk_test_...).');
    process.exit(1);
  }
  return new Stripe(secretKey, { apiVersion: API_VERSION });
}

/**
 * Auto-paginating find. A test account that has been used for anything else can hold
 * more than one page of prices, and a single `list` would miss ours and create a
 * duplicate on every run.
 */
async function findIn<T>(list: AsyncIterable<T>, matches: (item: T) => boolean): Promise<T | null> {
  for await (const item of list) {
    if (matches(item)) {
      return item;
    }
  }
  return null;
}

export async function provision(
  stripe: Stripe,
): Promise<{ product: Stripe.Product; prices: Stripe.Price[]; coupon: Stripe.Coupon }> {
  const product =
    (await findIn(
      stripe.products.list({
        limit: 100,
        active: true,
      }) as unknown as AsyncIterable<Stripe.Product>,
      (candidate) => candidate.name === PRODUCT_NAME,
    )) ??
    // Ghost sends only a name when it creates a product, so this does too.
    (await stripe.products.create({ name: PRODUCT_NAME }));

  const prices: Stripe.Price[] = [];
  for (const { nickname, amount, interval } of PRICES) {
    // Matched on the whole contract, not just the nickname. A price named Monthly
    // at a different amount, currency or interval would otherwise be reused and
    // the fixtures would silently differ between accounts, which is the one thing
    // provisioning exists to prevent.
    const found = await findIn(
      stripe.prices.list({
        product: product.id,
        limit: 100,
      }) as unknown as AsyncIterable<Stripe.Price>,
      (price) =>
        price.active &&
        price.nickname === nickname &&
        price.unit_amount === amount &&
        price.currency === 'usd' &&
        price.recurring?.interval === interval,
    );
    prices.push(
      found ??
        (await stripe.prices.create({
          product: product.id,
          active: true,
          nickname,
          currency: 'usd',
          unit_amount: amount,
          recurring: { interval },
        })),
    );
  }

  // Returned rather than looked up again by the caller: this search paginates, and a
  // caller re-reading only the first page would miss a coupon found on a later one.
  const coupon =
    (await findIn(
      stripe.coupons.list({ limit: 100 }) as unknown as AsyncIterable<Stripe.Coupon>,
      (candidate) =>
        candidate.name === COUPON_NAME &&
        candidate.percent_off === 10 &&
        candidate.duration === 'once' &&
        candidate.valid,
    )) ?? (await stripe.coupons.create({ percent_off: 10, duration: 'once', name: COUPON_NAME }));

  return { product, prices, coupon };
}

async function main(): Promise<void> {
  const stripe = stripeClient();
  const { product, prices } = await provision(stripe);

  log(`Provisioned at API version ${API_VERSION}\n`);
  log(`  product  ${product.name} (${product.id})`);
  for (const price of prices) {
    log(`  price    ${price.nickname} (${price.id})`);
  }
  log(`  coupon   ${COUPON_NAME}`);
  log('\nReady. Capture with `pnpm stripe:fixtures`.');
}

// Only run when invoked directly, so the capture script can import provision().
if (process.argv[1]?.endsWith('provision-stripe-environment.ts')) {
  main().catch((error: Error) => {
    log(`Provisioning failed: ${error.message}`);
    process.exit(1);
  });
}
