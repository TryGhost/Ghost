import { z } from 'zod';

/**
 * Pagination schema for Ghost API responses
 */
export const PaginationSchema = z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    pages: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    next: z.number().int().positive().nullable(),
    prev: z.number().int().positive().nullable(),
});

/**
 * Meta schema wrapper for pagination and other metadata
 */
export const MetaSchema = z.object({
    pagination: PaginationSchema.optional(),
});

// Infer TypeScript types from schemas
export type Pagination = z.infer<typeof PaginationSchema>;
export type Meta = z.infer<typeof MetaSchema>;

/**
 * Utility schemas for common Ghost API patterns
 */

// ISO 8601 datetime string
export const datetimeString = z.string().datetime();

// Ghost object ID (24-character hex string)
export const ghostId = z.string().length(24).regex(/^[0-9a-f]{24}$/);


