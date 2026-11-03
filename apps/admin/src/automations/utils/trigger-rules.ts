import type { AutomationTriggerRule } from '@tryghost/admin-x-framework/api/automations';

type TriggerRuleOptions =
  | {
      triggerType: 'free_signup' | 'paid_subscription_started';
      scope?: never;
      tierIds?: never;
    }
  | {
      triggerType: 'paid_subscription_started';
      scope: 'any_paid_tier';
      tierIds?: never;
    }
  | {
      triggerType: 'paid_subscription_started';
      scope: 'specific_paid_tier';
      tierIds: readonly string[];
    };

export function buildTriggerRules(options: TriggerRuleOptions): AutomationTriggerRule[] {
  const { triggerType } = options;
  switch (triggerType) {
    case 'free_signup':
      return [{ trigger_type: triggerType, scope: null, product_id: null, direction: null }];
    case 'paid_subscription_started':
      if (options.scope === 'specific_paid_tier') {
        return options.tierIds.map((productId) => ({
          trigger_type: triggerType,
          scope: options.scope,
          product_id: productId,
          direction: null,
        }));
      }
      return [
        { trigger_type: triggerType, scope: 'any_paid_tier', product_id: null, direction: null },
      ];
    default: {
      const _exhaustive: never = triggerType;
      throw new Error(`Unknown signup trigger type: ${String(_exhaustive)}`);
    }
  }
}

export const getTriggerTierIds = (rules: readonly AutomationTriggerRule[]): string[] =>
  rules.flatMap((rule) => (rule.product_id ? [rule.product_id] : []));

// Rule order has no meaning for signup eligibility. Compare copies in tier order so
// reselecting the same tiers does not mark the draft dirty or reorder its chips.
export const comparableTriggerRules = (rules: readonly AutomationTriggerRule[]) =>
  rules
    .map((rule) => ({
      trigger_type: rule.trigger_type,
      scope: rule.scope,
      product_id: rule.product_id,
      direction: rule.direction,
    }))
    .sort((a, b) => (a.product_id ?? '').localeCompare(b.product_id ?? ''));
