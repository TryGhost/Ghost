import lowerCase from 'lodash/lowerCase.js';
import template from 'lodash/template.js';

import { lastPeriodStart } from './date-utils.js';
import type {
  CheckOptions,
  Counter,
  ErrorsModule,
  Formatter,
  GhostErrorOptions,
  Interval,
  LimitConfig,
} from './types.js';

const interpolate = /{{([\s\S]+?)}}/g;

interface Deps {
  name: string;
  config: LimitConfig;
  helpLink?: string;
  errors: ErrorsModule;
}

interface ErrorPayload {
  errorDetails: { name: string; limit?: number; total?: number };
  help?: string;
  message?: string;
}

/**
 * A limit knows how to answer one question: would this be allowed. It never learns what it
 * is counting or where the numbers come from, which is what keeps this package free of any
 * particular product's schema.
 */
export abstract class Limit {
  readonly name: string;
  readonly error: string;
  readonly helpLink?: string;
  protected readonly errors: ErrorsModule;

  constructor({ name, config, helpLink, errors }: Deps) {
    this.name = name;
    this.error = config.error || '';
    this.helpLink = helpLink;
    this.errors = errors;
  }

  protected basePayload(): ErrorPayload {
    const payload: ErrorPayload = { errorDetails: { name: this.name } };

    if (this.helpLink) {
      payload.help = this.helpLink;
    }

    return payload;
  }

  protected hostLimitError(payload: ErrorPayload): Error {
    return new this.errors.HostLimitError(payload as unknown as GhostErrorOptions);
  }

  abstract errorIfWouldGoOverLimit(options?: CheckOptions): Promise<void>;
  abstract errorIfIsOverLimit(options?: CheckOptions): Promise<void>;
}

/**
 * Shared by the two limits that compare against a number. The only difference between them
 * is where the count comes from, so that is all the subclass supplies.
 */
abstract class CountedLimit extends Limit {
  readonly max: number;
  protected readonly counter: Counter;
  protected readonly formatter?: Formatter;
  readonly fallbackMessage: string;

  constructor(deps: Deps & { max: number; counter: Counter; formatter?: Formatter }) {
    super(deps);
    this.max = deps.max;
    this.counter = deps.counter;
    this.formatter = deps.formatter;
    this.fallbackMessage = `This action would exceed the ${lowerCase(this.name)} limit on your current plan.`;
  }

  protected abstract count(options: CheckOptions): Promise<number>;

  generateError(count: number): Error {
    const payload = this.basePayload();
    payload.message = this.fallbackMessage;

    if (this.error) {
      const format = this.formatter || Intl.NumberFormat().format;
      try {
        payload.message = template(this.error, { interpolate })({
          max: format(this.max),
          count: format(count),
          name: this.name,
        });
      } catch {
        payload.message = this.fallbackMessage;
      }
    }

    payload.errorDetails.limit = this.max;
    payload.errorDetails.total = count;

    return this.hostLimitError(payload);
  }

  // Nullish rather than falsy throughout: zero is a meaningful value for all three of
  // these. A caller overriding the maximum to zero means nothing is allowed, and a current
  // count of zero means the resource is empty. Treating either as absent would fall back to
  // the configured maximum and permit exactly what the caller asked to refuse.
  async errorIfWouldGoOverLimit(options: CheckOptions = {}): Promise<void> {
    const { max, addedCount = 1 } = options;
    const current = await this.count(options);

    if (current + addedCount > (max ?? this.max)) {
      throw this.generateError(current);
    }
  }

  async errorIfIsOverLimit(options: CheckOptions = {}): Promise<void> {
    const current = options.currentCount ?? (await this.count(options));

    if (current > (options.max ?? this.max)) {
      throw this.generateError(current);
    }
  }
}

/** A cap on how many of something a site may have. */
export class MaxLimit extends CountedLimit {
  protected async count(options: CheckOptions): Promise<number> {
    return await this.counter({ transacting: options.transacting });
  }
}

/** A cap that resets each billing period, counted from where that period started. */
export class MaxPeriodicLimit extends CountedLimit {
  readonly interval: Interval;
  readonly startDate: string;

  constructor(
    deps: Deps & {
      max: number;
      counter: Counter;
      formatter?: Formatter;
      interval: Interval;
      startDate: string;
    },
  ) {
    super(deps);
    this.interval = deps.interval;
    this.startDate = deps.startDate;
  }

  protected async count(options: CheckOptions): Promise<number> {
    return await this.counter({
      transacting: options.transacting,
      periodStart: lastPeriodStart(this.startDate, this.interval),
    });
  }
}

/** A feature the host has switched off outright. */
export class FlagLimit extends Limit {
  readonly disabled: boolean;
  readonly fallbackMessage: string;

  constructor(deps: Deps) {
    super(deps);
    const userFacingName = lowerCase(deps.name.replace(/^limit/, ''));

    this.disabled = Boolean(deps.config.disabled);
    this.fallbackMessage = `Your plan does not support ${userFacingName}. Please upgrade to enable ${userFacingName}.`;
  }

  generateError(): Error {
    const payload = this.basePayload();
    payload.message = this.error || this.fallbackMessage;

    return this.hostLimitError(payload);
  }

  /** On or off, so using the feature at all is over the limit. */
  async errorIfWouldGoOverLimit(): Promise<void> {
    if (this.disabled) {
      throw this.generateError();
    }
  }

  /**
   * On or off. Whether the feature was already used cannot be answered from here, so this
   * deliberately says nothing rather than guessing.
   */
  async errorIfIsOverLimit(): Promise<void> {
    return;
  }

  isDisabled(): boolean {
    return this.disabled;
  }
}

/** A limit on which particular values a site may use. */
export class AllowlistLimit extends Limit {
  readonly allowlist: string[];
  readonly fallbackMessage: string;

  constructor(deps: Deps & { allowlist: string[] }) {
    super(deps);
    this.allowlist = deps.allowlist;
    this.fallbackMessage = `This action would exceed the ${lowerCase(this.name)} limit on your current plan.`;
  }

  generateError(): Error {
    const payload = this.basePayload();
    payload.message = this.error || this.fallbackMessage;

    return this.hostLimitError(payload);
  }

  private check(options?: CheckOptions): void {
    if (!options || !options.value) {
      throw new this.errors.IncorrectUsageError({
        message: 'Attempted to check an allowlist limit without a value',
      });
    }

    if (!this.allowlist.includes(options.value)) {
      throw this.generateError();
    }
  }

  async errorIfWouldGoOverLimit(options?: CheckOptions): Promise<void> {
    this.check(options);
  }

  async errorIfIsOverLimit(options?: CheckOptions): Promise<void> {
    this.check(options);
  }
}
