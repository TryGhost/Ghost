import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { ReadonlyDeep } from 'type-fest';
import { z } from 'zod';
import { DbDate } from '../../lib/db-types/date';
import { ObjectIdSchema } from '../../lib/db-types/object-id';
import type { AutomationTriggerTierScope } from './automations-repository-2';

const labelFilterRuleDefinitionSchema = z.object({
  trigger_type: z.enum(['free_signup', 'paid_subscription_started', 'paid_subscription_changed']),
  scope: z.literal('specific_label'),
  product_id: z.null(),
  direction: z.null(),
  operator: z.enum(['has_any', 'has_all', 'has_none']),
  label_id: ObjectIdSchema,
});

export type AutomationLabelFilterRuleDefinition = z.infer<typeof labelFilterRuleDefinitionSchema>;

const eventRuleDefinitionSchema = z.discriminatedUnion('trigger_type', [
  z.object({
    trigger_type: z.literal('free_signup'),
    scope: z.null(),
    product_id: z.null(),
    direction: z.null(),
  }),
  z.discriminatedUnion('scope', [
    z.object({
      trigger_type: z.literal('paid_subscription_started'),
      scope: z.literal('any_paid_tier'),
      product_id: z.null(),
      direction: z.null(),
    }),
    z.object({
      trigger_type: z.literal('paid_subscription_started'),
      scope: z.literal('specific_paid_tier'),
      product_id: ObjectIdSchema,
      direction: z.null(),
    }),
  ]),
  z.discriminatedUnion('scope', [
    z.object({
      trigger_type: z.literal('paid_subscription_changed'),
      scope: z.literal('any_paid_tier'),
      product_id: z.null(),
      direction: z.literal('from'),
    }),
    z.object({
      trigger_type: z.literal('paid_subscription_changed'),
      scope: z.literal('free'),
      product_id: z.null(),
      direction: z.literal('to'),
    }),
    z.object({
      trigger_type: z.literal('paid_subscription_changed'),
      scope: z.literal('specific_paid_tier'),
      product_id: ObjectIdSchema,
      direction: z.enum(['from', 'to']),
    }),
  ]),
]);

export type AutomationEventRuleDefinition = z.infer<typeof eventRuleDefinitionSchema>;

export const automationTriggerRuleDefinitionSchema = z.union([
  eventRuleDefinitionSchema,
  labelFilterRuleDefinitionSchema,
]);

export type AutomationTriggerRuleDefinition = z.infer<typeof automationTriggerRuleDefinitionSchema>;

type LabelFilterOf<RuleT> = Extract<RuleT, { operator: string }>;
type EventRuleOf<RuleT> = Exclude<RuleT, { operator: string }>;

export const isLabelFilterRule = <RuleT extends AutomationTriggerRuleDefinition>(
  rule: RuleT,
): rule is LabelFilterOf<RuleT> => 'operator' in rule;

export const splitTriggerRules = <RuleT extends AutomationTriggerRuleDefinition>(
  rules: readonly RuleT[],
): {
  eventRules: EventRuleOf<RuleT>[];
  labelFilters: LabelFilterOf<RuleT>[];
} => {
  const eventRules: EventRuleOf<RuleT>[] = [];
  const labelFilters: LabelFilterOf<RuleT>[] = [];
  for (const rule of rules) {
    if (isLabelFilterRule(rule)) {
      labelFilters.push(rule);
    } else {
      eventRules.push(rule as EventRuleOf<RuleT>);
    }
  }
  return { eventRules, labelFilters };
};

// A condition with nothing left to check only passes when it excludes labels.
export const doLabelsMeetCondition = (
  memberLabelIds: ReadonlySet<string>,
  operator: AutomationLabelFilterRuleDefinition['operator'] | null,
  labelIds: readonly string[],
): boolean => {
  if (!operator) {
    return false;
  }
  if (labelIds.length === 0) {
    return operator === 'has_none';
  }
  return doLabelsMatchFilters(
    memberLabelIds,
    labelIds.map((labelId) => ({ operator, label_id: labelId })),
  );
};

export const doLabelsMatchFilters = (
  memberLabelIds: ReadonlySet<string>,
  labelFilters: readonly Pick<AutomationLabelFilterRuleDefinition, 'operator' | 'label_id'>[],
): boolean => {
  const hasLabel = (filter: (typeof labelFilters)[number]) => memberLabelIds.has(filter.label_id);
  const anyOf = labelFilters.filter((filter) => filter.operator === 'has_any');
  const allOf = labelFilters.filter((filter) => filter.operator === 'has_all');
  const noneOf = labelFilters.filter((filter) => filter.operator === 'has_none');
  if (anyOf.length > 0 && !anyOf.some(hasLabel)) {
    return false;
  }
  return allOf.every(hasLabel) && !noneOf.some(hasLabel);
};

export const automationTriggerRuleSchema = automationTriggerRuleDefinitionSchema.and(
  z.object({
    id: ObjectIdSchema,
    automation_id: ObjectIdSchema,
    created_at: DbDate,
  }),
);

export type AutomationTriggerRule = z.infer<typeof automationTriggerRuleSchema>;

export function buildTriggerRuleRows({
  automationId,
  scope,
  tierIds,
  createdAt,
}: ReadonlyDeep<{
  automationId: string;
  scope: AutomationTriggerTierScope;
  tierIds: string[];
  createdAt: Date;
}>): AutomationTriggerRule[] {
  let rules: AutomationTriggerRuleDefinition[];
  switch (scope) {
    case 'free':
      rules = [{ trigger_type: 'free_signup', scope: null, product_id: null, direction: null }];
      break;
    case 'all_paid':
      rules = [
        {
          trigger_type: 'paid_subscription_started',
          scope: 'any_paid_tier',
          product_id: null,
          direction: null,
        },
      ];
      break;
    case 'selected_paid':
      rules = [...new Set(tierIds)].map((productId) => ({
        trigger_type: 'paid_subscription_started',
        scope: 'specific_paid_tier',
        product_id: productId,
        direction: null,
      }));
      break;
    default: {
      const _exhaustive: never = scope;
      throw new errors.InternalServerError({
        message: `Unexpected automation trigger tier scope: ${_exhaustive}`,
      });
    }
  }
  return rules.map((rule) => ({
    ...rule,
    id: ObjectId().toHexString(),
    automation_id: automationId,
    created_at: createdAt,
  }));
}
