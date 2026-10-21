import { describe, expect, it } from 'vitest';
import { isTransitionSideUnanswered, isTransitionUnanswered } from './subscription-transition';

describe('isTransitionSideUnanswered', () => {
  it('is unanswered only while the side has nothing chosen', () => {
    expect(isTransitionSideUnanswered([])).toBe(true);
    expect(isTransitionSideUnanswered(['gold'])).toBe(false);
    expect(isTransitionSideUnanswered('any_paid')).toBe(false);
    expect(isTransitionSideUnanswered('downgraded_to_free')).toBe(false);
  });
});

describe('isTransitionUnanswered', () => {
  it('is unanswered until both sides are', () => {
    expect(isTransitionUnanswered({ from: [], to: [] })).toBe(true);
    expect(isTransitionUnanswered({ from: 'any_paid', to: [] })).toBe(true);
    expect(isTransitionUnanswered({ from: [], to: 'downgraded_to_free' })).toBe(true);
    expect(isTransitionUnanswered({ from: ['bronze'], to: ['gold'] })).toBe(false);
  });
});
