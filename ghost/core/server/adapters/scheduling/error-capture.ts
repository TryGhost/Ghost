import logging from '@tryghost/logging';
import type { Promisable } from 'type-fest';
import type {
  RescheduleOpts,
  Rescheduler,
  SchedulerAdapter,
  SchedulerJob,
} from '@tryghost/adapter-base-scheduling';
// TODO: replace with dependency injection once the sentry module is TS
// @ts-expect-error This module lacks type definitions.
import sentry from '../../../shared/sentry';

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
 * Wraps a scheduling adapter so that failures from `schedule`/`unschedule` are
 * reported by Ghost rather than by each adapter. Should work the same
 * otherwise.
 */
class ErrorCapturingSchedulingAdapter implements SchedulingAdapter {
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

  schedule(job: SchedulerJob): Promise<void> {
    return this.#capture(() => this.#adapter.schedule(job), 'schedule', job);
  }

  unschedule(job: SchedulerJob, opts?: { bootstrap?: boolean }): Promise<void> {
    return this.#capture(() => this.#adapter.unschedule(job, opts), 'unschedule', job);
  }

  async #capture<T>(
    run: () => Promisable<T>,
    operation: 'schedule' | 'unschedule',
    job: SchedulerJob,
  ): Promise<T> {
    try {
      return await Promise.resolve(run());
    } catch (err) {
      report(err, operation, job);
      throw err;
    }
  }
}

export function withErrorCapture(adapter: SchedulingAdapter): ErrorCapturingSchedulingAdapter {
  return new ErrorCapturingSchedulingAdapter(adapter);
}
