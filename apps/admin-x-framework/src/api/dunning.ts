import { z } from 'zod';

const dateString = z
  .string()
  .transform((value) => new Date(value))
  .pipe(z.date());

const dunningConfigSchema = z
  .object({
    active: z.literal(true),
    paymentFailedAt: dateString,
    suspendsAt: dateString,
  })
  .refine(({ paymentFailedAt, suspendsAt }) => suspendsAt.getTime() > paymentFailedAt.getTime());

/** Shared by React warnings and the legacy alert so invalid config never hides both. */
export function parseDunningConfig(value: unknown) {
  const result = dunningConfigSchema.safeParse(value);
  return result.success ? result.data : null;
}
