// Any value that survives a JSON round-trip. The dispatch envelope's payload is
// constrained to this so the outbox can store it and the relay forward it
// verbatim, whatever a future job payload looks like.
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

// What the jobs service submits and a durable outbox stores and forwards
// unchanged. The relay never interprets the payload or translates it per
// backend. For existing jobs the payload is
// `{job: {type, payload}, routing?: {queue}}` - `job` is exactly the
// JobEnvelope delivered to the processor, and routing is optional (omitted =
// the default lane). A future batch can be represented inside this payload
// without changing the table, the relay, or this contract.
export interface DispatchEnvelope {
  version: 1;
  payload: { [key: string]: JsonValue };
}

// Delivery to the registered handler. A backend unwraps `DispatchEnvelope`'s
// `payload.job` into this before calling the processor, so delivery behaviour
// is unchanged by the envelope reshape.
export interface JobEnvelope {
  type: string;
  payload: string;
}

// Routing is metadata about where a job runs, never what runs it: delivery
// must always be keyed on the envelope's type, so a job is processable
// whichever queue it arrives on (deploys can move types between queues while
// older envelopes are still in flight). It now travels inside the dispatch
// envelope's payload rather than as a separate submission argument.
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

  // `id` is the stable dispatch ID, identical on every outbox retry, so a
  // durable backend can dedupe an at-least-once redelivery on it.
  abstract enqueue(id: string, envelope: DispatchEnvelope): void | Promise<void>;

  // A recurring registration is not a work instance - each occurrence is minted
  // by the backend - so it carries no dispatch ID. Identity for
  // first-registration-wins dedupe is `envelope.payload.job.type`.
  abstract scheduleRecurring(
    envelope: DispatchEnvelope,
    schedule: RecurringSchedule,
  ): void | Promise<void>;

  abstract shutdown(options?: JobsShutdownOptions): void | Promise<void>;
}
