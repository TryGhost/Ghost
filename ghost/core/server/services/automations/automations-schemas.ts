import ObjectId from 'bson-objectid';
import { z } from 'zod';

const MAX_AUTOMATION_ACTIONS = 50;
const MAX_WAIT_HOURS = 720; // 30 days

const objectIdSchema = z.string().refine((value) => ObjectId.isValid(value));

const waitActionSchema = z.object({
  id: objectIdSchema,
  type: z.literal('wait'),
  data: z.object({
    wait_hours: z.number().int().positive().max(MAX_WAIT_HOURS),
  }),
});

const sendEmailActionSchema = z.object({
  id: objectIdSchema,
  type: z.literal('send_email'),
  data: z.object({
    email_subject: z.string(),
    email_lexical: z.string(),
    email_design_setting_id: z.string().min(1),
  }),
});

const edgeSchema = z.object({
  source_action_id: objectIdSchema,
  target_action_id: objectIdSchema,
});

const automationShape = {
  name: z.string().trim().min(1).max(191),
  description: z.string().trim().max(2000),
  status: z.enum(['active', 'inactive', 'archived']),
  actions: z
    .array(z.discriminatedUnion('type', [waitActionSchema, sendEmailActionSchema]))
    .max(MAX_AUTOMATION_ACTIONS),
  edges: z.array(edgeSchema),
};

const defaultTriggerShape = {
  trigger_tier_scope: z.enum(['free', 'all_paid']).nullable().optional(),
  trigger_tier_ids: z.null().optional(),
};
const selectedPaidTriggerShape = {
  trigger_tier_scope: z.literal('selected_paid'),
  trigger_tier_ids: z
    .array(objectIdSchema)
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      error: 'Duplicate trigger_tier_ids are not allowed.',
    }),
};

const transitionTierIdsSchema = z
  .array(objectIdSchema)
  .min(1)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Duplicate tier IDs are not allowed.',
  });

const subscriptionTransitionSchema = z
  .strictObject({
    from: z.union([z.literal('any_paid'), transitionTierIdsSchema]),
    to: z.union([z.literal('downgraded_to_free'), transitionTierIdsSchema]),
  })
  .refine(
    ({ from, to }) =>
      !Array.isArray(from) || !Array.isArray(to) || !from.some((id) => to.includes(id)),
    { message: 'From and To tiers must not overlap.', path: ['to'] },
  );

export const addAutomationDataSchema = z.discriminatedUnion('trigger_type', [
  z.discriminatedUnion('trigger_tier_scope', [
    z.strictObject({
      ...automationShape,
      ...defaultTriggerShape,
      // Legacy frontends omit trigger_type; membership_started remains the default.
      trigger_type: z.literal('membership_started').optional(),
    }),
    z.strictObject({
      ...automationShape,
      ...selectedPaidTriggerShape,
      trigger_type: z.literal('membership_started').optional(),
    }),
  ]),
  z.strictObject({
    ...automationShape,
    trigger_type: z.literal('paid_subscription_changed'),
    subscription_transition: subscriptionTransitionSchema,
  }),
]);

export const editAutomationDataSchema = z
  .object({
    ...automationShape,
    name: automationShape.name.optional(),
    description: automationShape.description.optional(),
  })
  .and(
    z.discriminatedUnion('trigger_tier_scope', [
      z.object(defaultTriggerShape),
      z.object(selectedPaidTriggerShape),
    ]),
  );

export const editAutomationStatusOnlySchema = z.strictObject({
  // We disallow status-only activations because they could allow activations to
  // happen with an invalid graph (e.g,. an email without a subject). If we
  // change this, we should validate the graph on status-only activations as
  // well.
  status: z.enum(['inactive', 'archived']),
});
