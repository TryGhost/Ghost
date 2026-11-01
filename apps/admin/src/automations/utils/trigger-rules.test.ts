import { describe, expect, it } from 'vitest';
import {
  comparableTriggerRules,
  signupTriggerRules,
  selectedPaidTierRules,
  subscriptionChangedRulesFromSelection,
  subscriptionChangedSelectionFromRules,
} from './trigger-rules';

describe('signup trigger rules', () => {
  it('encodes a free signup with no tier or direction', () => {
    expect(signupTriggerRules('free_signup')).toEqual([
      { trigger_type: 'free_signup', scope: null, product_id: null, direction: null },
    ]);
  });

  it('distinguishes any paid tier from an unanswered specific-tier selection', () => {
    expect(signupTriggerRules('paid_subscription_started')).toEqual([
      {
        trigger_type: 'paid_subscription_started',
        scope: 'any_paid_tier',
        product_id: null,
        direction: null,
      },
    ]);
    expect(selectedPaidTierRules([])).toEqual([]);
  });

  it('encodes each selected paid tier without a lifecycle direction', () => {
    expect(selectedPaidTierRules(['bronze', 'gold'])).toEqual([
      {
        trigger_type: 'paid_subscription_started',
        scope: 'specific_paid_tier',
        product_id: 'bronze',
        direction: null,
      },
      {
        trigger_type: 'paid_subscription_started',
        scope: 'specific_paid_tier',
        product_id: 'gold',
        direction: null,
      },
    ]);
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
