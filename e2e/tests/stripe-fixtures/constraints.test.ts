import { FakeStripeServer } from '@/helpers/services/stripe/fake-stripe-server';
import { expect, test } from '@playwright/test';

/**
 * The fake Stripe server used to accept anything, so a request Stripe would reject
 * passed in tests and failed in production. That is what took the Stripe Tax private
 * beta down twice in May 2024 (ONC-10, ONC-35), both times because Ghost sent a
 * checkout session Stripe refused.
 *
 * These constraints and their messages were measured against Stripe test mode at API
 * version 2020-08-27, not read from the docs: the docs and the OpenAPI spec each
 * disagree with the API on at least one of them.
 */
test.describe('Fake Stripe - rejects what Stripe rejects', () => {
  let server: FakeStripeServer;
  let url: string;

  test.beforeAll(async () => {
    server = new FakeStripeServer();
    await server.start();
    url = `http://127.0.0.1:${server.port}/v1/checkout/sessions`;
  });

  test.afterAll(async () => {
    await server.stop();
  });

  async function createSession(body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'subscription', ...body }),
    });
    return { status: response.status, body: await response.json() };
  }

  test('a label over 50 characters is refused', async () => {
    const { status, body } = await createSession({
      custom_fields: [
        { key: 'probe', type: 'text', label: { type: 'custom', custom: 'a'.repeat(51) } },
      ],
    });

    expect(status).toBe(400);
    expect(body.error.message).toContain('must be at most 50 characters');
  });

  test('a label at exactly 50 characters is accepted', async () => {
    const { status } = await createSession({
      custom_fields: [
        { key: 'probe', type: 'text', label: { type: 'custom', custom: 'a'.repeat(50) } },
      ],
    });

    expect(status).toBe(200);
  });

  test('a fourth custom field is refused', async () => {
    const { status, body } = await createSession({
      custom_fields: [1, 2, 3, 4].map((n) => ({
        key: `probe_${n}`,
        type: 'text',
        label: { type: 'custom', custom: `Field ${n}` },
      })),
    });

    expect(status).toBe(400);
    expect(body.error.message).toContain('exceeded maximum 3 allowed elements');
  });

  // Ghost leaves out only the part whose parameter Stripe names, so the name matters as much as
  // the refusal.
  test('a country Stripe does not ship to is refused, naming its place in the list', async () => {
    const { status, body } = await createSession({
      shipping_address_collection: { allowed_countries: ['GB', 'UK'] },
    });

    expect(status).toBe(400);
    expect(body.error.param).toBe('shipping_address_collection[allowed_countries][1]');
  });

  test('customer_update without a customer is refused - ONC-35', async () => {
    const { status, body } = await createSession({ customer_update: { address: 'auto' } });

    expect(status).toBe(400);
    expect(body.error.message).toContain('`customer_update` can only be used with `customer`');
  });

  test('an empty customer_update is refused, as Stripe refuses an unset attempt', async () => {
    // Form bodies encode a missing object as an empty string, so this is reachable
    // without anyone writing `customer_update: ''` by hand.
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ mode: 'subscription', customer_update: '' }).toString(),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain('cannot be unset');
  });

  test('customer_update with a customer is accepted', async () => {
    const { status } = await createSession({
      customer: 'cus_probe',
      customer_update: { address: 'auto' },
    });

    expect(status).toBe(200);
  });

  // Every signed-in checkout carries a customer, so a tier collecting a tax number could
  // not be bought by an existing member until Ghost sent the pair. Shipping and phone
  // collection were probed alongside it and need nothing, so this is a rule about tax
  // rather than about collecting from a customer.
  test('tax_id_collection for an existing customer needs customer_update[name]', async () => {
    const { status, body } = await createSession({
      customer: 'cus_probe',
      tax_id_collection: { enabled: true },
    });

    expect(status).toBe(400);
    expect(body.error.message).toContain('please set `customer_update[name]`');
  });

  // Ghost makes a buyer's customer with an email and a name, so it holds no address for Stripe
  // to check a tax ID against.
  test('tax_id_collection for an existing customer without an address needs customer_update[address]', async () => {
    const { status, body } = await createSession({
      customer: 'cus_probe',
      tax_id_collection: { enabled: true },
      customer_update: { name: 'auto' },
    });

    expect(status).toBe(400);
    expect(body.error.message).toContain('please set `customer_update[address]`');
  });

  test('tax_id_collection for an existing customer is accepted with both', async () => {
    const { status } = await createSession({
      customer: 'cus_probe',
      tax_id_collection: { enabled: true },
      customer_update: { name: 'auto', address: 'auto' },
    });

    expect(status).toBe(200);
  });

  test('tax_id_collection with a shipping address for an existing customer needs customer_update[shipping]', async () => {
    const shipping = { shipping_address_collection: { allowed_countries: ['GB'] } };
    const refused = await createSession({
      customer: 'cus_probe',
      tax_id_collection: { enabled: true },
      ...shipping,
      customer_update: { name: 'auto', address: 'auto' },
    });
    const accepted = await createSession({
      customer: 'cus_probe',
      tax_id_collection: { enabled: true },
      ...shipping,
      customer_update: { name: 'auto', address: 'auto', shipping: 'auto' },
    });

    expect(refused.status).toBe(400);
    expect(refused.body.error.message).toContain('please set `customer_update[shipping]`');
    expect(accepted.status).toBe(200);
  });

  test('automatic_tax for an existing customer without an address needs customer_update[address]', async () => {
    const { status, body } = await createSession({
      customer: 'cus_probe',
      automatic_tax: { enabled: true },
    });

    expect(status).toBe(400);
    expect(body.error.message).toContain("set `customer_update[address]` to 'auto'");
  });

  test('automatic_tax with a shipping address for an existing customer needs customer_update[shipping]', async () => {
    const { status, body } = await createSession({
      customer: 'cus_probe',
      automatic_tax: { enabled: true },
      shipping_address_collection: { allowed_countries: ['GB'] },
      customer_update: { address: 'auto' },
    });

    expect(status).toBe(400);
    expect(body.error.message).toContain("set `customer_update[shipping]` to 'auto'");
  });

  test('a shipping address for an existing customer needs nothing saved', async () => {
    const { status } = await createSession({
      customer: 'cus_probe',
      shipping_address_collection: { allowed_countries: ['GB'] },
    });

    expect(status).toBe(200);
  });

  test('tax_id_collection without a customer needs nothing', async () => {
    const { status } = await createSession({ tax_id_collection: { enabled: true } });

    expect(status).toBe(200);
  });

  // Form encoding delivers the flag as a string, and `"false"` is truthy. Reading it for
  // truthiness would refuse a checkout that asks for no tax number at all, which is the
  // fake being stricter than Stripe rather than matching it.
  test('tax_id_collection switched off needs nothing', async () => {
    const { status } = await createSession({
      customer: 'cus_probe',
      tax_id_collection: { enabled: 'false' },
    });

    expect(status).toBe(200);
  });
});
