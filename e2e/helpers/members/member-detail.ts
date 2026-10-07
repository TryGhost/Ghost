import { Page } from '@playwright/test';

// Fixtures and API interception shared by the member detail e2e suites.

export const memberPath = (memberId: string) => `/ghost/#/members/${memberId}`;

export const BRONZE = {
  id: 'tier_bronze',
  tier_id: 'tier_bronze',
  name: 'Bronze',
  slug: 'bronze',
  active: true,
  type: 'paid',
};

// A member comped on two tiers, where the surviving one carries an expiry the
// admin set. Removing the other must not disturb it.
export const SILVER_EXPIRY = '2027-03-01T00:00:00.000Z';
export const TWO_COMP_TIERS = () => [
  { ...BRONZE, expiry_at: null },
  {
    id: 'tier_silver',
    tier_id: 'tier_silver',
    name: 'Silver',
    slug: 'silver',
    active: true,
    type: 'paid',
    expiry_at: SILVER_EXPIRY,
  },
];

export type SentTier = { id: string; expiry_at?: string | null };
export const sentTiers = (sent: { body?: Record<string, unknown> }): SentTier[] | undefined =>
  (sent.body?.members as { tiers?: SentTier[] }[] | undefined)?.[0]?.tiers;

/**
 * Subscriptions as the members API actually serializes them: the tier is
 * carried on `price.tier` with a `tier_id`, and mirrored on the subscription
 * itself. Both are load-bearing — the two implementations read different ones
 * to group subscriptions under a tier, so a fixture that omits either renders
 * on one screen and not the other for reasons no user would ever hit.
 * See `serializers/output/members.js` ("Rename subscriptions.price.product to
 * subscriptions.price.tier").
 */
export const paidSubscription = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub_paid_123',
  customer: { id: 'cus_paid_123', name: 'Paid Member', email: 'paid-sub@ghost.org' },
  plan: { id: 'plan_paid', nickname: 'Monthly', interval: 'month', currency: 'usd', amount: 1050 },
  status: 'active',
  start_date: '2026-01-15T12:00:00.000Z',
  current_period_end: '2026-02-15T12:00:00.000Z',
  cancel_at_period_end: false,
  price: {
    id: 'price_paid',
    price_id: 'price_paid',
    nickname: 'Monthly',
    amount: 1050,
    currency: 'usd',
    type: 'recurring',
    interval: 'month',
    tier: { ...BRONZE },
  },
  tier: { ...BRONZE },
  offer: null,
  attribution: null,
  ...overrides,
});

// Gift and complimentary subscriptions are told apart by the plan nickname —
// both arrive with an empty id because neither has a Stripe subscription.
export const giftSubscription = (overrides: Record<string, unknown> = {}) => ({
  ...paidSubscription(),
  id: '',
  plan: {
    id: 'plan_gift',
    nickname: 'Gift Subscription',
    interval: 'year',
    currency: 'usd',
    amount: 0,
  },
  price: {
    id: 'price_gift',
    price_id: 'price_gift',
    nickname: 'Gift Subscription',
    amount: 0,
    currency: 'usd',
    type: 'recurring',
    interval: 'year',
    tier: { ...BRONZE },
  },
  ...overrides,
});

// Complimentary subscriptions arrive with an empty id and no Stripe plan.
export const compSubscription = (overrides: Record<string, unknown> = {}) => ({
  ...paidSubscription(),
  id: '',
  plan: {
    id: 'plan_comp',
    nickname: 'Complimentary',
    interval: 'year',
    currency: 'usd',
    amount: 0,
  },
  price: {
    id: 'price_comp',
    price_id: 'price_comp',
    nickname: 'Complimentary',
    amount: 0,
    currency: 'usd',
    type: 'recurring',
    interval: 'year',
    tier: { ...BRONZE },
  },
  ...overrides,
});

export type MemberStatus = 'paid' | 'comped' | 'gift';

// Playwright's wording once the page, context or a fetched response is gone.
export const isTeardownError = (err: unknown) =>
  err instanceof Error && /has been (disposed|closed)/.test(err.message);

/**
 * Rewrites this member on every read, letting a test serve a shape the fixture
 * database can't produce (Stripe subscriptions, engagement counters).
 */
export const interceptMemberRead = async (
  page: Page,
  memberId: string,
  patch: (member: Record<string, unknown>) => void,
) => {
  const memberReadRegex = new RegExp(`/ghost/api/admin/members/${memberId}/\\??[^/]*$`);
  await page.route(memberReadRegex, async (route) => {
    // `fallback`, not `continue` — continue would go straight to the network
    // and skip any handler registered after this one.
    if (route.request().method() !== 'GET') {
      return route.fallback();
    }
    try {
      const response = await route.fetch();
      const body = await response.json();
      if (body?.members?.[0]) {
        patch(body.members[0] as Record<string, unknown>);
      }
      return route.fulfill({ response, body: JSON.stringify(body) });
    } catch (err) {
      // A post-mutation refetch can still be in flight when the test ends;
      // teardown then disposes the response before `page.isClosed()` flips,
      // so the error itself is the only reliable signal. Anything else is a
      // real failure, and swallowing it would leave the request hanging
      // until the test times out with no clue why.
      if (!page.isClosed() && !isTeardownError(err)) {
        throw err;
      }
    }
  });
};

/**
 * Serves `subscriptions` on every read of this member. The array is held by
 * reference, so a test can mutate it to reflect a write the UI just made.
 */
export const seedSubscriptions = async (
  page: Page,
  memberId: string,
  memberStatus: MemberStatus,
  subscriptions: unknown[],
  extra: Record<string, unknown> = {},
) => {
  await interceptMemberRead(page, memberId, (member) => {
    member.subscriptions = subscriptions;
    // The member's status has to agree with the subscription it's being
    // given — a paid sub on a member marked `comp` is a combination the
    // server never produces, and it sends the status-dependent UI down the
    // wrong branch.
    member.status = memberStatus;
    Object.assign(member, extra);
  });
};

/**
 * Captures the write an action makes, without needing a real Stripe
 * subscription behind it. Asserting the request rather than the rendered result
 * keeps the test neutral: both screens must ask the server for the same thing.
 */
export const captureWrite = async (
  page: Page,
  urlPattern: string | RegExp,
  onCapture?: (body: Record<string, unknown>) => void,
) => {
  const sent: { body?: Record<string, unknown> } = {};
  await page.route(urlPattern, async (route) => {
    if (route.request().method() !== 'PUT') {
      return route.fallback();
    }
    sent.body = route.request().postDataJSON() as Record<string, unknown>;
    onCapture?.(sent.body);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ members: [{ id: 'ok' }] }),
    });
  });
  return sent;
};
