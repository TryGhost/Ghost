export interface JobEnvelope {
  type: string;
  payload: string;
}

// Routing is metadata about where a job runs, never what runs it: delivery
// must always be keyed on the envelope's type, so a job is processable
// whichever queue it arrives on (deploys can move types between queues while
// older envelopes are still in flight).
export interface JobRouting {
  queue?: string;
}

// A queue declared in code (via handler registration) is desired state: the
// backend enforces its concurrency as strictly as it can - per process for an
// in-memory backend, globally where a durable backend supports it. Weaker
// enforcement is acceptable; silently ignoring a declaration is not.
export interface QueueDeclaration {
  concurrency?: number;
}

export type JobProcessor = (envelope: JobEnvelope) => Promise<void>;

export interface JobsStartOptions {
  processor: JobProcessor;
  // Queues declared by registered handlers. A backend that cannot satisfy a
  // declared queue's constraints - whatever that means for its implementation -
  // must fail loudly here rather than silently dropping the declaration.
  queues?: Record<string, QueueDeclaration>;
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

  abstract enqueue(envelope: JobEnvelope, routing?: JobRouting): void | Promise<void>;

  abstract scheduleRecurring(
    envelope: JobEnvelope,
    schedule: RecurringSchedule,
    routing?: JobRouting,
  ): void | Promise<void>;

  abstract shutdown(options?: JobsShutdownOptions): void | Promise<void>;
}
