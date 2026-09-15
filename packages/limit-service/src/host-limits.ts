import camelCase from 'lodash/camelCase.js';
import { z } from 'zod';

import config, { type LimitName } from './config.ts';
import { isReadableDate } from './date-utils.ts';
import type { RejectedLimit } from './types.ts';

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
 *
 * The nullable fields are nullable because a host says "unset" by sending null, which is
 * not a mistake and must not be read as one.
 */
const hostLimitSchema = z.object({
  max: z.coerce.number().optional(),
  maxPeriodic: z.coerce.number().optional(),
  disabled: z.coerce.boolean().optional(),
  allowlist: z.array(z.coerce.string()).nullish(),
  error: z.string().nullish(),
});

const hostSettingsSchema = z.object({
  limits: z.record(z.string(), z.unknown()).nullish(),
  subscription: z.object({ start: z.string().nullish() }).nullish(),
});

/**
 * The limits and billing period a service may be built from.
 *
 * Branded, so that it can only be produced by reading a host's settings. Everything the
 * service needs to build a limit is decided here, which is what lets the service assume
 * the configuration it is handed already works.
 */
const parsedHostSettingsSchema = z
  .object({
    limits: z.record(
      z.string(),
      z.object({
        max: z.number().optional(),
        maxPeriodic: z.number().optional(),
        disabled: z.boolean().optional(),
        allowlist: z.array(z.string()).optional(),
        error: z.string().optional(),
      }),
    ),
    subscription: z.object({ startDate: z.string(), interval: z.literal('month') }).optional(),
  })
  .brand<'ParsedHostSettings'>();

export type ParsedHostSettings = z.infer<typeof parsedHostSettingsSchema>;
export type ParsedLimit = ParsedHostSettings['limits'][string];

export interface ReadHostSettings {
  settings: ParsedHostSettings;
  rejected: RejectedLimit[];
}

const describe = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`).join(', ');

const countable = (name: LimitName): boolean => 'currentCountQuery' in config[name];

/**
 * Read a host's settings into limits a service can be built from.
 *
 * Every question of what makes a limit usable is answered here, so that nothing downstream
 * has to ask it again: whether the values can be read, whether a counted limit has anything
 * to count, whether a list has anything on it, and whether a limit that resets has a period
 * to reset against.
 *
 * Nothing here refuses to start a site. A limit nobody can use cannot be applied either
 * way, and taking the limits alongside it down too would leave a site unlimited in ways
 * nobody chose. So each is read on its own, and the ones that cannot be used are handed
 * back for the caller to report: a limit that is configured, charged for and then not
 * applied has to be visible somewhere, and once the site keeps serving, a log is the only
 * place left.
 *
 * Only the limits this version declares are read. A host may configure one a newer Ghost
 * understands and this one does not, and passing over it is not a misconfiguration.
 */
export function readHostSettings(raw: unknown): ReadHostSettings {
  const rejected: RejectedLimit[] = [];
  const hostSettings = hostSettingsSchema.safeParse(raw ?? {});

  if (!hostSettings.success) {
    return {
      settings: parsedHostSettingsSchema.parse({ limits: {} }),
      rejected: [{ name: '*', reason: describe(hostSettings.error) }],
    };
  }

  const subscription = readSubscription(hostSettings.data.subscription, rejected);
  const limits: Record<string, ParsedLimit> = {};

  for (const [rawName, value] of Object.entries(hostSettings.data.limits ?? {})) {
    // Read under the key the host wrote, and store under the name the package knows the
    // limit by. Tolerating spelling is a reading concern, so it stops here.
    const name = camelCase(rawName);

    if (!Object.hasOwn(config, name)) {
      continue;
    }

    const limit = hostLimitSchema.safeParse(value);

    if (!limit.success) {
      rejected.push({ name, reason: describe(limit.error) });
      continue;
    }

    const reason = unusable(name as LimitName, limit.data, subscription !== undefined);

    if (reason) {
      rejected.push({ name, reason });
      continue;
    }

    limits[name] = {
      ...(limit.data.max === undefined ? {} : { max: limit.data.max }),
      ...(limit.data.maxPeriodic === undefined ? {} : { maxPeriodic: limit.data.maxPeriodic }),
      ...(limit.data.disabled === undefined ? {} : { disabled: limit.data.disabled }),
      ...(limit.data.allowlist ? { allowlist: limit.data.allowlist } : {}),
      ...(limit.data.error ? { error: limit.data.error } : {}),
    };
  }

  return { settings: parsedHostSettingsSchema.parse({ limits, subscription }), rejected };
}

/** Why a limit that could be read still could not be used, if there is a reason. */
function unusable(
  name: LimitName,
  limit: z.infer<typeof hostLimitSchema>,
  hasSubscription: boolean,
): string | undefined {
  if (limit.allowlist !== undefined && limit.allowlist !== null && limit.allowlist.length === 0) {
    return 'allowlist is empty, so nothing would be allowed';
  }

  if (limit.max !== undefined && !countable(name)) {
    return 'max is set on a limit that has nothing to count';
  }

  if (limit.maxPeriodic !== undefined) {
    if (!countable(name)) {
      return 'maxPeriodic is set on a limit that has nothing to count';
    }

    if (!hasSubscription) {
      return 'maxPeriodic needs a subscription to count a period from';
    }
  }

  return undefined;
}

/**
 * The billing period a limit that resets counts from.
 *
 * A site without one is the ordinary case and reads as nothing, and so does one whose
 * subscription cannot anchor a period, which is what Ghost has always done with it. A start
 * date that is there but unreadable is set aside: counting from a date nobody can read
 * judges a site's whole history against one period's allowance.
 */
function readSubscription(
  raw: { start?: string | null } | null | undefined,
  rejected: RejectedLimit[],
): { startDate: string; interval: 'month' } | undefined {
  const start = raw?.start;

  if (!start) {
    return undefined;
  }

  if (!isReadableDate(start)) {
    rejected.push({ name: 'subscription', reason: `start: ${start} is not a date` });
    return undefined;
  }

  return { startDate: start, interval: 'month' };
}
