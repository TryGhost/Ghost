import { describe, expect, it } from 'vitest';
import { tier } from '@tryghost/test-data';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';
import {
  VISIBILITY_OPTIONS,
  postTiers,
  selectedTierIds,
  selectedVisibility,
  tierOptions,
  tiersFromSelection,
} from './access-options';

describe('access options', () => {
  it('offers the four visibility choices in order', () => {
    expect(VISIBILITY_OPTIONS.map((option) => option.value)).toEqual([
      'public',
      'members',
      'paid',
      'tiers',
    ]);
    expect(VISIBILITY_OPTIONS.map((option) => option.label)).toEqual([
      'Public',
      'Members only',
      'Paid-members only',
      'Specific tier(s)',
    ]);
  });

  describe('selectedVisibility', () => {
    it('shows the post’s own visibility', () => {
      expect(selectedVisibility('members', 'paid')).toBe('members');
    });

    it('stands in the site default while the post carries none', () => {
      expect(selectedVisibility(null, 'paid')).toBe('paid');
      expect(selectedVisibility(undefined, 'tiers')).toBe('tiers');
    });

    it('falls back to public when neither is set', () => {
      expect(selectedVisibility(null, null)).toBe('public');
    });
  });

  describe('tierOptions', () => {
    it('keeps paid tiers only, active before archived', () => {
      const gold: Tier = tier({ name: 'Gold', type: 'paid', active: true });
      const free: Tier = tier({ name: 'Free', type: 'free', active: true });
      const bronze: Tier = tier({ name: 'Bronze', type: 'paid', active: false });
      const silver: Tier = tier({ name: 'Silver', type: 'paid', active: true });

      expect(tierOptions([gold, free, bronze, silver])).toEqual([
        { id: gold.id, name: 'Gold', archived: false },
        { id: silver.id, name: 'Silver', archived: false },
        { id: bronze.id, name: 'Bronze', archived: true },
      ]);
    });

    it('has no options before the tiers have loaded', () => {
      expect(tierOptions(undefined)).toEqual([]);
    });
  });

  describe('selection', () => {
    it('excludes the free tier returned with public posts while preserving unknown tier IDs', () => {
      const relations = [
        { id: 'free', type: 'free' },
        { id: 'paid', type: 'paid' },
        { id: 'unlisted' },
      ];

      expect(selectedTierIds(relations)).toEqual(['paid', 'unlisted']);
      expect(postTiers(relations)).toEqual([{ id: 'paid' }, { id: 'unlisted' }]);
    });

    it('reads the post’s tier ids and drops relations without one', () => {
      expect(selectedTierIds([{ id: 'a' }, {}, { id: 'b' }])).toEqual(['a', 'b']);
      expect(postTiers([{ id: 'a' }, {}])).toEqual([{ id: 'a' }]);
    });

    it('writes the selection in option order, not the order it was ticked', () => {
      const options = [
        { id: 'a', name: 'A', archived: false },
        { id: 'b', name: 'B', archived: false },
        { id: 'c', name: 'C', archived: true },
      ];

      expect(tiersFromSelection(options, new Set(['c', 'a']))).toEqual([{ id: 'a' }, { id: 'c' }]);
    });

    it('keeps a selected tier the options do not list', () => {
      const options = [{ id: 'a', name: 'A', archived: false }];

      expect(tiersFromSelection(options, new Set(['unlisted', 'a']))).toEqual([
        { id: 'a' },
        { id: 'unlisted' },
      ]);
    });
  });
});
