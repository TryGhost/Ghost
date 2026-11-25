import errors from '@tryghost/errors';
import type { JobsBackendBase, DispatchEnvelope } from '@tryghost/adapter-base-jobs';
import type { JobsLogger, JobsErrorReporter } from './jobs-service';
import { JobsOutbox, ProcessOutcome } from './jobs-outbox';

export interface OutboxRelayTimings {
  pollIntervalMs: number;
  submissionTimeoutMs: number;
  retryDelayMs: number;
}

export interface OutboxRelayOptions extends OutboxRelayTimings {
  outbox: Pick<JobsOutbox, 'processNext'>;
  backend: Pick<JobsBackendBase, 'enqueue'>;
  // Whether this process can run a job type. Any process can claim any row, so
  // one from a newer version is left for a process that has its handler.
  handles?: (type: string) => boolean;
  logging: JobsLogger;
  sentry?: JobsErrorReporter;
}

export class OutboxRelay {
  readonly #outbox: Pick<JobsOutbox, 'processNext'>;
  readonly #backend: Pick<JobsBackendBase, 'enqueue'>;
  readonly #handles: (type: string) => boolean;
  readonly #logging: JobsLogger;
  readonly #sentry?: JobsErrorReporter;
  readonly #pollIntervalMs: number;
  readonly #submissionTimeoutMs: number;
  readonly #retryDelayMs: number;

  #running = false;
  #loop?: Promise<void>;
  #wake?: () => void;
  #woken = false;

  constructor({
    outbox,
    backend,
    handles = () => true,
    logging,
    sentry,
    pollIntervalMs,
    submissionTimeoutMs,
    retryDelayMs,
  }: OutboxRelayOptions) {
    this.#outbox = outbox;
    this.#backend = backend;
    this.#handles = handles;
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

  // Drains now instead of at the next poll. A wake-up during a drain makes
  // the relay drain again, since the drain may have looked before the row
  // committed.
  wake(): void {
    this.#woken = true;
    this.#wake?.();
  }

  async stop(): Promise<void> {
    this.#running = false;
    this.#wake?.();
    await this.#loop;
    this.#loop = undefined;
  }

  async #run(): Promise<void> {
    // Nothing wakes the relay for a retry, so it sleeps only until the
    // latest one is due, even across drains started by a wake-up; one drain
    // then retries every row that failed before it
    let retryDueAt: number | undefined;
    while (this.#running) {
      this.#woken = false;
      if (retryDueAt !== undefined && Date.now() >= retryDueAt) {
        retryDueAt = undefined;
      }
      if (await this.#drain()) {
        retryDueAt = Date.now() + this.#retryDelayMs;
      }
      if (!this.#running) {
        break;
      }
      const untilRetry =
        retryDueAt === undefined ? this.#pollIntervalMs : Math.max(0, retryDueAt - Date.now());
      await this.#sleep(Math.min(this.#pollIntervalMs, untilRetry));
    }
  }

  // Resolves true when a claim or a hand-off failed and needs a retry
  async #drain(): Promise<boolean> {
    let failed = false;
    while (this.#running) {
      let outcome: ProcessOutcome;
      try {
        outcome = await this.#outbox.processNext((id, envelope) => this.#submit(id, envelope), {
          retryDelayMs: this.#retryDelayMs,
        });
      } catch (error) {
        this.#logging.error(
          '[Jobs Outbox] relay failed while processing a row; it stays in the outbox and will be retried',
          error,
        );
        this.#sentry?.captureException(error);
        return true;
      }

      if (outcome.status === 'idle') {
        return failed;
      }
      if (outcome.status === 'delivered') {
        // created_at is stored floored to the second, so this reads up to 1s high
        const lagMs = Date.now() - outcome.createdAt.getTime();
        this.#logging.info(
          {
            system: {
              event: 'jobs_outbox.handed_off',
              dispatch_id: outcome.id,
              job_type: outcome.type,
              outbox_lag_ms: lagMs,
            },
          },
          `[Jobs Outbox] Handed off ${outcome.type} (dispatch ${outcome.id}) after ${lagMs}ms`,
        );
      }
      if (outcome.status === 'failed') {
        failed = true;
        this.#logging.error(
          `[Jobs Outbox] submission failed for dispatch ${outcome.id}; retrying later`,
          outcome.error,
        );
        this.#sentry?.captureException(outcome.error, { tags: { dispatch_id: outcome.id } });
      }
    }
    return failed;
  }

  #submit(id: string, envelope: DispatchEnvelope): Promise<void> {
    const type = envelope.payload.job.type;
    if (!this.#handles(type)) {
      return Promise.reject(
        new errors.IncorrectUsageError({
          message: `No handler registered in this process for job type "${type}"; leaving it in the outbox.`,
        }),
      );
    }
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
    if (this.#woken) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.#wake = undefined;
        resolve();
      }, ms);
      this.#wake = () => {
        clearTimeout(timer);
        this.#wake = undefined;
        resolve();
      };
    });
  }
}
