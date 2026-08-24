export interface JobEnvelope {
  type: string;
  payload: string;
}

export type JobProcessor = (envelope: JobEnvelope) => Promise<void>;

export interface JobsStartOptions {
  processor: JobProcessor;
}

export interface RecurringSchedule {
  cron: string;
}

export interface JobsShutdownOptions {
  timeoutMs?: number;
}

export abstract class JobsBackendBase {
  declare readonly requiredFns: readonly ['start', 'enqueue', 'scheduleRecurring', 'shutdown'];

  constructor() {
    Object.defineProperty(this, 'requiredFns', {
      value: Object.freeze(['start', 'enqueue', 'scheduleRecurring', 'shutdown']),
      writable: false,
    });
  }

  abstract start(options: JobsStartOptions): void | Promise<void>;

  abstract enqueue(envelope: JobEnvelope): void | Promise<void>;

  abstract scheduleRecurring(
    envelope: JobEnvelope,
    schedule: RecurringSchedule,
  ): void | Promise<void>;

  abstract shutdown(options?: JobsShutdownOptions): void | Promise<void>;

  /**
   * Resolve once every already-accepted job has settled. Backends that cannot
   * observe their own queue depth (a durable/remote queue) may keep this
   * default no-op; an in-process backend must override it, because the test
   * harness relies on it to keep a job's work inside the test that enqueued it.
   */
  allSettled(): Promise<void> {
    return Promise.resolve();
  }
}
