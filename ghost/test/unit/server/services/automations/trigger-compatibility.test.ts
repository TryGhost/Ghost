import type { AutomationTriggerRuleDefinition } from '../../../../../core/server/services/automations/trigger-rules';
// This compatibility layer will soon be removed, along with this test. See NY-1746.
import {
  legacyTriggerToRules,
  rulesToLegacyTrigger,
} from '../../../../../core/server/services/automations/trigger-compatibility';

const tierIds = ['64b6f7b7c8f1a2b3c4d5e6f7', '64b6f7b7c8f1a2b3c4d5e6f8'];
const cases = [
  {
    legacy: { trigger_tier_scope: 'free' as const, trigger_tier_ids: null },
    rules: [{ trigger_type: 'free_signup', scope: null, product_id: null, direction: null }],
  },
  {
    legacy: { trigger_tier_scope: 'all_paid' as const, trigger_tier_ids: null },
    rules: [
      {
        trigger_type: 'paid_subscription_started',
        scope: 'any_paid_tier',
        product_id: null,
        direction: null,
      },
    ],
  },
  {
    legacy: { trigger_tier_scope: 'selected_paid' as const, trigger_tier_ids: tierIds },
    rules: tierIds.map((product_id) => ({
      trigger_type: 'paid_subscription_started',
      scope: 'specific_paid_tier',
      product_id,
      direction: null,
    })),
  },
];

describe('automation API trigger compatibility', () => {
  it('throws an internal server error for empty rules', () => {
    expect(() => rulesToLegacyTrigger([])).toThrow(
      expect.objectContaining({
        errorType: 'InternalServerError',
        statusCode: 500,
        message: 'Cannot translate automation trigger rules: no rules provided.',
      }),
    );
  });

  for (const { legacy, rules } of cases) {
    it(`round-trips ${legacy.trigger_tier_scope}`, () => {
      const translated = legacyTriggerToRules(legacy);
      expect(translated).toEqual(rules);
      expect(rulesToLegacyTrigger(translated)).toEqual(legacy);
    });
  }

  it.each([null, undefined, ''])(
    'throws an internal server error for missing product_id: %j',
    (productId) => {
      // Simulate corrupt persisted data that bypassed request validation.
      const rule = {
        trigger_type: 'paid_subscription_started',
        scope: 'specific_paid_tier',
        product_id: productId,
        direction: null,
      } as unknown as AutomationTriggerRuleDefinition;
      expect(() => rulesToLegacyTrigger([rule])).toThrow(
        expect.objectContaining({
          errorType: 'InternalServerError',
          statusCode: 500,
          message: 'Cannot translate automation trigger rules: missing product_id.',
        }),
      );
    },
  );

  it('throws an internal server error for mixed rules', () => {
    expect(() =>
      rulesToLegacyTrigger([
        ...legacyTriggerToRules(cases[0].legacy),
        ...legacyTriggerToRules(cases[1].legacy),
      ]),
    ).toThrow(
      expect.objectContaining({
        errorType: 'InternalServerError',
        statusCode: 500,
        message: 'Cannot translate automation trigger rules: unsupported rules.',
      }),
    );
  });
});
