import {z} from 'zod';

export const JobDefinitionSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    queue: z.string().min(1),
    schedule: z.string().nullable(),
    payload: z.record(z.unknown()),
    createdAt: z.number().int(),
    updatedAt: z.number().int()
});

export const JobRunSchema = z.object({
    id: z.string().min(1),
    definitionId: z.string().min(1).nullable(),
    name: z.string().min(1),
    queue: z.string().min(1),
    status: z.enum(['queued', 'running', 'failed', 'completed']),
    payload: z.record(z.unknown()),
    queuedAt: z.number().int(),
    startedAt: z.number().int().nullable(),
    finishedAt: z.number().int().nullable(),
    attempt: z.number().int(),
    maxAttempts: z.number().int(),
    backoffMs: z.number().int(),
    error: z.string().nullable()
});

export const JobDefinitionListResponseSchema = z.object({
    definitions: z.array(JobDefinitionSchema)
});

export const JobRunListResponseSchema = z.object({
    runs: z.array(JobRunSchema),
    queueStats: z.object({
        queues: z.record(z.object({
            depth: z.number().int(),
            delayed: z.number().int(),
            running: z.number().int()
        })),
        workerHealthy: z.boolean(),
        updatedAt: z.number().int()
    })
});

export const JobDefinitionCreateRequestSchema = z.object({
    name: z.string().min(1),
    queue: z.string().min(1),
    schedule: z.string().optional(),
    payload: z.record(z.unknown()).default({})
});

export const JobDefinitionCreateResponseSchema = z.object({
    definition: JobDefinitionSchema
});

export const JobEnqueueRequestSchema = z.object({
    name: z.string().min(1),
    queue: z.string().min(1),
    payload: z.record(z.unknown()).default({}),
    definitionId: z.string().optional(),
    idempotencyKey: z.string().min(1)
});

export const JobEnqueueResponseSchema = z.object({
    run: JobRunSchema
});

export const JobRunIdParamSchema = z.object({
    id: z.string().min(1)
});

export type JobDefinitionResponse = z.infer<typeof JobDefinitionSchema>;
export type JobRunResponse = z.infer<typeof JobRunSchema>;
export type JobDefinitionListResponse = z.infer<typeof JobDefinitionListResponseSchema>;
export type JobRunListResponse = z.infer<typeof JobRunListResponseSchema>;
export type JobDefinitionCreateRequest = z.infer<typeof JobDefinitionCreateRequestSchema>;
export type JobDefinitionCreateResponse = z.infer<typeof JobDefinitionCreateResponseSchema>;
export type JobEnqueueRequest = z.infer<typeof JobEnqueueRequestSchema>;
export type JobEnqueueResponse = z.infer<typeof JobEnqueueResponseSchema>;
