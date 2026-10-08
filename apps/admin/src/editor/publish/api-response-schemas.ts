import { z } from 'zod';

export const publishedPostCountResponseSchema = z.looseObject({
  meta: z.looseObject({
    pagination: z.looseObject({
      total: z.number().int().nonnegative(),
    }),
  }),
});
