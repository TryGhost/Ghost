import { describe, expect, it } from 'vitest';
import {
  isTierSelectionEmpty,
  hasMissingTierSelection,
  updateFromSelection,
} from './tier-selection';

describe('isTierSelectionEmpty', () => {
  it('is empty only when no tier or standalone option is selected', () => {
    expect(isTierSelectionEmpty([])).toBe(true);
    expect(isTierSelectionEmpty(['gold'])).toBe(false);
    expect(isTierSelectionEmpty('any_paid')).toBe(false);
    expect(isTierSelectionEmpty('downgraded_to_free')).toBe(false);
  });
});

describe('hasMissingTierSelection', () => {
  it('requires a selection in both From and To', () => {
    expect(hasMissingTierSelection({ from: [], to: [] })).toBe(true);
    expect(hasMissingTierSelection({ from: 'any_paid', to: [] })).toBe(true);
    expect(hasMissingTierSelection({ from: [], to: 'downgraded_to_free' })).toBe(true);
    expect(hasMissingTierSelection({ from: ['bronze'], to: ['gold'] })).toBe(false);
  });
});

describe('updateFromSelection', () => {
  it('removes overlapping To tiers while preserving the other selections', () => {
    const selection = { from: ['bronze'], to: ['silver', 'gold'] };
    expect(updateFromSelection(selection, ['bronze', 'gold'])).toEqual({
      from: ['bronze', 'gold'],
      to: ['silver'],
    });
    expect(selection.to).toEqual(['silver', 'gold']);
  });

  it('preserves To when From is any paid tier or has its tiers removed', () => {
    const selection = { from: ['bronze'], to: ['gold'] };
    expect(updateFromSelection(selection, 'any_paid').to).toEqual(['gold']);
    expect(updateFromSelection(selection, []).to).toEqual(['gold']);
  });

  it('keeps Free selected regardless of the From tiers', () => {
    expect(updateFromSelection({ from: [], to: 'downgraded_to_free' }, ['gold']).to).toBe(
      'downgraded_to_free',
    );
  });

  it('leaves To empty after its last conflicting tier is removed', () => {
    const next = updateFromSelection({ from: [], to: ['gold'] }, ['gold']);
    expect(next.to).toEqual([]);
    expect(hasMissingTierSelection(next)).toBe(true);
    expect(updateFromSelection(next, []).to).toEqual([]);
  });
});
