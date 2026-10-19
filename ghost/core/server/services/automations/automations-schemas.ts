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

const uniqueObjectIdsSchema = z
  .array(objectIdSchema)
  .min(1)
  .transform((ids) => [...new Set(ids)]);

// `trigger_type` is optional for membership triggers so older clients, which
// don't know about trigger types, keep working.
const defaultTriggerShape = {
  trigger_type: z.literal('membership_started').optional(),
  trigger_tier_scope: z.enum(['free', 'all_paid']).nullable().optional(),
  trigger_tier_ids: z.null().optional(),
  trigger_label_ids: z.null().optional(),
};
const selectedPaidTriggerShape = {
  trigger_type: z.literal('membership_started').optional(),
  trigger_tier_scope: z.literal('selected_paid'),
  trigger_tier_ids: uniqueObjectIdsSchema,
  trigger_label_ids: z.null().optional(),
};
// Members enter when any of these labels are added. We may support "all of
// these labels" in the future.
const labelAddedTriggerShape = {
  trigger_type: z.literal('label_added'),
  trigger_tier_scope: z.null().optional(),
  trigger_tier_ids: z.null().optional(),
  trigger_label_ids: uniqueObjectIdsSchema,
};

export const addAutomationDataSchema = z.discriminatedUnion('trigger_type', [
  z.discriminatedUnion('trigger_tier_scope', [
    z.strictObject({ ...automationShape, ...defaultTriggerShape }),
    z.strictObject({ ...automationShape, ...selectedPaidTriggerShape }),
  ]),
  z.strictObject({ ...automationShape, ...labelAddedTriggerShape }),
]);

export const editAutomationDataSchema = z
  .object({
    ...automationShape,
    name: automationShape.name.optional(),
    description: automationShape.description.optional(),
  })
  .and(
    z.discriminatedUnion('trigger_type', [
      z.discriminatedUnion('trigger_tier_scope', [
        z.object(defaultTriggerShape),
        z.object(selectedPaidTriggerShape),
      ]),
      z.object(labelAddedTriggerShape),
    ]),
  );

export const editAutomationStatusOnlySchema = z.strictObject({
  // We disallow status-only activations because they could allow activations to
  // happen with an invalid graph (e.g,. an email without a subject). If we
  // change this, we should validate the graph on status-only activations as
  // well.
  status: z.enum(['inactive', 'archived']),
});
