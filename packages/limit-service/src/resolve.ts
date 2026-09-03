import camelCase from 'lodash/camelCase.js';

import { isCountablePeriodStart } from './date-utils.js';
import { AllowlistLimit, FlagLimit, Limit, MaxLimit, MaxPeriodicLimit } from './limits.js';
import type {
  Counter,
  ErrorsModule,
  Formatter,
  LimitConfig,
  LimitKind,
  LimitProblem,
  Subscription,
} from './types.js';

export interface ResolveOptions {
  /** Limits as the host configured them, keyed by name. */
  limits?: Record<string, LimitConfig>;
  /** What kind each limit is. Declared by the product, never guessed from the config. */
  kinds?: Record<string, LimitKind>;
  /** How to count each counted limit, supplied by whoever is composing this. */
  counters?: Record<string, Counter>;
  /** How to render a count in a message, where the default is not wanted. */
  formatters?: Record<string, Formatter>;
  /** The billing period a periodic limit counts within. */
  subscription?: Subscription;
  /** Where to send someone who wants to lift a limit. */
  helpLink?: string;
  errors: ErrorsModule;
}

export interface ResolvedLimits {
  limits: Record<string, Limit>;
  /** Limits the host configured that could not be built, and why. Never silently dropped. */
  problems: LimitProblem[];
}

/**
 * Turn configuration into limits. A pure function: same input, same answer, no state kept
 * anywhere, so a caller can build a new set whenever the configuration changes and swap it
 * in rather than mutating one that is being read.
 *
 * Nothing is rejected for being unrecognised. A limit is only ever consulted by name, and
 * those names are literals in the calling code, so one nobody asks about is inert whether
 * it loads or not. What cannot be built is reported rather than dropped, because a limit a
 * host is charging for that quietly does not apply is the failure worth catching.
 */
export function resolve({
  limits = {},
  kinds = {},
  counters = {},
  formatters = {},
  subscription,
  helpLink,
  errors,
}: ResolveOptions): ResolvedLimits {
  const resolved: Record<string, Limit> = {};
  const problems: LimitProblem[] = [];

  for (const configuredName of Object.keys(limits)) {
    const name = camelCase(configuredName);
    // Read under the name the host actually wrote, so a limit spelled in another case
    // arrives with its settings rather than as an empty shell that limits nothing.
    const config = limits[configuredName] ?? {};
    const kind = kinds[name] ?? inferKind(config);
    const deps = { name, config, helpLink, errors };

    if (kind === 'allowlist') {
      if (!config.allowlist?.length) {
        problems.push({
          limit: name,
          reason: 'an allowlist limit was configured with no allowlist',
        });
        continue;
      }
      resolved[name] = new AllowlistLimit({ ...deps, allowlist: config.allowlist });
      continue;
    }

    if (kind === 'max' || kind === 'maxPeriodic') {
      const max = kind === 'max' ? config.max : config.maxPeriodic;
      const counter = counters[name];

      if (max === undefined) {
        problems.push({ limit: name, reason: `a ${kind} limit was configured with no maximum` });
        continue;
      }

      if (!counter) {
        problems.push({
          limit: name,
          reason: `a ${kind} limit has no way to count here, so it cannot be applied`,
        });
        continue;
      }

      if (kind === 'max') {
        resolved[name] = new MaxLimit({ ...deps, max, counter, formatter: formatters[name] });
        continue;
      }

      if (!subscription?.startDate || !subscription.interval) {
        problems.push({
          limit: name,
          reason: 'a periodic limit needs a subscription to count its period from',
        });
        continue;
      }

      if (!isCountablePeriodStart(subscription.startDate)) {
        problems.push({
          limit: name,
          reason: 'a periodic limit needs a subscription start date that can be read',
        });
        continue;
      }

      resolved[name] = new MaxPeriodicLimit({
        ...deps,
        max,
        counter,
        formatter: formatters[name],
        interval: subscription.interval,
        startDate: subscription.startDate,
      });
      continue;
    }

    resolved[name] = new FlagLimit(deps);
  }

  return { limits: resolved, problems };
}

/**
 * What a limit is, when the product has not said. Only the shape of the configuration is
 * left to go on, which is what this package did for everything before kinds were declared.
 * Kept so a host can switch a new feature off without waiting for a release that knows
 * about it.
 */
function inferKind(config: LimitConfig): LimitKind {
  if (config.allowlist !== undefined) {
    return 'allowlist';
  }
  if (config.max !== undefined) {
    return 'max';
  }
  if (config.maxPeriodic !== undefined) {
    return 'maxPeriodic';
  }
  return 'flag';
}
