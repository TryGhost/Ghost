import {
  compileTriggerRules,
  decodeTriggerRules,
} from '../../../../../core/server/services/automations/trigger-rules';
import {
  addAutomationDataSchema,
  editAutomationDataSchema,
} from '../../../../../core/server/services/automations/automations-schemas';

const bronze = '000000000000000000000001';
const silver = '000000000000000000000002';
const gold = '000000000000000000000003';
const platinum = '000000000000000000000004';
const payload = {
  name: 'Upgrade',
  description: '',
  status: 'inactive',
  actions: [],
  edges: [],
  trigger_type: 'paid_subscription_changed',
};

describe('complete trigger rules', () => {
  it('round trips multiple From and To selections as complete alternatives', () => {
    const config = {
      ...payload,
      trigger_type: 'paid_subscription_changed' as const,
      subscription_transition: { from: [silver, bronze], to: [platinum, gold] },
    };
    const rules = compileTriggerRules(config);
    expect(rules).toHaveLength(4);
    expect(rules.map((rule) => [rule.from_product_id, rule.to_product_id])).toEqual([
      [bronze, gold],
      [bronze, platinum],
      [silver, gold],
      [silver, platinum],
    ]);
    expect(decodeTriggerRules(config.trigger_type, rules).subscription_transition).toEqual({
      from: [bronze, silver],
      to: [gold, platinum],
    });
  });

  it('does not broaden unrelated pairs into a Cartesian product on read', () => {
    const rules = compileTriggerRules({
      trigger_type: 'paid_subscription_changed',
      subscription_transition: { from: [bronze, silver], to: [gold, platinum] },
    });
    expect(() => decodeTriggerRules('paid_subscription_changed', [rules[0], rules[3]])).toThrow(
      'cannot be represented',
    );
    expect(() => decodeTriggerRules('paid_subscription_changed', [...rules, rules[0]])).toThrow(
      'cannot be represented',
    );
  });

  it('rejects malformed scopes and tier references on read', () => {
    const [rule] = compileTriggerRules({
      trigger_tier_scope: 'selected_paid',
      trigger_tier_ids: [gold],
    });
    expect(() =>
      decodeTriggerRules('membership_started', [{ ...rule, to_product_id: null }]),
    ).toThrow('Invalid');
    expect(() =>
      decodeTriggerRules('membership_started', [{ ...rule, from_scope: 'all_paid' }]),
    ).toThrow('Invalid');
  });

  it.each([
    { from: 'any_paid', to: 'downgraded_to_free' },
    { from: 'any_paid', to: [gold] },
    { from: [bronze, silver], to: 'downgraded_to_free' },
  ] as const)('round trips wildcard selections %j', (transition) => {
    const config = addAutomationDataSchema.parse({
      ...payload,
      subscription_transition: transition,
    });
    expect(
      decodeTriggerRules('paid_subscription_changed', compileTriggerRules(config))
        .subscription_transition,
    ).toEqual(transition);
  });

  it.each([
    { from: [], to: [gold] },
    { from: [bronze], to: [] },
    { from: [bronze, bronze], to: [gold] },
    { from: [bronze], to: [bronze] },
    { from: 'any_paid', to: ['invalid'] },
    { from: 'any_paid', to: 'all_paid' },
  ])('rejects invalid transition selections %j', (transition) => {
    expect(
      addAutomationDataSchema.safeParse({ ...payload, subscription_transition: transition })
        .success,
    ).toBe(false);
    expect(
      editAutomationDataSchema.safeParse({ ...payload, subscription_transition: transition })
        .success,
    ).toBe(false);
  });
});
