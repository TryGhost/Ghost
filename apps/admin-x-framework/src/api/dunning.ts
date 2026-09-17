import { z } from 'zod';

/**
 * sessionStorage keys the React admin's dunning UI and the Ember billing
 * service handshake through — one side writes, the other consumes. Defined
 * here so the cross-app contract lives in one place.
 */

/** Route a "Pay now" CTA was clicked on; the post-payment return lands there. */
export const DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY = 'ghost-dunning-pay-return-route';

/** `paymentFailedAt` of a failure settled by a completed payment this session. */
export const DUNNING_PAYMENT_SETTLED_STORAGE_KEY = 'ghost-dunning-payment-settled-for';

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
