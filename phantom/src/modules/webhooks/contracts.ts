import {z} from 'zod';

export const WebhookSchema = z.object({
    id: z.string().min(1),
    integrationId: z.string().min(1),
    event: z.string().min(1),
    targetUrl: z.string().min(1)
});

export const WebhookCreateRequestSchema = z.object({
    integrationId: z.string().min(1),
    event: z.string().min(1),
    targetUrl: z.string().min(1)
});

export const WebhookUpdateRequestSchema = z.object({
    event: z.string().min(1),
    targetUrl: z.string().min(1)
});

export const WebhookCreateResponseSchema = z.object({
    webhook: WebhookSchema
});

export const WebhookListResponseSchema = z.object({
    webhooks: z.array(WebhookSchema)
});

export const WebhookUpdateResponseSchema = WebhookCreateResponseSchema;

export const WebhookDispatchRequestSchema = z.object({
    event: z.string().min(1),
    payload: z.record(z.string(), z.unknown())
});

export const WebhookDispatchResponseSchema = z.object({
    queued: z.number().int()
});

export const WebhookIdParamSchema = z.object({
    id: z.string().min(1)
});

export const WebhookCreateRequestBodySchema = WebhookCreateRequestSchema;
export const WebhookDispatchRequestBodySchema = WebhookDispatchRequestSchema;
export const WebhookUpdateRequestBodySchema = WebhookUpdateRequestSchema;

export type WebhookCreateRequest = z.infer<typeof WebhookCreateRequestSchema>;
export type WebhookCreateResponse = z.infer<typeof WebhookCreateResponseSchema>;
export type WebhookUpdateRequest = z.infer<typeof WebhookUpdateRequestSchema>;
export type WebhookUpdateResponse = z.infer<typeof WebhookUpdateResponseSchema>;
export type WebhookListResponse = z.infer<typeof WebhookListResponseSchema>;
export type WebhookDispatchRequest = z.infer<typeof WebhookDispatchRequestSchema>;
export type WebhookDispatchResponse = z.infer<typeof WebhookDispatchResponseSchema>;
