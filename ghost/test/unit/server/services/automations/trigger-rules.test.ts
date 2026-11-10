import { automationTriggerRuleDefinitionSchema } from '../../../../../core/server/services/automations/trigger-rules';

describe('automationTriggerRuleDefinitionSchema', () => {
  it.each([
    { trigger_type: 'free_signup', scope: null, product_id: null, direction: null },
    {
      trigger_type: 'paid_subscription_started',
      scope: 'any_paid_tier',
      product_id: null,
      direction: null,
    },
    {
      trigger_type: 'paid_subscription_started',
      scope: 'specific_paid_tier',
      product_id: '64b6f7b7c8f1a2b3c4d5e6f8',
      direction: null,
    },
  ])('accepts valid rule $trigger_type with scope $scope', (rule) => {
    expect(automationTriggerRuleDefinitionSchema.safeParse(rule).success).toBe(true);
  });

  it.each([undefined, 'from', 'to'])('requires null direction, rejecting %j', (direction) => {
    expect(
      automationTriggerRuleDefinitionSchema.safeParse({
        trigger_type: 'free_signup',
        scope: null,
        product_id: null,
        direction,
      }).success,
    ).toBe(false);
  });

  it.each([undefined, null, '', 'invalid'])(
    'rejects invalid specific-tier product ID %j',
    (product_id) => {
      expect(
        automationTriggerRuleDefinitionSchema.safeParse({
          trigger_type: 'paid_subscription_started',
          scope: 'specific_paid_tier',
          product_id,
          direction: null,
        }).success,
      ).toBe(false);
    },
  );
});
