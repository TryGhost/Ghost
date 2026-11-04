import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { ReadonlyDeep } from 'type-fest';
import { z } from 'zod';
import { DbDate } from '../../lib/db-types/date';
import { ObjectIdSchema } from '../../lib/db-types/object-id';
import type { AutomationTriggerTierScope } from './automations-repository-2';

export const automationTriggerRuleDefinitionSchema = z.discriminatedUnion('trigger_type', [
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

export type AutomationTriggerRuleDefinition = z.infer<typeof automationTriggerRuleDefinitionSchema>;

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
