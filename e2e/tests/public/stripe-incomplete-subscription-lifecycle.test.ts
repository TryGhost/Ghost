import { MembersService } from '@/helpers/services/members';
import { createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import type { StripeTestService } from '@/helpers/services/stripe';

interface SubscriptionEvent {
  type: string;
  data: { type: string; mrr_delta: number; attribution: { id: string; type: string } | null };
}

async function createScenario(request: APIRequestContext, stripe: StripeTestService) {
  const email = `incomplete-${randomUUID()}@example.com`;
  const post = await createPostFactory(request).create({ status: 'published' });
  const subscription = await stripe.createIncompleteSubscription({
    email,
    name: 'Incomplete member',
    metadata: {
      attribution_id: post.id,
      attribution_type: 'post',
      attribution_url: `/${post.slug}/`,
      referrer_source: 'Google',
      utm_campaign: 'incomplete-checkout',
    },
  });
  const member = await new MembersService(request).getByEmail(email);
  return { member, post, subscription };
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

test.describe('Ghost Public - Stripe Incomplete Subscription Lifecycle', () => {
  test.use({ stripeEnabled: true });

  test('incomplete subscription expires without paid members or conversions', async ({
    page,
    stripe,
  }) => {
    const request = page.request;
    const scenario = await createScenario(request, stripe!);
    await stripe!.sendSubscriptionCreatedWebhook(scenario.subscription);
    await expectNoConversion(request, scenario);

    await stripe!.updateSubscriptionStatus({
      subscription: scenario.subscription,
      status: 'incomplete_expired',
    });
    await stripe!.updateSubscriptionStatus({
      subscription: scenario.subscription,
      status: 'incomplete_expired',
    });
    await expectNoConversion(request, scenario);
  });

  test('successful payment counts once despite retries and retains conversion after cancellation', async ({
    page,
    stripe,
  }) => {
    const request = page.request;
    const scenario = await createScenario(request, stripe!);
    const incomplete = structuredClone(scenario.subscription);
    await stripe!.sendSubscriptionCreatedWebhook(incomplete);
    await expectNoConversion(request, scenario);

    await stripe!.updateSubscriptionStatus({
      subscription: scenario.subscription,
      status: 'active',
    });
    // The old event contains incomplete; Stripe's current resource is already active.
    await stripe!.sendSubscriptionCreatedWebhook(incomplete);
    await stripe!.updateSubscriptionStatus({
      subscription: scenario.subscription,
      status: 'active',
    });
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

    await stripe!.deleteSubscription({ subscription: scenario.subscription });
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
    page,
    stripe,
  }) => {
    const request = page.request;
    const scenario = await createScenario(request, stripe!);
    const incomplete = structuredClone(scenario.subscription);
    await stripe!.updateSubscriptionStatus({
      subscription: scenario.subscription,
      status: 'incomplete_expired',
      sendWebhook: false,
    });

    await stripe!.sendSubscriptionCreatedWebhook(incomplete);
    await stripe!.sendSubscriptionCreatedWebhook(incomplete);
    await expectNoConversion(request, scenario);
  });
});
