import { describe, expect, it } from 'vitest';
import { parseRecipientTiers } from './email-recipients-boundary';

describe('parseRecipientTiers', () => {
  it('keeps valid tiers', () => {
    expect(
      parseRecipientTiers({ tiers: [{ id: 'gold-id', slug: 'gold', name: 'Gold', active: true }] }),
    ).toEqual([{ id: 'gold-id', slug: 'gold', name: 'Gold', active: true }]);
  });

  it('returns no tiers when the response is missing or malformed', () => {
    expect(parseRecipientTiers(undefined)).toEqual([]);
    expect(parseRecipientTiers({ tiers: [{ slug: 42, name: 'Gold', active: true }] })).toEqual([]);
  });
});
