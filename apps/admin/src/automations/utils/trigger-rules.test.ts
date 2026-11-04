import { describe, expect, it } from 'vitest';
import {
  comparableTriggerRules,
  buildTriggerRules,
  getTriggerTierIds,
  subscriptionChangedSelectionFromRules,
} from './trigger-rules';

describe('signup trigger rules', () => {
  it('encodes a free signup with no tier or direction', () => {
    expect(buildTriggerRules({ triggerType: 'free_signup' })).toEqual([
      { trigger_type: 'free_signup', scope: null, product_id: null, direction: null },
    ]);
  });

  it('distinguishes any paid tier from an unanswered specific-tier selection', () => {
    expect(buildTriggerRules({ triggerType: 'paid_subscription_started' })).toEqual([
      {
        trigger_type: 'paid_subscription_started',
        scope: 'any_paid_tier',
        product_id: null,
        direction: null,
      },
    ]);
    expect(
      buildTriggerRules({
        triggerType: 'paid_subscription_started',
        scope: 'specific_paid_tier',
        tierIds: [],
      }),
    ).toEqual([]);
  });

  it('encodes each selected paid tier without a From/To direction', () => {
    expect(
      buildTriggerRules({
        triggerType: 'paid_subscription_started',
        scope: 'specific_paid_tier',
        tierIds: ['bronze', 'gold'],
      }),
    ).toEqual([
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
    const rules = buildTriggerRules({
      triggerType: 'paid_subscription_started',
      scope: 'specific_paid_tier',
      tierIds: ['bronze', 'gold'],
    });
    const savedRules = [...rules]
      .reverse()
      .map((rule, index) => ({ ...rule, id: `rule-${index}`, automation_id: 'automation-id' }));
    expect(comparableTriggerRules(rules)).toEqual(comparableTriggerRules(savedRules));
    expect(comparableTriggerRules(rules)).not.toEqual(comparableTriggerRules(rules.slice(1)));
  });
});

describe('trigger tier IDs', () => {
  it('retains selected tier order and omits rules without a tier', () => {
    expect(
      getTriggerTierIds(
        buildTriggerRules({
          triggerType: 'paid_subscription_started',
          scope: 'specific_paid_tier',
          tierIds: ['gold', 'bronze'],
        }),
      ),
    ).toEqual(['gold', 'bronze']);
    expect(getTriggerTierIds(buildTriggerRules({ triggerType: 'free_signup' }))).toEqual([]);
    expect(
      getTriggerTierIds(buildTriggerRules({ triggerType: 'paid_subscription_started' })),
    ).toEqual([]);
  });
});

describe('incomplete paid_subscription_changed rules', () => {
  it('retains empty selections', () => {
    expect(
      buildTriggerRules({
        triggerType: 'paid_subscription_changed',
        selection: { from: [], to: [] },
      }),
    ).toEqual([]);
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
    expect(
      buildTriggerRules({
        triggerType: 'paid_subscription_changed',
        selection: { from: [], to: ['gold'] },
      }),
    ).toEqual(rules);
    expect(subscriptionChangedSelectionFromRules(rules)).toEqual({ from: [], to: ['gold'] });
  });
});

describe('paid_subscription_changed rule dirty comparison', () => {
  it('ignores ordering when paid_subscription_changed rules have no product IDs', () => {
    const rules = buildTriggerRules({
      triggerType: 'paid_subscription_changed',
      selection: {
        from: 'any_paid',
        to: 'downgraded_to_free',
      },
    });
    expect(comparableTriggerRules(rules)).toEqual(comparableTriggerRules([...rules].reverse()));
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
