import {z} from 'zod';

export const CommentSchema = z.object({
    id: z.string().min(1),
    postId: z.string().min(1),
    memberId: z.string().min(1),
    authorName: z.string().min(1),
    body: z.string().min(1),
    status: z.enum(['published', 'pending', 'hidden']),
    parentId: z.string().min(1).nullable(),
    createdAt: z.number().int(),
    updatedAt: z.number().int()
});

export const CommentCreateRequestSchema = z.object({
    postId: z.string().min(1),
    memberId: z.string().min(1),
    authorName: z.string().min(1),
    body: z.string().min(1),
    parentId: z.string().min(1).optional()
});

export const CommentUpdateRequestSchema = z.object({
    body: z.string().min(1),
    memberId: z.string().min(1)
});

export const CommentModerateRequestSchema = z.object({
    status: z.enum(['published', 'hidden'])
});

export const CommentDeleteRequestSchema = z.object({
    memberId: z.string().min(1)
});

export const CommentListRequestSchema = z.object({
    postId: z.string().min(1),
    parentId: z.string().min(1).optional(),
    sort: z.enum(['newest', 'oldest']).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.number().int().optional()
});

export const CommentListResponseSchema = z.object({
    comments: z.array(CommentSchema),
    nextCursor: z.number().int().nullable()
});

export const CommentResponseSchema = z.object({
    comment: CommentSchema
});

export const CommentDeleteResponseSchema = z.object({
    deleted: z.boolean()
});

export const CommentIdParamSchema = z.object({
    id: z.string().min(1)
});

export type CommentCreateRequest = z.infer<typeof CommentCreateRequestSchema>;
export type CommentUpdateRequest = z.infer<typeof CommentUpdateRequestSchema>;
export type CommentModerateRequest = z.infer<typeof CommentModerateRequestSchema>;
export type CommentDeleteRequest = z.infer<typeof CommentDeleteRequestSchema>;
export type CommentListRequest = z.infer<typeof CommentListRequestSchema>;
export type CommentListResponse = z.infer<typeof CommentListResponseSchema>;
export type CommentResponse = z.infer<typeof CommentResponseSchema>;
export type CommentDeleteResponse = z.infer<typeof CommentDeleteResponseSchema>;
