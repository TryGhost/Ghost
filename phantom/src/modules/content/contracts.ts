import {z} from 'zod';

export const PostSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    status: z.enum(['draft', 'published', 'scheduled']),
    publishedAt: z.number().int().nullable(),
    createdAt: z.number().int(),
    updatedAt: z.number().int()
});

export const TagSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1)
});

export const PostCreateRequestSchema = z.object({
    title: z.string().min(1),
    status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
    publishedAt: z.number().int().nullable().optional(),
    tags: z.array(z.string().min(1)).optional()
});

export const PostCreateResponseSchema = z.object({
    post: PostSchema
});

export const PostResponseSchema = z.object({
    post: PostSchema
});

export const TagCreateRequestSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1)
});

export const TagCreateResponseSchema = z.object({
    tag: TagSchema
});

export const PostIdParamSchema = z.object({
    id: z.string().min(1)
});

export const PostCreateRequestBodySchema = PostCreateRequestSchema;
export const TagCreateRequestBodySchema = TagCreateRequestSchema;
export const PostIdParamRequestSchema = PostIdParamSchema;

export type PostCreateRequest = z.infer<typeof PostCreateRequestSchema>;
export type PostCreateResponse = z.infer<typeof PostCreateResponseSchema>;
export type PostResponse = z.infer<typeof PostResponseSchema>;
export type TagCreateRequest = z.infer<typeof TagCreateRequestSchema>;
export type TagCreateResponse = z.infer<typeof TagCreateResponseSchema>;
