import { z } from 'zod';

import type { ErrorsModule, LimitConfig, Subscription } from './types.ts';

/**
 * Just the error this needs. The package is handed its errors rather than importing them,
 * so that the same code can raise Ghost's error type on the server and Admin's in a browser.
 */
type HostConfigErrors = Pick<ErrorsModule, 'IncorrectUsageError'>;

/**
 * A limit as a host configures it.
 *
 * Every value arrives as a string. Ghost(Pro) keeps host settings in one string column and
 * hands them over untouched, so a maximum reaches us as '5' and a flag as 'true'. Coercing
 * here is what makes the rest of the package's `number` and `boolean` types honest.
 *
 * `disabled` is coerced the way JavaScript coerces, which means the string 'false' reads as
 * true. That is what a host gets today, and changing it would switch a limit off on any
 * site configured that way, so it is preserved deliberately rather than corrected here.
 */
const hostLimitSchema = z.object({
  max: z.coerce.number().optional(),
  maxPeriodic: z.coerce.number().optional(),
  disabled: z.coerce.boolean().optional(),
  allowlist: z.array(z.coerce.string()).optional(),
  error: z.string().optional(),
});

const hostSubscriptionSchema = z.object({
  start: z.string(),
});

const describe = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`).join(', ');

/**
 * Read the limits a host configured, refusing anything that cannot be read.
 *
 * A limit nobody can read is worse than no limit at all. A maximum that is not a number
 * compares false against every count, so the limit is configured, charged for, and silently
 * never applied; the only way anyone finds out is a customer exceeding a limit they were
 * sold. Refusing outright turns that into an immediate, visible failure at the point the
 * mistake was made, which is the only point at which it is cheap to fix.
 */
export function parseHostLimits(
  raw: unknown,
  errors: HostConfigErrors,
): Record<string, LimitConfig> {
  if (raw === undefined || raw === null) {
    return {};
  }

  const entries = z.record(z.string(), z.unknown()).safeParse(raw);

  if (!entries.success) {
    throw new errors.IncorrectUsageError({
      message: `Host limits are misconfigured (${describe(entries.error)})`,
    });
  }

  const limits: Record<string, LimitConfig> = {};

  for (const [name, value] of Object.entries(entries.data)) {
    const limit = hostLimitSchema.safeParse(value);

    if (!limit.success) {
      throw new errors.IncorrectUsageError({
        message: `Host limit "${name}" is misconfigured (${describe(limit.error)})`,
      });
    }

    limits[name] = limit.data;
  }

  return limits;
}

/**
 * Read the subscription a host configured, which a periodic limit counts from. A site
 * without one is the ordinary case and reads as nothing; one that is there but cannot be
 * read is refused, for the same reason an unreadable limit is.
 */
export function parseHostSubscription(
  raw: unknown,
  errors: HostConfigErrors,
): Subscription | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }

  const subscription = hostSubscriptionSchema.safeParse(raw);

  if (!subscription.success) {
    throw new errors.IncorrectUsageError({
      message: `Host subscription is misconfigured (${describe(subscription.error)})`,
    });
  }

  return { startDate: subscription.data.start, interval: 'month' };
}
