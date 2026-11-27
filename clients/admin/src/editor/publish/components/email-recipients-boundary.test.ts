import { describe, expect, it } from 'vitest';
import { parseRecipientLabelOptions, parseRecipientTiers } from './email-recipients-boundary';

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

describe('parseRecipientLabelOptions', () => {
  it('keeps the labels that have a slug and a name', () => {
    expect(
      parseRecipientLabelOptions([
        { value: 'vip', label: 'VIP', metadata: { id: 'vip-id' } },
        { value: 'staff', label: 'Staff' },
      ]),
    ).toEqual([
      { value: 'vip', label: 'VIP', metadata: { id: 'vip-id' } },
      { value: 'staff', label: 'Staff' },
    ]);
  });

  it('drops a malformed label and keeps the rest', () => {
    expect(
      parseRecipientLabelOptions([
        { value: 'vip', label: null },
        { value: 42, label: 'Answer' },
        { value: 'staff', label: 'Staff' },
      ]),
    ).toEqual([{ value: 'staff', label: 'Staff' }]);
  });

  it('returns no labels when the options are not a list', () => {
    expect(parseRecipientLabelOptions(undefined)).toEqual([]);
    expect(parseRecipientLabelOptions({ value: 'vip', label: 'VIP' })).toEqual([]);
  });
});
