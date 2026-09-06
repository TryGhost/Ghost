import { z } from 'zod';

const emailSchema = z.looseObject({
  id: z.string(),
  opened_count: z.number().int().nonnegative(),
  email_count: z.number().int().nonnegative(),
  status: z.enum(['pending', 'submitting', 'submitted', 'failed']),
  error: z.string().nullable().optional(),
  track_opens: z.boolean().optional(),
  track_clicks: z.boolean().optional(),
});

const confirmationPostSchema = z.looseObject({
  status: z.enum(['published', 'draft', 'scheduled', 'sent']),
  email: emailSchema.nullable().optional(),
});

export const confirmationResponseSchema = z.looseObject({
  posts: z.array(confirmationPostSchema).min(1),
});

export const publishedPostCountResponseSchema = z.looseObject({
  meta: z.looseObject({
    pagination: z.looseObject({
      total: z.number().int().nonnegative(),
    }),
  }),
});
