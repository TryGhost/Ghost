import { z } from 'zod';
import { AutomationRunSchema } from './automations';
import { createQueryWithId } from '../utils/api/hooks';

const HistoryActionSchema = z.discriminatedUnion('type', [
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

export const AutomationRunHistorySchema = AutomationRunSchema.safeExtend({
  automation_id: z.string().min(1),
  history_status: z.enum(['empty', 'partial', 'available']),
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
        // Older history endpoints omit email event timestamps.
        email_sent_at: z.iso.datetime().nullable().optional(),
        email_delivered_at: z.iso.datetime().nullable().optional(),
        // Preserve unknown recorded states for an honest unavailable treatment.
        status: z.string(),
        action: HistoryActionSchema.nullable(),
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
          .array(HistoryActionSchema)
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
    ReturnType<typeof createQueryWithId<z.infer<typeof AutomationRunPlanResponseSchema>>>
  >[1],
) => {
  // Read the saved graph afresh for this selection without updating the editor's
  // cached detail or borrowing its unsaved draft.
  const useQuery = createQueryWithId<z.infer<typeof AutomationRunPlanResponseSchema>>({
    dataType: `AutomationRunPlanResponseType:${selectionId}`,
    path: (id) => `/automations/${id}/`,
    parseResponse: (data) => AutomationRunPlanResponseSchema.parse(data),
  });
  return useQuery(encodeURIComponent(automationId), options);
};

export const useReadAutomationRunHistory = (
  automationId: string,
  runId: string,
  selectionId: string,
  options: Parameters<
    ReturnType<typeof createQueryWithId<z.infer<typeof AutomationRunHistoryResponseSchema>>>
  >[1] = {},
) => {
  // Each selection owns its request, including A -> B -> A while A is pending.
  const useQuery = createQueryWithId<z.infer<typeof AutomationRunHistoryResponseSchema>>({
    dataType: `AutomationRunHistoryResponseType:${selectionId}`,
    path: (id) => `/automations/${id}/`,
    parseResponse: (data) => AutomationRunHistoryResponseSchema.parse(data),
  });
  return useQuery(`${encodeURIComponent(automationId)}/runs/${encodeURIComponent(runId)}`, options);
};
