import { z } from 'zod';

export const postEmailResponseSchema = z.looseObject({
  posts: z
    .array(
      z.looseObject({
        email: z.looseObject({ id: z.string() }).nullable().optional(),
      }),
    )
    .min(1),
});

export const publishedPostCountResponseSchema = z.looseObject({
  meta: z.looseObject({
    pagination: z.looseObject({
      total: z.number().int().nonnegative(),
    }),
  }),
});
