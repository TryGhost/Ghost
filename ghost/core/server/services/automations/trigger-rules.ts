import { z } from 'zod';
import { DbDate } from '../../lib/db-types/date';
import { ObjectIdSchema } from '../../lib/db-types/object-id';

const nonLabelTriggerRules = [
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
] as const;

const labelTriggerRuleInputSchema = z.object({
  trigger_type: z.literal('label_added'),
  label_id: ObjectIdSchema,
  scope: z.null(),
  product_id: z.null(),
  direction: z.null(),
});

/** Submitted triggers must identify a live label. */
export const automationTriggerRuleInputSchema = z.discriminatedUnion('trigger_type', [
  ...nonLabelTriggerRules,
  labelTriggerRuleInputSchema,
]);

/** Stored definitions retain the trigger after its inactive label was deleted. */
export const automationTriggerRuleDefinitionSchema = z.discriminatedUnion('trigger_type', [
  ...nonLabelTriggerRules,
  labelTriggerRuleInputSchema.extend({ label_id: ObjectIdSchema.nullable() }),
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
