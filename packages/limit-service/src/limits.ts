import lowerCase from 'lodash/lowerCase.js';
import template from 'lodash/template.js';

import { SUPPORTED_INTERVALS, lastPeriodStart } from './date-utils.ts';
import type {
  CheckOptions,
  Count,
  CurrentCountQuery,
  Db,
  ErrorsModule,
  Formatter,
  GhostErrorOptions,
  Interval,
  Knex,
  LimitConfig,
} from './types.ts';

const interpolate = /{{([\s\S]+?)}}/g;

// Match the existing JavaScript comparison: string counts concatenate before the
// numeric comparison, while null and undefined coerce to zero and NaN respectively.
const addCount = (count: Count, addedCount: number): number => Number(
  typeof count === 'string' ? count + addedCount : Number(count) + addedCount,
);

const formatCount: Formatter = (count) => {
  // Intl accepts coercible values at runtime. Keep numeric strings intact so
  // formatting large database counts does not lose precision through Number().
  const format = Intl.NumberFormat().format as Formatter;
  return format(count);
};

interface LimitDeps {
  name: string;
  config: LimitConfig;
  helpLink?: string;
  db?: Db;
  errors: ErrorsModule;
}

export abstract class Limit {
  name: string;
  error: string;
  helpLink?: string;
  db?: Db;
  errors: ErrorsModule;

  constructor({
    name,
    error,
    helpLink,
    db,
    errors,
  }: {
    name: string;
    error: string;
    helpLink?: string;
    db?: Db;
    errors: ErrorsModule;
  }) {
    this.name = name;
    this.error = error;
    this.helpLink = helpLink;
    this.db = db;
    this.errors = errors;
  }

  abstract errorIfWouldGoOverLimit(options?: CheckOptions): Promise<void>;
  abstract errorIfIsOverLimit(options?: CheckOptions): Promise<void>;

  /** Only the flag limits answer this, and the service checks before calling it. */
  isDisabled?(): boolean;

  generateError(_count?: Count): GhostErrorOptions | Error {
    const errorObj: GhostErrorOptions = {
      errorDetails: {
        name: this.name,
      },
    };

    if (this.helpLink) {
      errorObj.help = this.helpLink;
    }

    return errorObj;
  }
}

export class MaxLimit extends Limit {
  currentCountQueryFn: CurrentCountQuery;
  max: number;
  formatter?: Formatter;
  fallbackMessage: string;

  constructor({ name, config, helpLink, db, errors }: LimitDeps) {
    super({ name, error: config.error || '', helpLink, db, errors });

    if (config.max === undefined) {
      throw new errors.IncorrectUsageError({
        message: 'Attempted to setup a max limit without a limit',
      });
    }

    if (!config.currentCountQuery) {
      throw new errors.IncorrectUsageError({
        message: 'Attempted to setup a max limit without a current count query',
      });
    }

    this.currentCountQueryFn = config.currentCountQuery;
    this.max = config.max;
    this.formatter = config.formatter;
    this.fallbackMessage = `This action would exceed the ${lowerCase(this.name)} limit on your current plan.`;
  }

  generateError(count: Count): Error {
    const errorObj = super.generateError() as GhostErrorOptions;

    errorObj.message = this.fallbackMessage;

    if (this.error) {
      const formatter = this.formatter || formatCount;
      try {
        errorObj.message = template(this.error, { interpolate })({
          max: formatter(this.max),
          count: formatter(count),
          name: this.name,
        });
      } catch {
        errorObj.message = this.fallbackMessage;
      }
    }

    errorObj.errorDetails.limit = this.max;
    errorObj.errorDetails.total = count;

    return new this.errors.HostLimitError(errorObj);
  }

  async currentCountQuery(options: CheckOptions = {}): Promise<Count> {
    // Whatever database was supplied goes straight to the query. When none was, the query
    // is called without one and fails inside itself, which is the contract this has always
    // had and is not this class's to change.
    return await this.currentCountQueryFn((options.transacting ?? this.db?.knex) as Knex);
  }

  async errorIfWouldGoOverLimit(options: CheckOptions = {}): Promise<void> {
    const { max, addedCount = 1 } = options;
    const currentCount = await this.currentCountQuery(options);

    if (addCount(currentCount, addedCount) > (max || this.max)) {
      throw this.generateError(currentCount);
    }
  }

  async errorIfIsOverLimit(options: CheckOptions = {}): Promise<void> {
    const currentCount = options.currentCount || (await this.currentCountQuery(options));

    if (Number(currentCount) > (options.max || this.max)) {
      throw this.generateError(currentCount);
    }
  }
}

export class MaxPeriodicLimit extends Limit {
  currentCountQueryFn: CurrentCountQuery;
  maxPeriodic: number;
  interval: Interval;
  startDate: string;
  fallbackMessage: string;

  constructor({ name, config, helpLink, db, errors }: LimitDeps) {
    super({ name, error: config.error || '', helpLink, db, errors });

    if (config.maxPeriodic === undefined) {
      throw new errors.IncorrectUsageError({
        message: 'Attempted to setup a periodic max limit without a limit',
      });
    }

    if (!config.currentCountQuery) {
      throw new errors.IncorrectUsageError({
        message: 'Attempted to setup a periodic max limit without a current count query',
      });
    }

    if (!config.interval) {
      throw new errors.IncorrectUsageError({
        message: 'Attempted to setup a periodic max limit without an interval',
      });
    }

    if (!SUPPORTED_INTERVALS.includes(config.interval)) {
      throw new errors.IncorrectUsageError({
        message: `Attempted to setup a periodic max limit without unsupported interval. Please specify one of: ${SUPPORTED_INTERVALS}`,
      });
    }

    if (!config.startDate) {
      throw new errors.IncorrectUsageError({
        message: 'Attempted to setup a periodic max limit without a start date',
      });
    }

    this.currentCountQueryFn = config.currentCountQuery;
    this.maxPeriodic = config.maxPeriodic;
    this.interval = config.interval;
    this.startDate = config.startDate;
    this.fallbackMessage = `This action would exceed the ${lowerCase(this.name)} limit on your current plan.`;
  }

  generateError(count: Count): Error {
    const errorObj = super.generateError() as GhostErrorOptions;

    errorObj.message = this.fallbackMessage;

    if (this.error) {
      try {
        errorObj.message = template(this.error, { interpolate })({
          max: formatCount(this.maxPeriodic),
          count: formatCount(count),
          name: this.name,
        });
      } catch {
        errorObj.message = this.fallbackMessage;
      }
    }

    errorObj.errorDetails.limit = this.maxPeriodic;
    errorObj.errorDetails.total = count;

    return new this.errors.HostLimitError(errorObj);
  }

  async currentCountQuery(options: CheckOptions = {}): Promise<Count> {
    const lastPeriodStartDate = lastPeriodStart(this.startDate, this.interval);

    return await this.currentCountQueryFn(
      (options.transacting ? options.transacting : this.db ? this.db.knex : undefined) as Knex,
      lastPeriodStartDate,
    );
  }

  async errorIfWouldGoOverLimit(options: CheckOptions = {}): Promise<void> {
    const { max, addedCount = 1 } = options;
    const currentCount = await this.currentCountQuery(options);

    if (addCount(currentCount, addedCount) > (max || this.maxPeriodic)) {
      throw this.generateError(currentCount);
    }
  }

  async errorIfIsOverLimit(options: CheckOptions = {}): Promise<void> {
    const { max } = options;
    const currentCount = await this.currentCountQuery(options);

    if (Number(currentCount) > (max || this.maxPeriodic)) {
      throw this.generateError(currentCount);
    }
  }
}

export class FlagLimit extends Limit {
  disabled?: boolean;
  fallbackMessage: string;

  constructor({ name, config, helpLink, db, errors }: LimitDeps) {
    super({ name, error: config.error || '', helpLink, db, errors });
    const userFacingLimitName = lowerCase(name.replace(/^limit/, ''));

    this.disabled = config.disabled;
    this.fallbackMessage = `Your plan does not support ${userFacingLimitName}. Please upgrade to enable ${userFacingLimitName}.`;
  }

  generateError(): Error {
    const errorObj = super.generateError() as GhostErrorOptions;

    if (this.error) {
      errorObj.message = this.error;
    } else {
      errorObj.message = this.fallbackMessage;
    }

    return new this.errors.HostLimitError(errorObj);
  }

  /** Flag limits are on/off so using a feature is always over the limit */
  async errorIfWouldGoOverLimit(_options?: CheckOptions): Promise<void> {
    if (this.disabled) {
      throw this.generateError();
    }
  }

  /**
   * Flag limits are on/off. They don't necessarily mean the limit wasn't possible to reach
   * NOTE: this method should not be relied on as it's impossible to check the limit was surpassed!
   */
  async errorIfIsOverLimit(_options?: CheckOptions): Promise<void> {
    return;
  }

  isDisabled(): boolean {
    return !!this.disabled;
  }
}

export class AllowlistLimit extends Limit {
  allowlist: string[];
  fallbackMessage: string;

  constructor({ name, config, helpLink, errors }: LimitDeps) {
    super({ name, error: config.error || '', helpLink, errors });

    if (!config.allowlist || !config.allowlist.length) {
      throw new this.errors.IncorrectUsageError({
        message: 'Attempted to setup an allowlist limit without an allowlist',
      });
    }

    this.allowlist = config.allowlist;
    this.fallbackMessage = `This action would exceed the ${lowerCase(this.name)} limit on your current plan.`;
  }

  generateError(): Error {
    const errorObj = super.generateError() as GhostErrorOptions;

    if (this.error) {
      errorObj.message = this.error;
    } else {
      errorObj.message = this.fallbackMessage;
    }

    return new this.errors.HostLimitError(errorObj);
  }

  async errorIfWouldGoOverLimit(metadata?: CheckOptions): Promise<void> {
    if (!metadata || !metadata.value) {
      throw new this.errors.IncorrectUsageError({
        message: 'Attempted to check an allowlist limit without a value',
      });
    }
    if (!this.allowlist.includes(metadata.value)) {
      throw this.generateError();
    }
  }

  async errorIfIsOverLimit(metadata?: CheckOptions): Promise<void> {
    if (!metadata || !metadata.value) {
      throw new this.errors.IncorrectUsageError({
        message: 'Attempted to check an allowlist limit without a value',
      });
    }
    if (!this.allowlist.includes(metadata.value)) {
      throw this.generateError();
    }
  }
}
