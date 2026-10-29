import { describe, expect, it } from 'vitest';
import {
  comparableTriggerRules,
  selectedPaidTierRules,
  subscriptionChangedRulesFromSelection,
  subscriptionChangedSelectionFromRules,
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

describe('incomplete lifecycle rules', () => {
  it('retains empty selections', () => {
    expect(subscriptionChangedRulesFromSelection({ from: [], to: [] })).toEqual([]);
    expect(subscriptionChangedSelectionFromRules([])).toEqual({ from: [], to: [] });
  });

  it('retains a destination while the source is unanswered', () => {
    const rules = [
      {
        trigger_type: 'paid_subscription_changed',
        scope: 'specific_paid_tier',
        product_id: 'gold',
        direction: 'to',
      },
    ] as const;
    expect(subscriptionChangedRulesFromSelection({ from: [], to: ['gold'] })).toEqual(rules);
    expect(subscriptionChangedSelectionFromRules(rules)).toEqual({ from: [], to: ['gold'] });
  });
});

describe('trigger rule dirty comparison', () => {
  it('ignores ordering when lifecycle rules have no product IDs', () => {
    const rules = subscriptionChangedRulesFromSelection({
      from: 'any_paid',
      to: 'downgraded_to_free',
    });
    expect(comparableTriggerRules(rules)).toEqual(comparableTriggerRules([...rules].reverse()));
  });

  it('ignores order and server metadata but detects added or removed tiers', () => {
    const rules = selectedPaidTierRules(['bronze', 'gold']);
    const savedRules = [...rules]
      .reverse()
      .map((rule, index) => ({ ...rule, id: `rule-${index}`, automation_id: 'automation-id' }));
    expect(comparableTriggerRules(rules)).toEqual(comparableTriggerRules(savedRules));
    expect(comparableTriggerRules(rules)).not.toEqual(comparableTriggerRules(rules.slice(1)));
  });

  it('detects a change in direction for the same tier', () => {
    const from = {
      trigger_type: 'paid_subscription_changed',
      scope: 'specific_paid_tier',
      product_id: 'silver',
      direction: 'from',
    } as const;
    expect(comparableTriggerRules([from])).not.toEqual(
      comparableTriggerRules([{ ...from, direction: 'to' }]),
    );
  });
});
