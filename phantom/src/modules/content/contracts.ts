import {z} from 'zod';

export const PostSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    slug: z.string().min(1),
    status: z.enum(['draft', 'published', 'scheduled']),
    lexical: z.record(z.unknown()),
    visibility: z.enum(['public', 'members', 'paid']).default('public'),
    customExcerpt: z.string().nullable().optional(),
    featureImage: z.string().nullable().optional(),
    featureImageAlt: z.string().nullable().optional(),
    featureImageCaption: z.string().nullable().optional(),
    publishedAt: z.number().int().nullable(),
    createdAt: z.number().int(),
    updatedAt: z.number().int()
});

export const TagSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1)
});

export const CollectionSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    filter: z.string().min(1)
});

export const AuthorProfileSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    bio: z.string().min(1).nullable()
});

export const PostCreateRequestSchema = z.object({
    title: z.string().min(1),
    slug: z.string().min(1).optional(),
    status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
    publishedAt: z.number().int().nullable().optional(),
    lexical: z.record(z.unknown()).optional(),
    visibility: z.enum(['public', 'members', 'paid']).optional(),
    customExcerpt: z.string().nullable().optional(),
    featureImage: z.string().nullable().optional(),
    featureImageAlt: z.string().nullable().optional(),
    featureImageCaption: z.string().nullable().optional(),
    reason: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional()
});

export const PostUpdateRequestSchema = z.object({
    title: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    status: z.enum(['draft', 'published', 'scheduled']).optional(),
    publishedAt: z.number().int().nullable().optional(),
    lexical: z.record(z.unknown()).optional(),
    visibility: z.enum(['public', 'members', 'paid']).optional(),
    customExcerpt: z.string().nullable().optional(),
    featureImage: z.string().nullable().optional(),
    featureImageAlt: z.string().nullable().optional(),
    featureImageCaption: z.string().nullable().optional(),
    reason: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional()
});

export const PostCreateResponseSchema = z.object({
    post: PostSchema
});

export const PostResponseSchema = z.object({
    post: PostSchema
});

export const PostUpdateResponseSchema = PostResponseSchema;

export const TagCreateRequestSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1)
});

export const TagCreateResponseSchema = z.object({
    tag: TagSchema
});

export const CollectionCreateRequestSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    filter: z.string().min(1)
});

export const CollectionResponseSchema = z.object({
    collection: CollectionSchema
});

export const CollectionListResponseSchema = z.object({
    collections: z.array(CollectionSchema)
});

export const AuthorProfileCreateRequestSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    bio: z.string().min(1).optional()
});

export const AuthorProfileResponseSchema = z.object({
    author: AuthorProfileSchema
});

export const AuthorProfileListResponseSchema = z.object({
    authors: z.array(AuthorProfileSchema)
});

export const PostIdParamSchema = z.object({
    id: z.string().min(1)
});

export const PostCreateRequestBodySchema = PostCreateRequestSchema;
export const PostUpdateRequestBodySchema = PostUpdateRequestSchema;
export const TagCreateRequestBodySchema = TagCreateRequestSchema;
export const CollectionCreateRequestBodySchema = CollectionCreateRequestSchema;
export const AuthorProfileCreateRequestBodySchema = AuthorProfileCreateRequestSchema;
export const PostIdParamRequestSchema = PostIdParamSchema;

export type PostCreateRequest = z.infer<typeof PostCreateRequestSchema>;
export type PostCreateResponse = z.infer<typeof PostCreateResponseSchema>;
export type PostResponse = z.infer<typeof PostResponseSchema>;
export type PostUpdateRequest = z.infer<typeof PostUpdateRequestSchema>;
export type PostUpdateResponse = z.infer<typeof PostUpdateResponseSchema>;
export type TagCreateRequest = z.infer<typeof TagCreateRequestSchema>;
export type TagCreateResponse = z.infer<typeof TagCreateResponseSchema>;
export type CollectionCreateRequest = z.infer<typeof CollectionCreateRequestSchema>;
export type CollectionResponse = z.infer<typeof CollectionResponseSchema>;
export type CollectionListResponse = z.infer<typeof CollectionListResponseSchema>;
export type AuthorProfileCreateRequest = z.infer<typeof AuthorProfileCreateRequestSchema>;
export type AuthorProfileResponse = z.infer<typeof AuthorProfileResponseSchema>;
export type AuthorProfileListResponse = z.infer<typeof AuthorProfileListResponseSchema>;
