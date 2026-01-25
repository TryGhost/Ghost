import {z} from 'zod';

export const LinkSchema = z.object({
    id: z.string().min(1),
    url: z.string().min(1),
    postId: z.string().min(1).optional(),
    createdAt: z.number().int()
});

export const LinkCreateRequestSchema = z.object({
    url: z.string().min(1),
    postId: z.string().min(1).optional()
});

export const LinkCreateResponseSchema = z.object({
    link: LinkSchema
});

export const LinkBulkUpdateRequestSchema = z.object({
    updates: z.array(z.object({
        id: z.string().min(1),
        redirectTo: z.string().min(1)
    }))
});

export const LinkBulkUpdateResponseSchema = z.object({
    updated: z.number().int()
});

export const LinkClickRequestSchema = z.object({
    linkId: z.string().min(1),
    requestId: z.string().min(1)
});

export const LinkClickResponseSchema = z.object({
    recorded: z.boolean()
});

export const LinkCreateRequestBodySchema = LinkCreateRequestSchema;
export const LinkBulkUpdateRequestBodySchema = LinkBulkUpdateRequestSchema;
export const LinkClickRequestBodySchema = LinkClickRequestSchema;

export type LinkCreateRequest = z.infer<typeof LinkCreateRequestSchema>;
export type LinkCreateResponse = z.infer<typeof LinkCreateResponseSchema>;
export type LinkBulkUpdateRequest = z.infer<typeof LinkBulkUpdateRequestSchema>;
export type LinkBulkUpdateResponse = z.infer<typeof LinkBulkUpdateResponseSchema>;
export type LinkClickRequest = z.infer<typeof LinkClickRequestSchema>;
export type LinkClickResponse = z.infer<typeof LinkClickResponseSchema>;
