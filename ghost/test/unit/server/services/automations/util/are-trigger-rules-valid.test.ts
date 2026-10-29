import type { AutomationTriggerRuleDefinition } from '../../../../../../core/server/services/automations/trigger-rules';
import { areTriggerRulesValid } from '../../../../../../core/server/services/automations/util/are-trigger-rules-valid';

const freeRule: AutomationTriggerRuleDefinition = {
  trigger_type: 'free_signup',
  scope: null,
  product_id: null,
  direction: null,
};
const anyPaidRule: AutomationTriggerRuleDefinition = {
  trigger_type: 'paid_subscription_started',
  scope: 'any_paid_tier',
  product_id: null,
  direction: null,
};
const specificPaidRule = (productId: string): AutomationTriggerRuleDefinition => ({
  trigger_type: 'paid_subscription_started',
  scope: 'specific_paid_tier',
  product_id: productId,
  direction: null,
});
const firstTier = '64b6f7b7c8f1a2b3c4d5e6f7';
const secondTier = '64b6f7b7c8f1a2b3c4d5e6f8';
const thirdTier = '64b6f7b7c8f1a2b3c4d5e6f9';
const changedPaidRule = (
  direction: 'from' | 'to',
  productId: string,
): AutomationTriggerRuleDefinition => ({
  trigger_type: 'paid_subscription_changed',
  scope: 'specific_paid_tier',
  product_id: productId,
  direction,
});

const validCases = [
  { name: 'one free signup', rules: [freeRule] },
  { name: 'one any-paid-tier signup', rules: [anyPaidRule] },
  { name: 'one specific paid tier', rules: [specificPaidRule(firstTier)] },
  {
    name: 'distinct specific paid tiers',
    rules: [specificPaidRule(firstTier), specificPaidRule(secondTier)],
  },
  {
    name: 'distinct specific paid tiers in reverse order',
    rules: [specificPaidRule(secondTier), specificPaidRule(firstTier)],
  },
];

describe('areTriggerRulesValid', () => {
  it.each(validCases)('accepts $name', ({ rules }) => {
    expect(areTriggerRulesValid(rules)).toBe(true);
  });

  it.each([
    { name: 'no rules', rules: [] },
    { name: 'multiple free signups', rules: [freeRule, { ...freeRule }] },
    { name: 'multiple any-paid-tier signups', rules: [anyPaidRule, { ...anyPaidRule }] },
    { name: 'free then any paid', rules: [freeRule, anyPaidRule] },
    { name: 'any paid then free', rules: [anyPaidRule, freeRule] },
    { name: 'free then specific paid', rules: [freeRule, specificPaidRule(firstTier)] },
    { name: 'specific paid then free', rules: [specificPaidRule(firstTier), freeRule] },
    { name: 'any paid then specific paid', rules: [anyPaidRule, specificPaidRule(firstTier)] },
    { name: 'specific paid then any paid', rules: [specificPaidRule(firstTier), anyPaidRule] },
    {
      name: 'different scope after multiple specific tiers',
      rules: [specificPaidRule(firstTier), specificPaidRule(secondTier), anyPaidRule],
    },
    {
      name: 'different trigger type after multiple specific tiers',
      rules: [specificPaidRule(firstTier), specificPaidRule(secondTier), freeRule],
    },
    {
      name: 'adjacent duplicate products',
      rules: [specificPaidRule(firstTier), specificPaidRule(firstTier)],
    },
    {
      name: 'non-adjacent duplicate products',
      rules: [
        specificPaidRule(firstTier),
        specificPaidRule(secondTier),
        specificPaidRule(firstTier),
      ],
    },
    {
      name: 'duplicate products with different key order',
      rules: [
        specificPaidRule(firstTier),
        {
          direction: null,
          product_id: firstTier,
          scope: 'specific_paid_tier' as const,
          trigger_type: 'paid_subscription_started' as const,
        },
      ],
    },
  ])('rejects $name', ({ rules }) => {
    expect(areTriggerRulesValid(rules)).toBe(false);
  });

  describe('paid_subscription_changed', () => {
    it.each([
      { name: 'same product on both sides', from: [firstTier], to: [firstTier], valid: false },
      {
        name: 'partially overlapping products',
        from: [firstTier, secondTier],
        to: [secondTier, thirdTier],
        valid: false,
      },
      {
        name: 'overlap at the end of the to products',
        from: [firstTier, secondTier],
        to: [thirdTier, firstTier],
        valid: false,
      },
      {
        name: 'duplicate from products',
        from: [firstTier, firstTier],
        to: [secondTier],
        valid: false,
      },
      {
        name: 'duplicate to products',
        from: [firstTier],
        to: [secondTier, secondTier],
        valid: false,
      },
      { name: 'distinct products', from: [firstTier], to: [secondTier, thirdTier], valid: true },
      {
        name: 'distinct products in reverse',
        from: [secondTier, thirdTier],
        to: [firstTier],
        valid: true,
      },
    ])('validates $name', ({ from, to, valid }) => {
      const rules = [
        ...from.map((id) => changedPaidRule('from', id)),
        ...to.map((id) => changedPaidRule('to', id)),
      ];
      expect(areTriggerRulesValid(rules)).toBe(valid);
      expect(areTriggerRulesValid([...rules].reverse())).toBe(valid);
    });

    it.each([
      [
        {
          trigger_type: 'paid_subscription_changed',
          scope: 'any_paid_tier',
          product_id: null,
          direction: 'from',
        },
        {
          trigger_type: 'paid_subscription_changed',
          scope: 'free',
          product_id: null,
          direction: 'to',
        },
      ],
      [
        {
          trigger_type: 'paid_subscription_changed',
          scope: 'any_paid_tier',
          product_id: null,
          direction: 'from',
        },
        changedPaidRule('to', firstTier),
        changedPaidRule('to', secondTier),
      ],
      [
        changedPaidRule('from', firstTier),
        changedPaidRule('from', secondTier),
        {
          trigger_type: 'paid_subscription_changed',
          scope: 'free',
          product_id: null,
          direction: 'to',
        },
      ],
    ] satisfies AutomationTriggerRuleDefinition[][])('accepts valid scopes: %j', (...rules) => {
      expect(areTriggerRulesValid(rules)).toBe(true);
    });
  });

  it.each(validCases)('does not mutate frozen inputs: $name', ({ rules }) => {
    const input = structuredClone(rules);
    const before = structuredClone(input);
    input.forEach(Object.freeze);
    Object.freeze(input);
    expect(areTriggerRulesValid(input)).toBe(true);
    expect(input).toEqual(before);
  });

  it.each(['unsupported', 'toString', '__proto__', 'constructor'])(
    'throws an internal server error for unsupported runtime trigger type %s',
    (triggerType) => {
      // JavaScript callers can bypass the schema-derived TypeScript type.
      const rule = {
        ...freeRule,
        trigger_type: triggerType,
      } as unknown as AutomationTriggerRuleDefinition;
      expect(() => areTriggerRulesValid([rule])).toThrow(
        expect.objectContaining({ errorType: 'InternalServerError', statusCode: 500 }),
      );
    },
  );

  it('rejects a paid rule with a null runtime scope', () => {
    const rule = { ...anyPaidRule, scope: null } as unknown as AutomationTriggerRuleDefinition;
    expect(areTriggerRulesValid([rule])).toBe(false);
  });

  it('accepts readonly rule arrays', () => {
    const rules: readonly AutomationTriggerRuleDefinition[] = Object.freeze([
      Object.freeze(specificPaidRule(firstTier)),
      Object.freeze(specificPaidRule(secondTier)),
    ]);
    expect(areTriggerRulesValid(rules)).toBe(true);
  });

  it('throws an internal server error for an unsupported runtime paid scope', () => {
    const rule = {
      ...anyPaidRule,
      scope: 'unsupported',
    } as unknown as AutomationTriggerRuleDefinition;
    expect(() => areTriggerRulesValid([rule])).toThrow(
      expect.objectContaining({
        errorType: 'InternalServerError',
        statusCode: 500,
        message: 'Unexpected automation trigger rule scope: unsupported',
      }),
    );
  });
});
