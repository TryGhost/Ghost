import fs from 'node:fs';
import { MembersService } from '@/helpers/services/members';
import {
  WebhookClient,
  buildCustomer,
  buildPaymentMethod,
  buildPrice,
  buildSubscription,
  buildSubscriptionCreatedEvent,
  buildSubscriptionDeletedEvent,
  buildSubscriptionUpdatedEvent,
} from '@/helpers/services/stripe';
import { test as baseTest, expect } from '@/helpers/playwright';
import { createMemberFactory, createPostFactory } from '@/data-factory';
import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import type { FakeStripeServer, StripeEvent, StripeSubscription } from '@/helpers/services/stripe';

const manifest = JSON.parse(
  fs.readFileSync(
    new URL('../../helpers/services/stripe/fixtures/manifest.json', import.meta.url),
    'utf8',
  ),
);
const stripeApiSource = fs.readFileSync(
  new URL('../../../ghost/core/core/server/services/stripe/stripe-api.js', import.meta.url),
  'utf8',
);

interface SubscriptionEvent {
  type: string;
  data: { type: string; mrr_delta: number; attribution: { id: string; type: string } | null };
}

async function createScenario(request: APIRequestContext, server: FakeStripeServer) {
  const customer = buildCustomer({
    email: `incomplete-${randomUUID()}@example.com`,
    name: 'Incomplete member',
  });
  server.upsertCustomer(customer);
  // Link an existing free member before Stripe creates the subscription.
  const member = await createMemberFactory(request).create({
    email: customer.email,
    name: customer.name,
    stripe_customer_id: customer.id,
    status: 'free',
  });
  const post = await createPostFactory(request).create({ status: 'published' });
  const price = buildPrice({ unit_amount: 500 });
  const paymentMethod = buildPaymentMethod();
  const subscription = buildSubscription({
    customerId: customer.id,
    price,
    paymentMethod,
    status: 'incomplete',
  });
  subscription.metadata = {
    attribution_id: post.id,
    attribution_type: 'post',
    attribution_url: `/${post.slug}/`,
    referrer_source: 'Google',
    utm_campaign: 'incomplete-checkout',
  };
  server.upsertPrice(price);
  server.upsertPaymentMethod(paymentMethod);
  server.upsertSubscription(subscription);
  return { member, post, subscription };
}

async function deliver(client: WebhookClient, event: StripeEvent) {
  const versionedEvent = { ...event, api_version: manifest.api_version };
  const response = await client.sendWebhook(versionedEvent);
  expect(response.ok, await response.text()).toBe(true);
}

async function updateStatus(
  client: WebhookClient,
  server: FakeStripeServer,
  subscription: StripeSubscription,
  status: StripeSubscription['status'],
) {
  const previousStatus = subscription.status;
  subscription.status = status;
  server.upsertSubscription(subscription);
  await deliver(
    client,
    buildSubscriptionUpdatedEvent({ subscription, previousAttributes: { status: previousStatus } }),
  );
}

async function readState(
  request: APIRequestContext,
  scenario: Awaited<ReturnType<typeof createScenario>>,
) {
  const member = await new MembersService(request).getByEmail(scenario.member.email);
  const paidResponse = await request.get('/ghost/api/admin/members/', {
    params: { filter: 'status:paid', limit: 1 },
  });
  expect(paidResponse.ok()).toBe(true);
  const paid = await paidResponse.json();
  const postResponse = await request.get(`/ghost/api/admin/posts/${scenario.post.id}/`, {
    params: { include: 'count.paid_conversions' },
  });
  expect(postResponse.ok()).toBe(true);
  const post = await postResponse.json();
  const eventsResponse = await request.get('/ghost/api/admin/members/events/', {
    params: { filter: `type:subscription_event+data.member_id:'${scenario.member.id}'` },
  });
  expect(eventsResponse.ok()).toBe(true);
  const { events }: { events: SubscriptionEvent[] } = await eventsResponse.json();
  const mrrResponse = await request.get('/ghost/api/admin/members/stats/mrr/');
  expect(mrrResponse.ok()).toBe(true);
  const mrr: { data: Array<{ currency: string; data: Array<{ value: number }> }> } =
    await mrrResponse.json();
  return {
    mrr: mrr.data.find((item) => item.currency === 'usd')?.data.at(-1)?.value ?? 0,
    status: member.status,
    paidCount: paid.meta.pagination.total,
    conversions: post.posts[0].count.paid_conversions,
    events,
  };
}

async function expectNoConversion(
  request: APIRequestContext,
  scenario: Awaited<ReturnType<typeof createScenario>>,
) {
  expect(await readState(request, scenario)).toEqual({
    status: 'free',
    mrr: 0,
    paidCount: 0,
    conversions: 0,
    events: [],
  });
}

const test = baseTest.extend({
  request: async ({ playwright, ghostInstance, ghostAccountOwner }, use) => {
    const request = await playwright.request.newContext({
      baseURL: ghostInstance.baseUrl,
      extraHTTPHeaders: { Origin: new URL(ghostInstance.baseUrl).origin },
    });
    try {
      const { email, password } = ghostAccountOwner;
      const response = await request.post('/ghost/api/admin/session/', {
        data: { username: email, password },
      });
      expect(response.ok()).toBe(true);
      await use(request);
    } finally {
      await request.dispose();
    }
  },
});

test.describe('Stripe incomplete subscription lifecycle', () => {
  test.use({ stripeEnabled: true });

  test.beforeEach(() => {
    expect(manifest.api_version).toBe('2020-08-27');
    expect(stripeApiSource).toContain(`const STRIPE_API_VERSION = '${manifest.api_version}'`);
  });

  test('incomplete subscription expires without paid members or conversions', async ({
    request,
    stripeServer,
    ghostInstance,
  }) => {
    const scenario = await createScenario(request, stripeServer!);
    const client = new WebhookClient(ghostInstance.baseUrl);
    await deliver(client, buildSubscriptionCreatedEvent({ subscription: scenario.subscription }));
    await expectNoConversion(request, scenario);

    await updateStatus(client, stripeServer!, scenario.subscription, 'incomplete_expired');
    await deliver(client, buildSubscriptionUpdatedEvent({ subscription: scenario.subscription }));
    await expectNoConversion(request, scenario);
  });

  test('successful payment counts once despite retries and retains conversion after cancellation', async ({
    request,
    stripeServer,
    ghostInstance,
  }) => {
    const scenario = await createScenario(request, stripeServer!);
    const client = new WebhookClient(ghostInstance.baseUrl);
    const created = buildSubscriptionCreatedEvent({
      subscription: structuredClone(scenario.subscription),
    });
    await deliver(client, created);
    await expectNoConversion(request, scenario);

    await updateStatus(client, stripeServer!, scenario.subscription, 'active');
    // The old event contains incomplete; Stripe's current resource is already active.
    await deliver(client, created);
    await deliver(client, buildSubscriptionUpdatedEvent({ subscription: scenario.subscription }));
    await expect
      .poll(() => readState(request, scenario))
      .toMatchObject({
        status: 'paid',
        mrr: 500,
        paidCount: 1,
        conversions: 1,
        events: [
          {
            type: 'subscription_event',
            data: {
              type: 'created',
              mrr_delta: 500,
              attribution: { id: scenario.post.id, type: 'post' },
            },
          },
        ],
      });

    scenario.subscription.status = 'canceled';
    scenario.subscription.canceled_at = Math.floor(Date.now() / 1000);
    stripeServer!.upsertSubscription(scenario.subscription);
    await deliver(client, buildSubscriptionDeletedEvent({ subscription: scenario.subscription }));
    const canceled = await readState(request, scenario);
    expect(canceled).toMatchObject({ status: 'free', paidCount: 0, mrr: 0, conversions: 1 });
    expect(
      canceled.events.map((event) => ({ type: event.data.type, mrr: event.data.mrr_delta })),
    ).toEqual(
      expect.arrayContaining([
        { type: 'created', mrr: 500 },
        { type: 'expired', mrr: -500 },
      ]),
    );
    expect(canceled.events).toHaveLength(2);
  });

  test('first webhook delivered after expiry uses current Stripe state', async ({
    request,
    stripeServer,
    ghostInstance,
  }) => {
    const scenario = await createScenario(request, stripeServer!);
    const client = new WebhookClient(ghostInstance.baseUrl);
    const created = buildSubscriptionCreatedEvent({
      subscription: structuredClone(scenario.subscription),
    });
    scenario.subscription.status = 'incomplete_expired';
    stripeServer!.upsertSubscription(scenario.subscription);

    await deliver(client, created);
    await deliver(client, created);
    await expectNoConversion(request, scenario);
  });
});
