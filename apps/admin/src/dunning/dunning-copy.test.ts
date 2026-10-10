import { describe, expect, test } from 'vitest';

import type { DunningState } from './use-dunning-state';
import {
  EXPORT_URL,
  bannerMessage,
  bannerTitle,
  daysLeftLabel,
  lockedHeadline,
  lockedMessage,
} from './dunning-copy';
import { DATA_EXPORT_ROUTE } from './stand-down-routes';

const state = (overrides: Partial<DunningState> = {}): DunningState => ({
  phase: 'warning',
  daysLeft: 14,
  urgent: false,
  lockDismissed: false,
  paymentFailedAt: new Date('2026-09-01T00:00:00Z'),
  suspendsAt: new Date('2026-09-29T00:00:00Z'),
  ...overrides,
});

describe('dunning copy', () => {
  test('the export CTA leads to the route the takeover stands down on', () => {
    expect(EXPORT_URL).toBe(`#${DATA_EXPORT_ROUTE}`);
  });

  test('bannerTitle addresses the reader and escalates with urgency', () => {
    expect(bannerTitle(state(), true)).toBe('Your payment didn’t go through.');
    expect(bannerTitle(state({ urgent: true }), true)).toBe('Action needed: payment failed.');
    expect(bannerTitle(state(), false)).toBe('This site’s payment failed.');
    expect(bannerTitle(state({ urgent: true }), false)).toBe('Payment still failing.');
  });

  test('bannerMessage asks the owner to pay and staff to remind them', () => {
    expect(bannerMessage(state(), true)).toMatch(/^Complete your payment/);
    expect(bannerMessage(state(), false)).toMatch(/^Remind the site owner/);
  });

  test('daysLeftLabel handles the singular day', () => {
    expect(daysLeftLabel(1)).toBe('1 day');
    expect(daysLeftLabel(6)).toBe('6 days');
    expect(bannerMessage(state({ daysLeft: 1 }), true)).toMatch(/\(1 day left\)/);
  });

  test('lockedHeadline counts down to the suspension', () => {
    expect(lockedHeadline(6)).toBe('Your site will be suspended in 6 days');
    expect(lockedHeadline(1)).toBe('Your site will be suspended tomorrow');
    expect(lockedHeadline(0)).toBe('Your site will be suspended soon');
  });

  test('lockedMessage addresses the reader', () => {
    expect(lockedMessage(state(), true)).toMatch(/Pay the outstanding invoice/);
    expect(lockedMessage(state(), false)).toMatch(/Remind the site owner/);
  });
});
