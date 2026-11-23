/**
 * A simple in-process event bus for domain events. Events are keyed by their
 * class name, so subscribers pass the event class and dispatchers pass an
 * instance of it.
 *
 * At runtime this is a class with only static members. It is typed as a
 * singleton object so that both `DomainEvents` and `typeof DomainEvents`
 * describe it, e.g. `Pick<DomainEvents, 'dispatch' | 'subscribe'>`.
 */
interface DomainEvents {
  /**
   * Subscribe to an event class. Errors thrown by the handler are logged,
   * not rethrown. Returns a function that stops the handler from being called.
   */
  subscribe<EventClass extends DomainEvents.IEvent<unknown>>(
    Event: DomainEvents.ConstructorOf<EventClass>,
    handler: (event: EventClass) => Promise<void> | void,
  ): () => void;

  /**
   * Dispatch an event instance to all subscribers of its class.
   */
  dispatch<Data>(event: DomainEvents.IEvent<Data>): void;

  /**
   * Dispatch an event when you have its name and data, but no instance of
   * the event class.
   */
  dispatchRaw<Data>(name: string, data: Data): void;

  /**
   * Wait until every tracked dispatched event has been fully processed.
   * Tracking is only enabled when `NODE_ENV` starts with `test`.
   */
  allSettled(): Promise<void>;

  /**
   * Enable or disable dispatch/processed tracking. Test-only.
   */
  setTrackingEnabledForTest(enabled: boolean): void;

  /**
   * Clear the await queue and reset dispatch/processed counts. Test-only.
   */
  resetTrackingStateForTest(): void;
}

declare const DomainEvents: DomainEvents;

declare namespace DomainEvents {
  type ConstructorOf<T> = import('./index').ConstructorOf<T>;

  /**
   * Shape every domain event is expected to follow.
   */
  interface IEvent<Data = unknown> {
    timestamp: Date;
    data: Data;
  }
}

export = DomainEvents;
