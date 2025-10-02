/**
 * Tag schemas and types for Ghost API
 * 
 * This file imports the auto-generated schema from tags.generated.ts
 * and composes it with response-only fields and custom validation logic.
 */

import { z } from 'zod';
import { MetaSchema, datetimeString, ghostId } from './common';
import { TagsInputSchema, type TagInput } from './tags.generated';

// ============================================================================
// Composed Schemas
// ============================================================================

/**
 * Tag count relation schema
 * Available when include=count.posts is specified in the API request
 */
export const TagCountSchema = z.object({
    posts: z.number().int().nonnegative(),
});

/**
 * Complete Tag schema for API responses
 * Extends the input schema with response-only fields (id, url, timestamps, count)
 */
export const TagSchema = TagsInputSchema.extend({
    id: ghostId,
    url: z.string().url(),
    count: TagCountSchema.optional(),
    created_at: datetimeString,
    updated_at: datetimeString,
});

/**
 * Response schema for browsing multiple tags (GET /tags/)
 */
export const TagsResponseSchema = z.object({
    tags: z.array(TagSchema),
    meta: MetaSchema.optional(),
});

/**
 * Response schema for reading a single tag (GET /tags/:id/)
 */
export const TagResponseSchema = z.object({
    tags: z.array(TagSchema).length(1),
});

/**
 * Schema for creating a new tag (POST /tags/)
 * Only 'name' is required, all other fields are optional
 */
export const TagCreateSchema = TagsInputSchema.partial().required({ name: true });

/**
 * Schema for updating an existing tag (PUT /tags/:id/)
 * All fields are optional except id
 */
export const TagUpdateSchema = TagsInputSchema.partial().extend({
    id: ghostId,
});


// ============================================================================
// TypeScript Types
// ============================================================================

export type Tag = z.infer<typeof TagSchema>;
export type TagCount = z.infer<typeof TagCountSchema>;
export type TagsResponse = z.infer<typeof TagsResponseSchema>;
export type TagResponse = z.infer<typeof TagResponseSchema>;
export type TagCreate = z.infer<typeof TagCreateSchema>;
export type TagUpdate = z.infer<typeof TagUpdateSchema>;

// Re-export the input schema and type for direct use
export { TagsInputSchema, type TagInput };