import { describe, expect, it } from 'vitest';
import {
  comparableTriggerRules,
  signupTriggerRules,
  scopeFromTriggerRules,
  getTriggerTierIds,
} from './trigger-rules';

describe('signup trigger rules', () => {
  it.each(['free', 'all_paid', 'selected_paid'] as const)('round trips %s selections', (scope) => {
    const ids = scope === 'selected_paid' ? ['bronze', 'gold'] : [];
    const rules = signupTriggerRules(scope, ids);
    expect(scopeFromTriggerRules(rules)).toBe(scope);
    expect(getTriggerTierIds(rules)).toEqual(ids);
  });

  it('keeps an empty specific-tier draft in the paid picker', () => {
    expect(scopeFromTriggerRules(signupTriggerRules('selected_paid'))).toBe('selected_paid');
  });

  it('ignores server rule ordering without hiding selection changes', () => {
    const rules = signupTriggerRules('selected_paid', ['gold', 'bronze']);
    expect(comparableTriggerRules(rules)).toEqual(comparableTriggerRules([...rules].reverse()));
    expect(comparableTriggerRules(rules)).not.toEqual(comparableTriggerRules(rules.slice(1)));
  });
});
