import {z} from 'zod';

export const AnalyticsEventSchema = z.object({
    id: z.string().min(1),
    memberId: z.string().min(1),
    type: z.string().min(1),
    createdAt: z.number().int()
});

export const AnalyticsAggregateSchema = z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    windowStart: z.number().int(),
    windowEnd: z.number().int(),
    total: z.number().int(),
    metadata: z.record(z.unknown()),
    createdAt: z.number().int()
});

export const AnalyticsSnapshotSchema = z.object({
    id: z.string().min(1),
    lastEventAt: z.number().int(),
    payload: z.record(z.unknown()),
    createdAt: z.number().int()
});

export const ExploreSyncSchema = z.object({
    id: z.string().min(1),
    status: z.enum(['queued', 'sent', 'failed']),
    payload: z.record(z.unknown()),
    createdAt: z.number().int(),
    updatedAt: z.number().int()
});

export const AnalyticsEventCreateSchema = z.object({
    memberId: z.string().min(1),
    type: z.string().min(1)
});

export const AnalyticsEventListSchema = z.object({
    memberId: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    limit: z.number().int().positive().max(100).default(20),
    cursor: z.number().int().optional()
});

export const AnalyticsEventListResponseSchema = z.object({
    events: z.array(AnalyticsEventSchema),
    nextCursor: z.number().int().nullable(),
    remaining: z.number().int()
});

export const AnalyticsAggregateCreateSchema = z.object({
    type: z.string().min(1),
    windowStart: z.number().int(),
    windowEnd: z.number().int(),
    total: z.number().int(),
    metadata: z.record(z.unknown()).default({})
});

export const AnalyticsAggregateResponseSchema = z.object({
    aggregate: AnalyticsAggregateSchema
});

export const AnalyticsSnapshotCreateSchema = z.object({
    lastEventAt: z.number().int(),
    payload: z.record(z.unknown())
});

export const AnalyticsSnapshotResponseSchema = z.object({
    snapshot: AnalyticsSnapshotSchema
});

export const ExploreSyncRequestSchema = z.object({
    payload: z.record(z.unknown())
});

export const ExploreSyncResponseSchema = z.object({
    sync: ExploreSyncSchema
});

export const AnalyticsEventCreateRequestBodySchema = AnalyticsEventCreateSchema;
export const AnalyticsEventListRequestSchema = AnalyticsEventListSchema;
export const AnalyticsAggregateCreateRequestBodySchema = AnalyticsAggregateCreateSchema;
export const AnalyticsSnapshotCreateRequestBodySchema = AnalyticsSnapshotCreateSchema;
export const ExploreSyncRequestBodySchema = ExploreSyncRequestSchema;

export type AnalyticsEventCreateRequest = z.infer<typeof AnalyticsEventCreateSchema>;
export type AnalyticsEventListRequest = z.infer<typeof AnalyticsEventListSchema>;
export type AnalyticsEventListResponse = z.infer<typeof AnalyticsEventListResponseSchema>;
export type AnalyticsAggregateCreateRequest = z.infer<typeof AnalyticsAggregateCreateSchema>;
export type AnalyticsAggregateResponse = z.infer<typeof AnalyticsAggregateResponseSchema>;
export type AnalyticsSnapshotCreateRequest = z.infer<typeof AnalyticsSnapshotCreateSchema>;
export type AnalyticsSnapshotResponse = z.infer<typeof AnalyticsSnapshotResponseSchema>;
export type ExploreSyncRequest = z.infer<typeof ExploreSyncRequestSchema>;
export type ExploreSyncResponse = z.infer<typeof ExploreSyncResponseSchema>;
