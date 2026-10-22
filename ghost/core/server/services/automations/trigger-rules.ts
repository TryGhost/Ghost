import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';

export type TriggerType = 'membership_started' | 'paid_subscription_changed';
export type SubscriptionTransition = {
  from: 'any_paid' | string[];
  to: 'downgraded_to_free' | string[];
};
export type TriggerConfiguration = {
  trigger_type?: TriggerType;
  trigger_tier_scope?: null | 'free' | 'all_paid' | 'selected_paid';
  trigger_tier_ids?: string[] | null;
  subscription_transition?: SubscriptionTransition | null;
};
export type TriggerSelection = Omit<
  TriggerConfiguration,
  'trigger_tier_scope' | 'trigger_tier_ids'
> &
  (
    | { trigger_tier_scope: null | 'free' | 'all_paid'; trigger_tier_ids: null }
    | { trigger_tier_scope: 'selected_paid'; trigger_tier_ids: string[] }
  );
export type TriggerRule = {
  trigger_type: TriggerType;
  from_scope: 'all_paid' | 'specific_tier' | null;
  from_product_id: string | null;
  to_scope: 'free' | 'all_paid' | 'specific_tier';
  to_product_id: string | null;
};

/** Each selection pair is one whole alternative; never match halves of different rules. */
export function compileTriggerRules(config: TriggerConfiguration): TriggerRule[] {
  const triggerType = config.trigger_type ?? 'membership_started';
  if (triggerType === 'membership_started') {
    const base = { trigger_type: triggerType, from_scope: null, from_product_id: null };
    switch (config.trigger_tier_scope) {
      case 'free':
      case 'all_paid':
        return [{ ...base, to_scope: config.trigger_tier_scope, to_product_id: null }];
      case 'selected_paid':
        return [...new Set(config.trigger_tier_ids)]
          .sort()
          .map((id) => ({ ...base, to_scope: 'specific_tier', to_product_id: id }));
      default:
        return [];
    }
  }
  const transition = config.subscription_transition;
  if (!transition) {
    return [];
  }
  const from = transition.from === 'any_paid' ? [null] : [...new Set(transition.from)].sort();
  const to = transition.to === 'downgraded_to_free' ? [null] : [...new Set(transition.to)].sort();
  return from.flatMap((fromId) =>
    to.map((toId) => ({
      trigger_type: triggerType,
      from_scope: fromId === null ? ('all_paid' as const) : ('specific_tier' as const),
      from_product_id: fromId,
      to_scope: toId === null ? ('free' as const) : ('specific_tier' as const),
      to_product_id: toId,
    })),
  );
}

const ruleKey = (rule: TriggerRule) =>
  JSON.stringify([
    rule.trigger_type,
    rule.from_scope,
    rule.from_product_id,
    rule.to_scope,
    rule.to_product_id,
  ]);

/** Refuse a lossy projection: arbitrary pairs cannot be edited as two independent selections. */
export function decodeTriggerRules(
  triggerType: TriggerType,
  rules: TriggerRule[],
): TriggerSelection {
  if (
    rules.some(
      (rule) =>
        rule.trigger_type !== triggerType ||
        !['free', 'all_paid', 'specific_tier'].includes(rule.to_scope) ||
        (rule.to_scope === 'specific_tier' ? !rule.to_product_id : rule.to_product_id !== null) ||
        (triggerType === 'membership_started'
          ? rule.from_scope !== null || rule.from_product_id !== null
          : !['all_paid', 'specific_tier'].includes(rule.from_scope ?? '') ||
            (rule.from_scope === 'specific_tier'
              ? !rule.from_product_id
              : rule.from_product_id !== null)),
    )
  ) {
    throw new errors.InternalServerError({ message: 'Invalid automation trigger rules.' });
  }
  let config: TriggerSelection;
  if (triggerType === 'membership_started') {
    const scope = rules[0]?.to_scope;
    config =
      scope === 'specific_tier'
        ? {
            trigger_type: triggerType,
            trigger_tier_scope: 'selected_paid',
            trigger_tier_ids: [...new Set(rules.map((rule) => rule.to_product_id!))].sort(),
          }
        : {
            trigger_type: triggerType,
            trigger_tier_scope: scope ?? null,
            trigger_tier_ids: null,
          };
  } else {
    config = {
      trigger_type: triggerType,
      trigger_tier_scope: null,
      trigger_tier_ids: null,
      subscription_transition:
        rules.length === 0
          ? null
          : {
              from:
                rules[0].from_scope === 'all_paid'
                  ? 'any_paid'
                  : [...new Set(rules.map((rule) => rule.from_product_id!))].sort(),
              to:
                rules[0].to_scope === 'free'
                  ? 'downgraded_to_free'
                  : [...new Set(rules.map((rule) => rule.to_product_id!))].sort(),
            },
    };
  }
  const actual = rules.map(ruleKey).sort();
  const expected = compileTriggerRules(config).map(ruleKey).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new errors.InternalServerError({
      message: 'Automation trigger rules cannot be represented by the tier selections.',
    });
  }
  return config;
}

export async function replaceTriggerRules(
  trx: Knex.Transaction,
  automationId: string,
  config: TriggerConfiguration,
): Promise<void> {
  const rules = compileTriggerRules(config);
  await trx('automation_trigger_rules').where('automation_id', automationId).delete();
  if (rules.length) {
    await trx('automation_trigger_rules').insert(
      rules.map((rule) => ({ id: ObjectId().toHexString(), automation_id: automationId, ...rule })),
    );
  }
}

export async function readTriggerConfiguration(
  trx: Knex.Transaction,
  automationId: string,
  triggerType: TriggerType,
): Promise<TriggerSelection> {
  const rules = await trx('automation_trigger_rules').where('automation_id', automationId);
  return decodeTriggerRules(triggerType, rules);
}

export function getTriggerProductIds(config: TriggerConfiguration): string[] {
  return [
    ...new Set(
      compileTriggerRules(config)
        .flatMap((rule) => [rule.from_product_id, rule.to_product_id])
        .filter((id): id is string => id !== null),
    ),
  ].sort();
}
