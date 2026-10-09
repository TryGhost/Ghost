import logging from '@tryghost/logging';
import type {
  RescheduleOpts,
  Rescheduler,
  SchedulerAdapter,
  SchedulerJob,
} from '@tryghost/adapter-base-scheduling';

// CJS-only module without TS declarations.
// TODO: replace with dependency injection once the sentry module is TS
const sentry = require('../../../shared/sentry');

/**
 * The surface Ghost consumes from a resolved scheduling adapter: the
 * `SchedulerAdapter` contract, plus the members `SchedulingBase` supplies that
 * the contract itself doesn't declare.
 */
export interface SchedulingAdapter extends SchedulerAdapter {
  rescheduleAll(opts?: RescheduleOpts): Promise<unknown>;
  rescheduleOnBoot?: boolean;
  /**
   * Set by an adapter whose queue outlives the process and treats a job
   * scheduled again with an idempotency key it already holds as the same job,
   * creating nothing. Consumers then rebuild their queue on boot by scheduling
   * alone, instead of unscheduling each job first.
   */
  dedupesByIdempotencyKey?: boolean;
}

/**
 * Job URLs carry a signed admin token in their query string which stays valid
 * for hours after the scheduled time, so only the path is safe to report.
 */
function redactToken(url: string): string {
  return url.split('?')[0];
}

function report(err: unknown, operation: 'schedule' | 'unschedule', job: SchedulerJob): void {
  sentry.captureException(err);
  logging.error(
    {
      event: { name: `scheduler.${operation}.failed` },
      err,
      url: redactToken(job.url),
      time: job.time,
    },
    `Scheduler failed to ${operation} a job`,
  );
}

/**
 * Decorates a scheduling adapter so that failures from `schedule`/`unschedule`
 * are reported by Ghost rather than by each adapter. Adapters signal failure
 * however the contract permits — throwing, or rejecting the returned promise —
 * and both are handled here.
 *
 * Failures are reported rather than propagated because no caller awaits these:
 * `rescheduleAll` queues one job per scheduled post, and awaiting each would
 * stall boot behind an adapter's rate limiting.
 */
export class ErrorCapturingSchedulingAdapter implements SchedulingAdapter {
  readonly #adapter: SchedulingAdapter;

  constructor(adapter: SchedulingAdapter) {
    this.#adapter = adapter;
  }

  get rescheduleOnBoot(): boolean | undefined {
    return this.#adapter.rescheduleOnBoot;
  }

  get dedupesByIdempotencyKey(): boolean | undefined {
    return this.#adapter.dedupesByIdempotencyKey;
  }

  run(): void | Promise<void> {
    return this.#adapter.run();
  }

  register(rescheduler: Rescheduler): void {
    this.#adapter.register(rescheduler);
  }

  rescheduleAll(opts?: RescheduleOpts): Promise<unknown> {
    return this.#adapter.rescheduleAll(opts);
  }

  schedule(job: SchedulerJob): void {
    this.#capture(() => this.#adapter.schedule(job), 'schedule', job);
  }

  unschedule(job: SchedulerJob, opts?: { bootstrap?: boolean }): void {
    this.#capture(() => this.#adapter.unschedule(job, opts), 'unschedule', job);
  }

  #capture(
    run: () => void | Promise<void>,
    operation: 'schedule' | 'unschedule',
    job: SchedulerJob,
  ): void {
    try {
      const result = run();
      if (result) {
        Promise.resolve(result).catch((err) => report(err, operation, job));
      }
    } catch (err) {
      report(err, operation, job);
    }
  }
}

export function withErrorCapture(adapter: SchedulingAdapter): SchedulingAdapter {
  return new ErrorCapturingSchedulingAdapter(adapter);
}
