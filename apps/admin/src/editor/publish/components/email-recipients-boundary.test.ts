import { describe, expect, it } from 'vitest';
import { parseRecipientSegments } from './email-recipients-boundary';

describe('parseRecipientSegments', () => {
  it('keeps valid tiers while labels are unavailable', () => {
    expect(
      parseRecipientSegments(
        { tiers: [{ id: 'gold-id', slug: 'gold', name: 'Gold', active: true }] },
        undefined,
      ),
    ).toEqual({
      tiers: [{ id: 'gold-id', slug: 'gold', name: 'Gold', active: true }],
      labels: [],
    });
  });

  it('keeps valid labels while tiers are malformed', () => {
    expect(
      parseRecipientSegments(
        { tiers: [{ slug: 42, name: 'Gold', active: true }] },
        { labels: [{ slug: 'vip', name: 'VIP' }] },
      ),
    ).toEqual({
      tiers: [],
      labels: [{ slug: 'vip', name: 'VIP' }],
    });
  });
});
