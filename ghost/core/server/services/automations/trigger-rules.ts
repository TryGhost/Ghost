import { z } from 'zod';
import { DbDate } from '../../lib/db-types/date';
import { ObjectIdSchema } from '../../lib/db-types/object-id';

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
  z.object({
    trigger_type: z.literal('label_added'),
    label_id: ObjectIdSchema,
    scope: z.null(),
    product_id: z.null(),
    direction: z.null(),
  }),
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
