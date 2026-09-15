import { describe, expect, it } from 'vitest';
import { parseActivityEvent } from './activity-event';
import {
  parseMemberEvent,
  type MemberEventContext,
  type RawMemberEvent,
} from '@/members/detail/member-event';

const context: MemberEventContext = {
  hasMultipleNewsletters: false,
  hasMultipleTiers: false,
  paidMembersEnabled: true,
};
const event = (type: string, data: RawMemberEvent['data'] = {}): RawMemberEvent => ({ type, data });

describe('full Activity event presentation', () => {
  it.each([
    ['created', 1200, 'Paid $12/month'],
    ['created', -1050, 'Paid -$10.5/month'],
    ['updated', 101, 'MRR +$1.01'],
    ['updated', -101, 'MRR -$1.01'],
    ['canceled', -1200, 'MRR -$12'],
    ['reactivated', 1200, 'MRR +$12'],
    ['expired', -1200, 'MRR -$12'],
    ['updated', 100001, 'MRR +$1,000.01'],
    ['created', 0, undefined],
    ['updated', 0, undefined],
  ])('formats %s subscription delta %s', (type, mrrDelta, expected) => {
    expect(
      parseActivityEvent(
        event('subscription_event', { type, mrr_delta: mrrDelta, currency: 'usd' }),
        context,
      ).info,
    ).toBe(expected);
  });

  it('uses the tier name only when multiple tiers are available, including paid signups', () => {
    const created = event('subscription_event', {
      type: 'created',
      signup: true,
      mrr_delta: 2500,
      currency: 'eur',
      tierName: 'Supporter',
    });
    expect(parseActivityEvent(created, context).info).toBe('Paid €25/month');
    expect(parseActivityEvent(created, { ...context, hasMultipleTiers: true })).toMatchObject({
      action: 'signed up',
      info: 'Supporter €25/month',
    });
    expect(
      parseActivityEvent(event('subscription_event', { ...created.data, tierName: null }), {
        ...context,
        hasMultipleTiers: true,
      }).info,
    ).toBe('Paid €25/month');
  });

  it.each([
    [2500, 'usd', '$25'],
    [2501, 'usd', '$25.01'],
    [0, 'usd', '$0'],
    [-1050, 'usd', '$-10.5'],
    [123456, 'gbp', '£1,234.56'],
  ])('preserves donation amount %s %s', (amount, currency, expected) => {
    expect(parseActivityEvent(event('donation_event', { amount, currency }), context).info).toBe(
      expected,
    );
  });

  it.each([
    { amount: Number.NaN, currency: 'usd' },
    { amount: Infinity, currency: 'usd' },
    { amount: '1200', currency: 'usd' },
    { amount: null, currency: 'usd' },
    { amount: 1200, currency: 'invalid' },
    { amount: 1200, currency: null },
    {},
  ])(
    'omits malformed financial values without reporting a zero amount: %j',
    ({ amount, currency }) => {
      expect(
        parseActivityEvent(event('donation_event', { amount, currency }), context).info,
      ).toBeUndefined();
      expect(
        parseActivityEvent(event('subscription_event', { mrr_delta: amount, currency }), context)
          .info,
      ).toBeUndefined();
      expect(
        parseActivityEvent(
          event('gift_purchase_event', {
            amount,
            currency,
            tier_name: 'Supporter',
            duration: 1,
            cadence: 'month',
          }),
          context,
        ).action,
      ).toBe('Purchased gift subscription');
    },
  );

  it('preserves Ember gift conversion for all currencies and formats duration and fractions', () => {
    const gift = event('gift_purchase_event', {
      amount: 123450,
      currency: 'jpy',
      tier_name: 'Supporter',
      duration: 2,
      cadence: 'month',
    });
    expect(parseActivityEvent(gift, context)).toMatchObject({
      action: 'Purchased gift subscription for ¥1,234.5 (Supporter, 2 months)',
      actionTitle: 'Purchased gift subscription for ¥1,234.5 (Supporter, 2 months)',
    });
    expect(
      parseActivityEvent(
        event('gift_purchase_event', { ...gift.data, amount: 1050, currency: 'usd', duration: 1 }),
        context,
      ).action,
    ).toBe('Purchased gift subscription for $10.5 (Supporter, 1 month)');
  });

  it.each([0, -1, Infinity, Number.NaN, 1.5, null, '1'])(
    'falls back for invalid gift duration %s',
    (duration) => {
      expect(
        parseActivityEvent(
          event('gift_purchase_event', {
            amount: 1000,
            currency: 'usd',
            tier_name: 'Supporter',
            duration,
            cadence: 'month',
          }),
          context,
        ).action,
      ).toBe('Purchased gift subscription');
    },
  );

  it('cleans click descriptions while retaining destination and unrelated query parameters', () => {
    const click = event('click_event', {
      link: {
        to: 'https://www.example.com/path?ref=newsletter&attribution_id=post&attribution_type=post&utm_source=email#section',
      },
      post: { id: 'post-1', title: 'A post', url: 'https://example.com/post' },
    });
    expect(parseActivityEvent(click, context)).toMatchObject({
      description: 'example.com/path?utm_source=email#section',
      url: 'https://example.com/post',
      route: '#/posts/analytics/post-1',
    });
  });

  it('preserves invalid click URLs as text and omits missing/non-string descriptions', () => {
    expect(
      parseActivityEvent(event('click_event', { link: { to: 'not a URL' } }), context).description,
    ).toBe('not a URL');
    expect(parseActivityEvent(event('click_event'), context).description).toBeUndefined();
    expect(
      parseActivityEvent(event('click_event', { link: { to: 123 } }), context).description,
    ).toBeUndefined();
  });

  it('leaves the existing detail parser and raw events unchanged', () => {
    const cases = [
      event('subscription_event', { type: 'created', mrr_delta: 1000, currency: 'usd' }),
      event('donation_event', { amount: 1000, currency: 'usd' }),
      event('click_event', { link: { to: 'https://example.com/?ref=test' } }),
      event('gift_purchase_event', {
        amount: 10000,
        currency: 'jpy',
        tier_name: 'Supporter',
        duration: 1,
        cadence: 'month',
      }),
    ];
    const originals = structuredClone(cases);
    const detailBefore = cases.map((value) => parseMemberEvent(value, context));
    cases.forEach((value) => parseActivityEvent(value, context));
    expect(cases).toEqual(originals);
    expect(cases.map((value) => parseMemberEvent(value, context))).toEqual(detailBefore);
    expect(detailBefore[0].info).toBeUndefined();
    expect(detailBefore[1].info).toBeUndefined();
    expect(detailBefore[2].description).toBe('https://example.com/?ref=test');
    expect(detailBefore[3].action).toBe(
      'Purchased gift subscription for ¥10,000 (Supporter, 1 month)',
    );
  });

  it('preserves unrelated signup and gift-redemption information', () => {
    expect(parseActivityEvent(event('signup_event'), context).info).toBe('Free');
    expect(
      parseActivityEvent(event('signup_event', { created_with_status: 'paid' }), context).info,
    ).toBeNull();
    expect(
      parseActivityEvent(event('gift_redemption_event', { tier_name: 'Supporter' }), context).info,
    ).toBe('Supporter');
  });
});
