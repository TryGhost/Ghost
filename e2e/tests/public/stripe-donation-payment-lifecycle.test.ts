import { MailPit } from '@/helpers/services/email/mail-pit';
import { test as baseTest, expect } from '@/helpers/playwright';
import { createMemberFactory } from '@/data-factory';
import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';

interface DonationEvent {
  type: string;
  data: { amount: number; currency: string; stripe_checkout_session_id: string };
}

async function donationEvents(request: APIRequestContext, memberId: string) {
  const response = await request.get('/ghost/api/admin/members/events/', {
    params: { filter: `type:donation_event+data.member_id:'${memberId}'` },
  });
  expect(response.ok()).toBe(true);
  const body: { events: DonationEvent[] } = await response.json();
  return body.events;
}

async function donationEmails(name: string) {
  return new MailPit().search({ subject: name }, { timeoutMs: null });
}

async function createDonationCheckout(request: APIRequestContext) {
  const name = `Donation donor ${randomUUID()}`;
  const member = await createMemberFactory(request).create({ status: 'free', name });
  const signInResponse = await request.get(`/ghost/api/admin/members/${member.id}/signin_urls/`);
  expect(signInResponse.ok()).toBe(true);
  const {
    member_signin_urls: [signIn],
  } = await signInResponse.json();
  await request.get(signIn.url);
  const sessionResponse = await request.get('/members/api/session/');
  expect(sessionResponse.ok()).toBe(true);

  const response = await request.post('/members/api/create-stripe-checkout-session/', {
    data: {
      type: 'donation',
      customerEmail: member.email,
      identity: await sessionResponse.text(),
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel',
    },
  });
  expect(response.ok()).toBe(true);
  return { member, name };
}

const unpaidScenarios = [
  {
    name: 'pending payment fails',
    events: [
      'checkout.session.completed',
      'checkout.session.async_payment_failed',
      'checkout.session.async_payment_failed',
    ],
  },
  {
    name: 'abandoned checkout expires',
    events: ['checkout.session.expired', 'checkout.session.expired'],
  },
] as const;

// Use the same isolated Ghost and fake Stripe fixtures as browser tests, with
// an authenticated HTTP client for inspecting persisted member activity.
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

test.describe('Stripe donation payment lifecycle', () => {
  test.use({ stripeEnabled: true });

  test('pending donation is recorded and notified once when payment succeeds', async ({
    request,
    stripe,
  }) => {
    const { member, name } = await createDonationCheckout(request);
    const options = { email: member.email, name, amount: 1250 };

    await stripe!.sendLatestDonationCheckoutEvent({
      ...options,
      eventType: 'checkout.session.completed',
      paymentStatus: 'unpaid',
    });
    expect(await donationEvents(request, member.id)).toEqual([]);
    expect(await donationEmails(name)).toEqual([]);

    await stripe!.sendLatestDonationCheckoutEvent({
      ...options,
      eventType: 'checkout.session.async_payment_succeeded',
      paymentStatus: 'paid',
    });
    const sessionId = stripe!.getCheckoutSessions().at(-1)!.response.id;
    expect(await donationEvents(request, member.id)).toMatchObject([
      {
        type: 'donation_event',
        data: { amount: 1250, currency: 'usd', stripe_checkout_session_id: sessionId },
      },
    ]);
    await expect.poll(() => donationEmails(name)).toHaveLength(1);

    // Retry success, then deliver the original unpaid completion out of order.
    await stripe!.sendLatestDonationCheckoutEvent({
      ...options,
      eventType: 'checkout.session.async_payment_succeeded',
      paymentStatus: 'paid',
    });
    await stripe!.sendLatestDonationCheckoutEvent({
      ...options,
      eventType: 'checkout.session.completed',
      paymentStatus: 'unpaid',
    });
    expect(await donationEvents(request, member.id)).toHaveLength(1);
    expect(await donationEmails(name)).toHaveLength(1);
  });

  test('overlapping paid events record and notify one donation after retries', async ({
    request,
    stripe,
  }) => {
    const { member, name } = await createDonationCheckout(request);
    const options = { email: member.email, name, amount: 1250, paymentStatus: 'paid' as const };
    const deliveries = await Promise.allSettled([
      stripe!.sendLatestDonationCheckoutEvent({
        ...options,
        eventType: 'checkout.session.completed',
      }),
      stripe!.sendLatestDonationCheckoutEvent({
        ...options,
        eventType: 'checkout.session.async_payment_succeeded',
      }),
    ]);
    expect(deliveries.some((delivery) => delivery.status === 'fulfilled')).toBe(true);
    // A concurrent unique-index collision may fail a delivery. Stripe retries it;
    // replay both event types to prove that either retry is harmless.
    await stripe!.sendLatestDonationCheckoutEvent({
      ...options,
      eventType: 'checkout.session.completed',
    });
    await stripe!.sendLatestDonationCheckoutEvent({
      ...options,
      eventType: 'checkout.session.async_payment_succeeded',
    });
    expect(await donationEvents(request, member.id)).toHaveLength(1);
    await expect.poll(() => donationEmails(name)).toHaveLength(1);
  });

  for (const scenario of unpaidScenarios) {
    test(`${scenario.name} leaves no donation or staff notification`, async ({
      request,
      stripe,
    }) => {
      const { member, name } = await createDonationCheckout(request);

      for (const eventType of scenario.events) {
        await stripe!.sendLatestDonationCheckoutEvent({
          email: member.email,
          name,
          amount: 1250,
          eventType,
          paymentStatus: 'unpaid',
        });
        expect(await donationEvents(request, member.id)).toEqual([]);
        expect(await donationEmails(name)).toEqual([]);
      }
    });
  }
});

test.describe('Stripe donation with unavailable staff email', () => {
  test.use({
    stripeEnabled: true,
    config: {
      mail__options__host: '127.0.0.1',
      mail__options__port: '1',
      mail__options__connectionTimeout: '1000',
    },
  });

  test('acknowledges the paid donation and its retry when SMTP is unavailable', async ({
    request,
    stripe,
  }) => {
    const { member, name } = await createDonationCheckout(request);
    const event = {
      email: member.email,
      name,
      amount: 1250,
      eventType: 'checkout.session.completed' as const,
      paymentStatus: 'paid' as const,
    };

    // The helper rejects non-2xx webhook responses. A failed email must not
    // change a successfully recorded payment into a failed webhook delivery.
    await stripe!.sendLatestDonationCheckoutEvent(event);
    await stripe!.sendLatestDonationCheckoutEvent(event);
    expect(await donationEvents(request, member.id)).toHaveLength(1);
    expect(await donationEmails(name)).toEqual([]);
  });
});
