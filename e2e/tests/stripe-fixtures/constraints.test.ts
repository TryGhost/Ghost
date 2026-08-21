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
});
