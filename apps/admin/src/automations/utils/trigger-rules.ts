import type { TierSelection } from '@/automations/types';
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
    .sort(
      (a, b) =>
        (a.product_id ?? '').localeCompare(b.product_id ?? '') ||
        (a.direction ?? '').localeCompare(b.direction ?? ''),
    );

export function selectedPaidTierRules(tierIds: readonly string[]): AutomationTriggerRule[] {
  return tierIds.map((productId) => ({
    trigger_type: 'paid_subscription_started',
    scope: 'specific_paid_tier',
    product_id: productId,
    direction: null,
  }));
}

export function subscriptionChangedRulesFromSelection(
  selection: TierSelection,
): AutomationTriggerRule[] {
  const from: AutomationTriggerRule[] =
    selection.from === 'any_paid'
      ? [
          {
            trigger_type: 'paid_subscription_changed',
            scope: 'any_paid_tier',
            product_id: null,
            direction: 'from',
          },
        ]
      : selection.from.map((productId) => ({
          trigger_type: 'paid_subscription_changed',
          scope: 'specific_paid_tier',
          product_id: productId,
          direction: 'from',
        }));
  const to: AutomationTriggerRule[] =
    selection.to === 'downgraded_to_free'
      ? [
          {
            trigger_type: 'paid_subscription_changed',
            scope: 'free',
            product_id: null,
            direction: 'to',
          },
        ]
      : selection.to.map((productId) => ({
          trigger_type: 'paid_subscription_changed',
          scope: 'specific_paid_tier',
          product_id: productId,
          direction: 'to',
        }));
  return [...from, ...to];
}

export function subscriptionChangedSelectionFromRules(
  rules: readonly AutomationTriggerRule[],
): TierSelection {
  const from = rules.filter((rule) => rule.direction === 'from');
  const to = rules.filter((rule) => rule.direction === 'to');
  return {
    from: from.some((rule) => rule.scope === 'any_paid_tier')
      ? 'any_paid'
      : getTriggerTierIds(from),
    to: to.some((rule) => rule.scope === 'free') ? 'downgraded_to_free' : getTriggerTierIds(to),
  };
}
