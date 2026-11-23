import { EventEmitter } from 'node:events';
import logging from '@tryghost/logging';

/**
 * A class that can be constructed to produce `T`. The arguments are `never[]`
 * so that any constructor is accepted, whatever it takes.
 */
export type ConstructorOf<T> = new (...args: never[]) => T;

/**
 * Shape every domain event is expected to follow.
 */
export interface IEvent<Data = unknown> {
  timestamp: Date;
  data: Data;
}

/**
 * A simple in-process event bus for domain events. Events are keyed by their
 * class name, so subscribers pass the event class and dispatchers pass an
 * instance of it.
 *
 * At runtime this is a class with only static members, typed as a singleton
 * object. To name its type, use `typeof DomainEvents`, e.g.
 * `Pick<typeof DomainEvents, 'dispatch' | 'subscribe'>`.
 */
export interface DomainEventsApi {
  /**
   * The underlying emitter. Not part of the supported API; it is exposed so
   * tests can remove listeners between cases.
   */
  readonly ee: EventEmitter;

  /**
   * Subscribe to an event class. Errors thrown by the handler are logged,
   * not rethrown.
   */
  subscribe<EventClass extends IEvent<unknown>>(
    Event: ConstructorOf<EventClass>,
    handler: (event: EventClass) => Promise<void> | void,
  ): void;

  /**
   * Dispatch an event instance to all subscribers of its class.
   */
  dispatch<Data>(event: IEvent<Data>): void;

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

interface AwaitQueueItem {
  resolve: () => void;
}

class DomainEvents {
  static ee = new EventEmitter();

  static subscribe<EventClass extends IEvent<unknown>>(
    Event: ConstructorOf<EventClass>,
    handler: (event: EventClass) => Promise<void> | void,
  ): void {
    DomainEvents.ee.on(Event.name, async (event: EventClass) => {
      try {
        await handler(event);
      } catch (e) {
        logging.error('Unhandled error in event handler for event: ' + Event.name);
        logging.error(e);
      }
      if (this.#trackingEnabled) {
        this.#onProcessed();
      } else {
        // Tracking is disabled outside tests.
      }
    });
  }

  static dispatch<Data>(event: IEvent<Data>): void {
    DomainEvents.dispatchRaw(event.constructor.name, event);
  }

  static dispatchRaw<Data>(name: string, data: Data): void {
    if (this.#trackingEnabled) {
      this.#dispatchCount += DomainEvents.ee.listenerCount(name);
    } else {
      // Tracking is disabled outside tests.
    }
    DomainEvents.ee.emit(name, data);
  }

  // Methods and properties below are only for testing purposes
  static #awaitQueue: AwaitQueueItem[] = [];
  static #dispatchCount = 0;
  static #processedCount = 0;
  static #trackingEnabled = process.env.NODE_ENV?.startsWith('test') ?? false;

  static allSettled(): Promise<void> {
    return new Promise((resolve) => {
      if (this.#processedCount >= this.#dispatchCount) {
        // Resolve immediately if there are no events in the queue
        resolve();
        return;
      } else {
        this.#awaitQueue.push({ resolve });
      }
    });
  }

  static #onProcessed(): void {
    this.#processedCount += 1;
    if (this.#processedCount >= this.#dispatchCount) {
      for (const item of this.#awaitQueue) {
        item.resolve();
      }
      this.#awaitQueue = [];
    } else {
      // Wait for the remaining tracked listeners.
    }
  }

  static setTrackingEnabledForTest(enabled: boolean): void {
    this.#trackingEnabled = enabled;
  }

  static resetTrackingStateForTest(): void {
    this.#awaitQueue = [];
    this.#dispatchCount = 0;
    this.#processedCount = 0;
  }
}

export const domainEvents: DomainEventsApi = DomainEvents;
