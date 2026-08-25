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
}
