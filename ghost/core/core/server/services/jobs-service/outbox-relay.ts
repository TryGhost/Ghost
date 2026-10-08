import errors from '@tryghost/errors';
import type { JobsBackendBase, DispatchEnvelope } from '@tryghost/adapter-base-jobs';
import type { JobsLogger, JobsErrorReporter } from './jobs-service';
import { JobsOutbox, ProcessOutcome } from './jobs-outbox';

export interface OutboxRelayTimings {
  // How long to wait between polling cycles once the table is drained.
  pollIntervalMs: number;
  // Bounds how long the row lock is held while a submission is in flight.
  submissionTimeoutMs: number;
  // How far forward a failed entry's available_at is moved before a retry.
  retryDelayMs: number;
}

export interface OutboxRelayOptions extends OutboxRelayTimings {
  outbox: JobsOutbox;
  backend: Pick<JobsBackendBase, 'enqueue'>;
  logging: JobsLogger;
  sentry?: JobsErrorReporter;
}

// Polls committed jobs_outbox rows and forwards each to the backend, holding
// the row's lock across the (timeout-bounded) submission. A confirmed
// acceptance deletes the row; a rejection or timeout retains it with a bumped
// available_at, logs the dispatch id and error, and raises an alert. Rows are
// retried at the fixed interval until accepted, never discarded. Supports
// start -> stop -> start for an in-process restart.
export class OutboxRelay {
  readonly #outbox: JobsOutbox;
  readonly #backend: Pick<JobsBackendBase, 'enqueue'>;
  readonly #logging: JobsLogger;
  readonly #sentry?: JobsErrorReporter;
  readonly #pollIntervalMs: number;
  readonly #submissionTimeoutMs: number;
  readonly #retryDelayMs: number;

  #running = false;
  #loop?: Promise<void>;
  #wake?: () => void;

  constructor({
    outbox,
    backend,
    logging,
    sentry,
    pollIntervalMs,
    submissionTimeoutMs,
    retryDelayMs,
  }: OutboxRelayOptions) {
    this.#outbox = outbox;
    this.#backend = backend;
    this.#logging = logging;
    this.#sentry = sentry;
    this.#pollIntervalMs = pollIntervalMs;
    this.#submissionTimeoutMs = submissionTimeoutMs;
    this.#retryDelayMs = retryDelayMs;
  }

  start(): void {
    if (this.#running) {
      return;
    }
    this.#running = true;
    this.#loop = this.#run();
  }

  // Stops polling and waits out any in-flight submission before resolving.
  async stop(): Promise<void> {
    this.#running = false;
    this.#wake?.();
    await this.#loop;
    this.#loop = undefined;
  }

  async #run(): Promise<void> {
    while (this.#running) {
      await this.#drain();
      if (!this.#running) {
        break;
      }
      await this.#sleep(this.#pollIntervalMs);
    }
  }

  // Processes every currently-eligible row, one transaction at a time, until
  // none remain. A rejected row is bumped out of eligibility by processNext, so
  // it never blocks the rows waiting behind it.
  async #drain(): Promise<void> {
    while (this.#running) {
      let outcome: ProcessOutcome;
      try {
        outcome = await this.#outbox.processNext((id, envelope) => this.#submit(id, envelope), {
          retryDelayMs: this.#retryDelayMs,
        });
      } catch (error) {
        // An unexpected failure of the claim transaction itself (not a rejected
        // submission): log and back off to the poll interval rather than
        // spinning.
        this.#logging.error('[Jobs Outbox] relay claim failed', error);
        this.#sentry?.captureException(error);
        return;
      }

      if (outcome.status === 'idle') {
        return;
      }
      if (outcome.status === 'failed') {
        this.#logging.error(
          `[Jobs Outbox] submission failed for dispatch ${outcome.id}; retrying later`,
          outcome.error,
        );
        this.#sentry?.captureException(outcome.error, { tags: { dispatch_id: outcome.id } });
      }
    }
  }

  #submit(id: string, envelope: DispatchEnvelope): Promise<void> {
    const submission = Promise.resolve(this.#backend.enqueue(id, envelope));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(
          new errors.InternalServerError({
            message: `Jobs outbox submission timed out after ${this.#submissionTimeoutMs}ms`,
          }),
        );
      }, this.#submissionTimeoutMs);
    });
    return Promise.race([submission, timeout]).finally(() => {
      clearTimeout(timer);
    });
  }

  #sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.#wake = undefined;
        resolve();
      }, ms);
      // stop() resolves the sleep early so it never waits out a full interval.
      this.#wake = () => {
        clearTimeout(timer);
        this.#wake = undefined;
        resolve();
      };
    });
  }
}
