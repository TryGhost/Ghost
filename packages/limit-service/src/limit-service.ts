import errors from '@tryghost/errors';
import camelCase from 'lodash/camelCase.js';
import has from 'lodash/has.js';

import config, { type LimitName } from './config.ts';
import { AllowlistLimit, FlagLimit, type Limit, MaxLimit, MaxPeriodicLimit } from './limits.ts';
import type { CheckOptions, ErrorsModule, LimitConfig, LoadLimitsOptions } from './types.ts';

/** The manifest is the allowlist, so membership of it is what makes a name a limit name. */
const isLimitName = (name: string): name is LimitName => Object.hasOwn(config, name);

const messages = {
  missingErrorsConfig: `Config Missing: 'errors' is required.`,
  noSubscriptionParameter: 'Attempted to setup a periodic max limit without a subscription',
};

export class LimitService {
  limits: Partial<Record<LimitName, Limit>>;
  errors!: ErrorsModule;

  constructor() {
    this.limits = {};
  }

  /** Initializes the limits based on configuration */
  loadLimits({ limits = {}, subscription, helpLink, db, errors: errorsModule }: LoadLimitsOptions): void {
    if (!errorsModule) {
      throw new errors.IncorrectUsageError({
        message: messages.missingErrorsConfig,
      });
    }

    this.errors = errorsModule;

    // CASE: reset internal limits state in case load is called multiple times
    this.limits = {};

    Object.keys(limits).forEach((rawName) => {
      const name = camelCase(rawName);

      // NOTE: config module acts as an allowlist of supported config names, where each key
      // is a name of supported config
      if (isLimitName(name)) {
        // Read under the key the host wrote, and store under the normalised one. Reading
        // under the normalised name found nothing whenever the host spelled it another
        // way, and built a limit that limited nothing.
        const limitConfig: LimitConfig = Object.assign({}, config[name], limits[rawName]);

        if (has(limitConfig, 'allowlist')) {
          this.limits[name] = new AllowlistLimit({
            name,
            config: limitConfig,
            helpLink,
            errors: errorsModule,
          });
        } else if (has(limitConfig, 'max')) {
          this.limits[name] = new MaxLimit({
            name,
            config: limitConfig,
            helpLink,
            db,
            errors: errorsModule,
          });
        } else if (has(limitConfig, 'maxPeriodic')) {
          if (subscription === undefined) {
            throw new errors.IncorrectUsageError({
              message: messages.noSubscriptionParameter,
            });
          }

          const maxPeriodicLimitConfig = Object.assign({}, limitConfig, subscription);
          this.limits[name] = new MaxPeriodicLimit({
            name,
            config: maxPeriodicLimitConfig,
            helpLink,
            db,
            errors: errorsModule,
          });
        } else {
          this.limits[name] = new FlagLimit({
            name,
            config: limitConfig,
            helpLink,
            errors: errorsModule,
          });
        }
      }
    });
  }

  isLimited(limitName: LimitName): boolean {
    return !!this.limits[limitName];
  }

  /**
   * Check if a limit is disabled, applicable only to limits that support the disabled flag
   * (e.g. FlagLimit). Undefined if the limit is not configured.
   */
  isDisabled(limitName: LimitName): boolean | undefined {
    // The same lookup isLimited makes, kept as one read so the limit is narrowed by it.
    const limit = this.limits[limitName];

    if (!limit) {
      return;
    }

    if (typeof limit.isDisabled !== 'function') {
      throw new errors.IncorrectUsageError({
        message: `Limit ${limitName} does not support .isDisabled()`,
      });
    }

    return limit.isDisabled();
  }

  async checkIsOverLimit(limitName: LimitName, options: CheckOptions = {}): Promise<boolean | undefined> {
    const limit = this.limits[limitName];

    if (!limit) {
      return;
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

  async checkWouldGoOverLimit(limitName: LimitName, options: CheckOptions = {}): Promise<boolean | undefined> {
    const limit = this.limits[limitName];

    if (!limit) {
      return;
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
