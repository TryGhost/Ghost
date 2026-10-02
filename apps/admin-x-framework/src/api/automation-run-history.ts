import { z } from 'zod';
import { AutomationRunSchema } from './automations';
import { createQuery } from '../utils/api/hooks';

const PlanActionSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1),
    type: z.literal('wait'),
    data: z.object({ wait_hours: z.number().nullable() }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('send_email'),
    data: z.object({ email_subject: z.string().nullable(), email_lexical: z.string().nullable() }),
  }),
]);

const HistoryActionSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1),
    type: z.literal('wait'),
    data: z.object({ wait_hours: z.number() }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('send_email'),
    data: z.object({ email_subject: z.string(), email_lexical: z.string() }),
  }),
]);

export const AutomationRunHistorySchema = z.object({
  ...AutomationRunSchema.shape,
  automation_id: z.string().min(1),
  steps: z
    .array(
      z.object({
        id: z.string().min(1),
        automation_action_revision_id: z.string().min(1),
        created_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),
        ready_at: z.iso.datetime(),
        started_at: z.iso.datetime().nullable(),
        finished_at: z.iso.datetime().nullable(),
        email_sent_at: z.iso.datetime().nullable(),
        email_delivered_at: z.iso.datetime().nullable(),
        status: z.enum([
          'pending',
          'finished',
          'failed',
          'automation disabled',
          'member changed status',
          'member unsubscribed',
        ]),
        action: HistoryActionSchema,
      }),
    )
    .refine(
      (steps) => new Set(steps.map((step) => step.id)).size === steps.length,
      'Step IDs must be unique',
    ),
});

const AutomationRunHistoryResponseSchema = z.object({
  automation_run_history: z.array(AutomationRunHistorySchema).length(1),
});

export type AutomationRunHistory = z.infer<typeof AutomationRunHistorySchema>;

const AutomationRunPlanResponseSchema = z.object({
  automations: z
    .array(
      z.object({
        id: z.string().min(1),
        status: z.enum(['active', 'inactive']),
        actions: z
          .array(PlanActionSchema)
          .refine(
            (actions) => new Set(actions.map((action) => action.id)).size === actions.length,
            'Action IDs must be unique',
          ),
        edges: z.array(
          z.object({ source_action_id: z.string().min(1), target_action_id: z.string().min(1) }),
        ),
      }),
    )
    .length(1),
});

export type AutomationRunPlan = z.infer<
  typeof AutomationRunPlanResponseSchema
>['automations'][number];

export const useReadAutomationRunPlan = (
  automationId: string,
  selectionId: string,
  options: Parameters<
    ReturnType<typeof createQuery<z.infer<typeof AutomationRunPlanResponseSchema>>>
  >[0],
) => {
  // Read the saved graph afresh for this selection without updating the editor's
  // cached detail or borrowing its unsaved draft.
  const useQuery = createQuery<z.infer<typeof AutomationRunPlanResponseSchema>>({
    dataType: `AutomationRunPlanResponseType:${selectionId}`,
    path: `/automations/${encodeURIComponent(automationId)}/`,
    parseResponse: (data) => AutomationRunPlanResponseSchema.parse(data),
  });
  return useQuery(options);
};

export const useReadAutomationRunHistory = (
  automationId: string,
  runId: string,
  selectionId: string,
  options: Parameters<
    ReturnType<typeof createQuery<z.infer<typeof AutomationRunHistoryResponseSchema>>>
  >[0] = {},
) => {
  // Start a fresh request on each selection, even when revisiting a run
  // whose previous request is still pending.
  const useQuery = createQuery<z.infer<typeof AutomationRunHistoryResponseSchema>>({
    dataType: `AutomationRunHistoryResponseType:${selectionId}`,
    path: `/automations/${encodeURIComponent(automationId)}/runs/${encodeURIComponent(runId)}/`,
    parseResponse: (data) => AutomationRunHistoryResponseSchema.parse(data),
  });
  return useQuery(options);
};
