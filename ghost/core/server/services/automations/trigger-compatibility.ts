import errors from '@tryghost/errors';
import type { AutomationTriggerTierData } from './automations-repository';
import type { AutomationTriggerRuleDefinition } from './trigger-rules';

/**
 * Convert the legacy `trigger_tier_scope` + `trigger_tier_ids` to the new
 * trigger rules format. This will soon be removed; see NY-1746.
 */
export function legacyTriggerToRules(
  data: AutomationTriggerTierData,
): AutomationTriggerRuleDefinition[] {
  const scope = data.trigger_tier_scope;
  switch (scope) {
    case 'free':
      return [{ trigger_type: 'free_signup', scope: null, product_id: null, direction: null }];
    case 'all_paid':
      return [
        {
          trigger_type: 'paid_subscription_started',
          scope: 'any_paid_tier',
          product_id: null,
          direction: null,
        },
      ];
    case 'selected_paid':
      return data.trigger_tier_ids.map((productId) => ({
        trigger_type: 'paid_subscription_started',
        scope: 'specific_paid_tier',
        product_id: productId,
        direction: null,
      }));
    case null:
      return [];
    default: {
      const _exhaustive: never = scope;
      throw new errors.InternalServerError({
        message: `Unexpected automation trigger tier scope: ${_exhaustive}`,
      });
    }
  }
}

/**
 * Convert the new trigger rules format to the legacy `trigger_tier_scope` +
 * `trigger_tier_ids` style. This will soon be removed; see NY-1746.
 */
export function rulesToLegacyTrigger(
  rules: readonly AutomationTriggerRuleDefinition[],
): AutomationTriggerTierData {
  if (rules.length === 0) {
    throw new errors.InternalServerError({
      message: 'Cannot translate automation trigger rules: no rules provided.',
    });
  } else if (rules.every((rule) => rule.trigger_type === 'free_signup')) {
    return { trigger_tier_scope: 'free', trigger_tier_ids: null };
  } else if (rules.every((rule) => rule.scope === 'any_paid_tier')) {
    return { trigger_tier_scope: 'all_paid', trigger_tier_ids: null };
  } else if (rules.every((rule) => rule.scope === 'specific_paid_tier')) {
    return {
      trigger_tier_scope: 'selected_paid',
      trigger_tier_ids: rules.map((rule) => {
        if (!rule.product_id) {
          throw new errors.InternalServerError({
            message: 'Cannot translate automation trigger rules: missing product_id.',
          });
        }
        return rule.product_id;
      }),
    };
  } else {
    throw new errors.InternalServerError({
      message: 'Cannot translate automation trigger rules: unsupported rules.',
    });
  }
}
