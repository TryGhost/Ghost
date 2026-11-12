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
  logging: JobsLogger;
  sentry?: JobsErrorReporter;
}

export class OutboxRelay {
  readonly #outbox: Pick<JobsOutbox, 'processNext'>;
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

  async #drain(): Promise<void> {
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
        return;
      }

      if (outcome.status === 'idle') {
        return;
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
      this.#wake = () => {
        clearTimeout(timer);
        this.#wake = undefined;
        resolve();
      };
    });
  }
}
