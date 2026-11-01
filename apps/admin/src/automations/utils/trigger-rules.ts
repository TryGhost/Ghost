import type { AutomationTriggerRule } from '@tryghost/admin-x-framework/api/automations';

export type SignupTriggerScope = 'free' | 'all_paid' | 'selected_paid';

export function signupTriggerRules(
  scope: SignupTriggerScope,
  tierIds: readonly string[] = [],
): AutomationTriggerRule[] {
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
      return tierIds.map((productId) => ({
        trigger_type: 'paid_subscription_started',
        scope: 'specific_paid_tier',
        product_id: productId,
        direction: null,
      }));
    default: {
      const _exhaustive: never = scope;
      throw new Error(`Unknown signup trigger scope: ${String(_exhaustive)}`);
    }
  }
}

export function scopeFromTriggerRules(rules: readonly AutomationTriggerRule[]): SignupTriggerScope {
  if (rules[0]?.trigger_type === 'free_signup') {
    return 'free';
  }
  // An empty selection is an unsaved specific-tier draft, blocked by validation.
  return rules[0]?.scope === 'any_paid_tier' ? 'all_paid' : 'selected_paid';
}

export const getTriggerTierIds = (rules: readonly AutomationTriggerRule[]): string[] =>
  rules.flatMap((rule) => (rule.product_id ? [rule.product_id] : []));

// Core orders saved rules by product_id and direction; drafts follow picker selection order.
// Normalize both so reselecting the same tiers in a different order does not mark the draft dirty.
export const comparableTriggerRules = (rules: readonly AutomationTriggerRule[]) =>
  rules
    .map((rule) => ({
      trigger_type: rule.trigger_type,
      scope: rule.scope,
      product_id: rule.product_id,
      direction: rule.direction,
    }))
    .sort((a, b) => (a.product_id ?? '').localeCompare(b.product_id ?? ''));
