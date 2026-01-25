import {z} from 'zod';

export const AnalyticsEventSchema = z.object({
    id: z.string().min(1),
    memberId: z.string().min(1),
    type: z.string().min(1),
    createdAt: z.number().int()
});

export const AnalyticsEventCreateSchema = z.object({
    memberId: z.string().min(1),
    type: z.string().min(1)
});

export const AnalyticsEventListSchema = z.object({
    memberId: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    limit: z.number().int().positive().max(100).default(20),
    offset: z.number().int().min(0).default(0)
});

export const AnalyticsEventListResponseSchema = z.object({
    events: z.array(AnalyticsEventSchema)
});

export const AnalyticsEventCreateRequestBodySchema = AnalyticsEventCreateSchema;
export const AnalyticsEventListRequestSchema = AnalyticsEventListSchema;

export type AnalyticsEventCreateRequest = z.infer<typeof AnalyticsEventCreateSchema>;
export type AnalyticsEventListRequest = z.infer<typeof AnalyticsEventListSchema>;
export type AnalyticsEventListResponse = z.infer<typeof AnalyticsEventListResponseSchema>;
