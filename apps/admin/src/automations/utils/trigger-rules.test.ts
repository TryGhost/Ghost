import { describe, expect, it } from 'vitest';
import {
  comparableTriggerRules,
  signupTriggerRules,
  selectedPaidTierRules,
  getTriggerTierIds,
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

describe('trigger rule dirty comparison', () => {
  it('ignores order and server metadata but detects added or removed tiers', () => {
    const rules = selectedPaidTierRules(['bronze', 'gold']);
    const savedRules = [...rules]
      .reverse()
      .map((rule, index) => ({ ...rule, id: `rule-${index}`, automation_id: 'automation-id' }));
    expect(comparableTriggerRules(rules)).toEqual(comparableTriggerRules(savedRules));
    expect(comparableTriggerRules(rules)).not.toEqual(comparableTriggerRules(rules.slice(1)));
  });
});

describe('trigger tier IDs', () => {
  it('retains selected tier order and omits rules without a tier', () => {
    expect(getTriggerTierIds(selectedPaidTierRules(['gold', 'bronze']))).toEqual([
      'gold',
      'bronze',
    ]);
    expect(getTriggerTierIds(signupTriggerRules('free_signup'))).toEqual([]);
    expect(getTriggerTierIds(signupTriggerRules('paid_subscription_started'))).toEqual([]);
  });
});
