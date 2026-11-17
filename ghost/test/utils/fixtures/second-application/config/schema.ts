import { z } from 'zod';

/** The shape of this application's config. It has nothing in common with Ghost's. */
export const configSchema = z.looseObject({
  env: z.string().min(1),
  desk: z.object({
    name: z.string().min(1),
    loanDays: z.number().int().positive(),
  }),
  logging: z.looseObject({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
    transports: z.array(z.enum(['stdout', 'stderr', 'file'])),
    path: z.string().optional(),
  }),
});
