import camelCase from 'lodash/camelCase.js';
import { IncorrectUsageError } from '@tryghost/errors';

import { FlagLimit, type Limit } from './limits.js';
import { type ResolveOptions, resolve } from './resolve.js';
import type { CheckOptions, ErrorsModule, LimitProblem } from './types.js';

/**
 * Holds the limits a site currently has, and answers questions about them.
 *
 * Deliberately thin. Everything that decides what a limit is happens in `resolve`, which is
 * a pure function, so this only ever holds its result. Swapping that result is a single
 * assignment, which is what lets a site's limits change without anything being rebuilt or
 * restarted around it.
 */
export class LimitService {
  limits: Record<string, Limit> = {};
  problems: LimitProblem[] = [];
  errors!: ErrorsModule;

  /**
   * Build limits from configuration and hold them. Replaces whatever was held before, so
   * calling it again is how a site's limits are updated.
   */
  loadLimits(options: ResolveOptions): void {
    if (!options.errors) {
      // The one error raised before the caller's error module is available to raise it with.
      throw new IncorrectUsageError({ message: `Config Missing: 'errors' is required.` });
    }

    this.errors = options.errors;

    const { limits, problems } = resolve(options);

    this.limits = limits;
    this.problems = problems;
  }

  private find(limitName: string): Limit | undefined {
    return this.limits[camelCase(limitName)];
  }

  isLimited(limitName: string): boolean {
    return Boolean(this.find(limitName));
  }

  /**
   * Whether a feature is switched off. Undefined where the site has no such limit, which
   * every caller reads as "not switched off".
   */
  isDisabled(limitName: string): boolean | undefined {
    const limit = this.find(limitName);

    if (!limit) {
      return;
    }

    if (!(limit instanceof FlagLimit)) {
      throw new this.errors.IncorrectUsageError({
        message: `Limit ${limitName} does not support .isDisabled()`,
      });
    }

    return limit.isDisabled();
  }

  async checkIsOverLimit(
    limitName: string,
    options: CheckOptions = {},
  ): Promise<boolean | undefined> {
    return await this.check(limitName, (limit) => limit.errorIfIsOverLimit(options));
  }

  async checkWouldGoOverLimit(
    limitName: string,
    options: CheckOptions = {},
  ): Promise<boolean | undefined> {
    return await this.check(limitName, (limit) => limit.errorIfWouldGoOverLimit(options));
  }

  async errorIfIsOverLimit(limitName: string, options: CheckOptions = {}): Promise<void> {
    await this.find(limitName)?.errorIfIsOverLimit(options);
  }

  async errorIfWouldGoOverLimit(limitName: string, options: CheckOptions = {}): Promise<void> {
    await this.find(limitName)?.errorIfWouldGoOverLimit(options);
  }

  /** Whether any limit the site has is already exceeded. */
  async checkIfAnyOverLimit(options: CheckOptions = {}): Promise<boolean> {
    for (const name of Object.keys(this.limits)) {
      if (await this.checkIsOverLimit(name, options)) {
        return true;
      }
    }

    return false;
  }

  private async check(
    limitName: string,
    run: (limit: Limit) => Promise<void>,
  ): Promise<boolean | undefined> {
    const limit = this.find(limitName);

    if (!limit) {
      return;
    }

    try {
      await run(limit);
      return false;
    } catch (error) {
      if (error instanceof this.errors.HostLimitError) {
        return true;
      }

      throw error;
    }
  }
}

export default LimitService;
