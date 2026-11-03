import type { TierSelection } from '@/automations/types';
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
    }
  | {
      triggerType: 'paid_subscription_changed';
      selection: TierSelection;
      scope?: never;
      tierIds?: never;
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
    case 'paid_subscription_changed':
      return subscriptionChangedRulesFromSelection(options.selection);
    default: {
      const _exhaustive: never = triggerType;
      throw new Error(`Unknown automation trigger type: ${String(_exhaustive)}`);
    }
  }
}

export const getTriggerTierIds = (rules: readonly AutomationTriggerRule[]): string[] =>
  rules.flatMap((rule) => (rule.product_id ? [rule.product_id] : []));

// Rule order has no meaning for trigger eligibility. Sort copies by tier and
// direction so reordering selections does not mark the draft dirty or reorder its chips.
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

function subscriptionChangedRulesFromSelection(selection: TierSelection): AutomationTriggerRule[] {
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
