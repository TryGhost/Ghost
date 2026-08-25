import { FakeStripeServer } from '@/helpers/services/stripe/fake-stripe-server';
import { expect, test } from '@playwright/test';

/**
 * Characterisation tests for how the fake Stripe server reads request bodies.
 *
 * Stripe's SDK sends form-encoded bodies, so everything arrives as a string and
 * bracket-notation arrays sometimes arrive as objects keyed by index. The server
 * coerces rather than rejects, because it must not be stricter than Stripe.
 *
 * These pin that behaviour at the HTTP boundary rather than against the parsing
 * functions themselves, so the parsing can be reimplemented without rewriting them.
 */
test.describe('Fake Stripe - reads request bodies the way Stripe does', () => {
  let server: FakeStripeServer;
  let base: string;

  test.beforeAll(async () => {
    server = new FakeStripeServer();
    await server.start();
    base = `http://127.0.0.1:${server.port}`;
  });

  test.afterAll(async () => {
    await server.stop();
  });

  async function post(path: string, body: unknown) {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }

  test('booleans arrive as strings and are coerced', async () => {
    const off = await post('/v1/products', { name: 'p', active: 'false' });
    const on = await post('/v1/products', { name: 'p', active: 'true' });
    const missing = await post('/v1/products', { name: 'p' });

    expect(off.body.active).toBe(false);
    expect(on.body.active).toBe(true);
    // Products default to active when the field is absent.
    expect(missing.body.active).toBe(true);
  });

  test('an unparseable boolean falls back rather than failing', async () => {
    const { body } = await post('/v1/products', { name: 'p', active: 'yes' });

    expect(body.active).toBe(true);
  });

  test('numbers arrive as strings and are coerced', async () => {
    const product = await post('/v1/products', { name: 'p' });
    const { body } = await post('/v1/prices', {
      product: product.body.id,
      unit_amount: '2500',
      currency: 'GBP',
    });

    expect(body.unit_amount).toBe(2500);
    // Currency is lower-cased, matching Stripe.
    expect(body.currency).toBe('gbp');
  });

  test('a recurring interval makes the price recurring, its absence makes it one-time', async () => {
    const product = await post('/v1/products', { name: 'p' });
    const recurring = await post('/v1/prices', {
      product: product.body.id,
      recurring: { interval: 'year' },
    });
    const oneTime = await post('/v1/prices', { product: product.body.id });

    expect(recurring.body.type).toBe('recurring');
    expect(recurring.body.recurring).toEqual({ interval: 'year' });
    expect(oneTime.body.type).toBe('one_time');
    expect(oneTime.body.recurring).toBeNull();
  });

  test('an unrecognised interval is ignored rather than rejected', async () => {
    const product = await post('/v1/products', { name: 'p' });
    const { body } = await post('/v1/prices', {
      product: product.body.id,
      recurring: { interval: 'fortnight' },
    });

    expect(body.type).toBe('one_time');
  });

  test('metadata keeps scalar values as strings and drops everything else', async () => {
    const product = await post('/v1/products', { name: 'p' });
    const price = await post('/v1/prices', {
      product: product.body.id,
      recurring: { interval: 'month' },
    });
    const { body } = await post('/v1/checkout/sessions', {
      mode: 'subscription',
      line_items: [{ price: price.body.id, quantity: 1 }],
      metadata: { a: 'one', b: 2, c: true, d: { nested: 'dropped' } },
    });

    expect(body.metadata).toEqual({ a: 'one', b: '2', c: 'true' });
  });

  test('invoice creation carries its invoice_data metadata', async () => {
    // Ghost puts ghost_donation here and asserts on it after the webhook, so losing
    // it is invisible until a donation e2e test fails.
    const product = await post('/v1/products', { name: 'p' });
    const price = await post('/v1/prices', {
      product: product.body.id,
      recurring: { interval: 'month' },
    });
    await post('/v1/checkout/sessions', {
      mode: 'payment',
      line_items: [{ price: price.body.id, quantity: 1 }],
      invoice_creation: { enabled: 'true', invoice_data: { metadata: { ghost_donation: 'true' } } },
    });

    const recorded = server.getCheckoutSessions().at(-1);

    expect(recorded?.request.invoice_creation?.enabled).toBe(true);
    expect(recorded?.request.invoice_creation?.invoice_data?.metadata.ghost_donation).toBe('true');
  });

  test('a missing product on price creation is refused', async () => {
    const { status, body } = await post('/v1/prices', { product: 'prod_nope' });

    expect(status).toBe(400);
    expect(body.error.message).toBe('No such product');
  });

  test('a missing coupon on a checkout session is refused', async () => {
    const { status, body } = await post('/v1/checkout/sessions', {
      mode: 'subscription',
      discounts: [{ coupon: 'coupon_nope' }],
    });

    expect(status).toBe(400);
    expect(body.error.message).toBe('No such coupon');
  });

  test('a custom unit amount replaces the fixed amount', async () => {
    const product = await post('/v1/products', { name: 'p' });
    const { body } = await post('/v1/prices', {
      product: product.body.id,
      unit_amount: '500',
      custom_unit_amount: { enabled: 'true', preset: '1200' },
    });

    expect(body.unit_amount).toBeNull();
    expect(body.custom_unit_amount).toEqual({ enabled: true, preset: 1200 });
  });

  test('a custom unit amount that is not enabled is dropped', async () => {
    const product = await post('/v1/products', { name: 'p' });
    const { body } = await post('/v1/prices', {
      product: product.body.id,
      unit_amount: '500',
      custom_unit_amount: { enabled: 'false' },
    });

    expect(body.unit_amount).toBe(500);
    expect(body.custom_unit_amount).toBeNull();
  });

  test('customer and product fall back to defaults when unnamed', async () => {
    const customer = await post('/v1/customers', {});
    const product = await post('/v1/products', {});

    expect(customer.body.email).toBe('test@example.com');
    expect(customer.body.name).toBe('Test User');
    expect(product.body.name).toBe('Test Product');
  });
});
