import has from 'lodash/has.js';

import config, { type LimitName } from './config.ts';
import { readHostSettings } from './host-limits.ts';
import { AllowlistLimit, FlagLimit, type Limit, MaxLimit, MaxPeriodicLimit } from './limits.ts';
import type {
  CheckOptions,
  Db,
  ErrorsModule,
  LimitConfig,
  Limits,
  LimitServiceOptions,
} from './types.ts';

/** The manifest is the allowlist, so membership of it is what makes a name a limit name. */
const isLimitName = (name: string): name is LimitName => Object.hasOwn(config, name);

const messages = {
  missingErrorsConfig: `Config Missing: 'errors' is required.`,
};

export class LimitService implements Limits {
  limits: Partial<Record<LimitName, Limit>> = {};
  errors: ErrorsModule;
  private readonly helpLink?: string;
  private readonly db?: Db;

  /**
   * A site limited by nothing, which is what a self-hosted site has and what any site has
   * before its host has said otherwise. It is an ordinary service that was given no limits,
   * because there is nothing else for one to be.
   */
  static unlimited(errorsModule: ErrorsModule): LimitService {
    return new LimitService({ settings: readHostSettings({}).settings, errors: errorsModule });
  }

  constructor({
    settings,
    currentCountQueries,
    helpLink,
    db,
    errors: errorsModule,
  }: LimitServiceOptions) {
    if (!errorsModule) {
      // new Error is allowed here, as this package runs in browsers and should not depend
      // on @tryghost/errors. It is also the one complaint a caller cannot be given in its
      // own currency: what it failed to supply is the error classes to raise it with.
      // eslint-disable-next-line ghost/ghost-custom/no-native-error
      throw new Error(messages.missingErrorsConfig);
    }

    this.errors = errorsModule;
    this.helpLink = helpLink;
    this.db = db;

    // Every limit here has already been read, so each one can be built. What makes a limit
    // usable is decided when a host's settings are read, not here.
    for (const [name, limit] of Object.entries(settings.limits)) {
      if (!isLimitName(name)) {
        continue;
      }

      this.limits[name] = this.build(name, {
        ...config[name],
        ...limit,
        ...(currentCountQueries?.[name] ? { currentCountQuery: currentCountQueries[name] } : {}),
        ...(settings.subscription ?? {}),
      });
    }
  }

  /**
   * The limit a piece of configuration describes. A limit's type is not declared, it is
   * read from which threshold the host sent: a list makes an allowlist, a maximum makes a
   * counted limit, a periodic maximum makes one that resets, and none of them makes a flag.
   */
  private build(name: LimitName, limitConfig: LimitConfig): Limit {
    const shared = { name, config: limitConfig, helpLink: this.helpLink, errors: this.errors };

    if (has(limitConfig, 'allowlist')) {
      return new AllowlistLimit(shared);
    }

    if (has(limitConfig, 'max')) {
      return new MaxLimit({ ...shared, db: this.db });
    }

    if (has(limitConfig, 'maxPeriodic')) {
      return new MaxPeriodicLimit({ ...shared, db: this.db });
    }

    return new FlagLimit(shared);
  }

  isLimited(limitName: LimitName): boolean {
    return !!this.limits[limitName];
  }

  /**
   * Check if a limit is disabled, applicable only to limits that support the disabled flag
   * (e.g. FlagLimit). Undefined if the limit is not configured.
   */
  isDisabled(limitName: LimitName): boolean {
    // The same lookup isLimited makes, kept as one read so the limit is narrowed by it.
    const limit = this.limits[limitName];

    if (!limit) {
      return false;
    }

    if (typeof limit.isDisabled !== 'function') {
      throw new this.errors.IncorrectUsageError({
        message: `Limit ${limitName} does not support .isDisabled()`,
      });
    }

    return limit.isDisabled();
  }

  async checkIsOverLimit(limitName: LimitName, options: CheckOptions = {}): Promise<boolean> {
    const limit = this.limits[limitName];

    if (!limit) {
      return false;
    }

    return this.isOver(limit, options);
  }

  /** Whether one limit reports itself as over, letting anything else it raises through. */
  private async isOver(limit: Limit, options: CheckOptions): Promise<boolean> {
    try {
      await limit.errorIfIsOverLimit(options);
      return false;
    } catch (error) {
      if (error instanceof this.errors.HostLimitError) {
        return true;
      }

      throw error;
    }
  }

  async checkWouldGoOverLimit(limitName: LimitName, options: CheckOptions = {}): Promise<boolean> {
    const limit = this.limits[limitName];

    if (!limit) {
      return false;
    }

    try {
      await limit.errorIfWouldGoOverLimit(options);
      return false;
    } catch (error) {
      if (error instanceof this.errors.HostLimitError) {
        return true;
      }

      throw error;
    }
  }

  async errorIfIsOverLimit(limitName: LimitName, options: CheckOptions = {}): Promise<void> {
    const limit = this.limits[limitName];

    if (!limit) {
      return;
    }

    await limit.errorIfIsOverLimit(options);
  }

  async errorIfWouldGoOverLimit(limitName: LimitName, options: CheckOptions = {}): Promise<void> {
    const limit = this.limits[limitName];

    if (!limit) {
      return;
    }

    await limit.errorIfWouldGoOverLimit(options);
  }

  /** Checks if any of the configured limits acceded */
  async checkIfAnyOverLimit(options: CheckOptions = {}): Promise<boolean> {
    for (const limit of Object.values(this.limits)) {
      // An allowlist limit judges one particular value, and this question names no value,
      // so there is nothing for it to answer. Asking anyway raises an incorrect-usage error
      // that escapes this method, which would leave a site unable to answer whether it is
      // over any limit purely because it also has one of these.
      if (limit instanceof AllowlistLimit) {
        continue;
      }

      if (await this.isOver(limit, options)) {
        return true;
      }
    }

    return false;
  }
}

export default LimitService;
