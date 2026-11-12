import { areTriggerRulesValid } from './util/are-trigger-rules-valid';
import ObjectId from 'bson-objectid';
import { z } from 'zod';
import { automationTriggerRuleDefinitionSchema } from './trigger-rules';

const MAX_AUTOMATION_ACTIONS = 50;
const MAX_TRIGGER_RULES = 100;
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

export const editAutomationStatusOnlySchema = z.strictObject({
  // We disallow status-only activations because they could allow activations to
  // happen with an invalid graph (e.g,. an email without a subject). If we
  // change this, we should validate the graph on status-only activations as
  // well.
  status: z.enum(['inactive', 'archived']),
});

const triggerRulesSchema = z
  .array(automationTriggerRuleDefinitionSchema)
  .min(1)
  .max(MAX_TRIGGER_RULES)
  .refine(areTriggerRulesValid, {
    error:
      'Trigger rules must use one trigger type and scope, with unique product IDs for specific paid tiers and exactly one rule otherwise.',
  });

export const addAutomationDataSchema = z.strictObject({
  ...automationShape,
  trigger_rules: triggerRulesSchema,
});

export const editAutomationDataSchema = z.object({
  ...automationShape,
  name: automationShape.name.optional(),
  description: automationShape.description.optional(),
  trigger_rules: triggerRulesSchema.optional(),
});

export type AddAutomationData = z.infer<typeof addAutomationDataSchema>;
export type EditAutomationData = Omit<
  z.infer<typeof editAutomationDataSchema>,
  'actions' | 'edges'
> &
  (Pick<AddAutomationData, 'actions' | 'edges'> | { actions?: never; edges?: never });
