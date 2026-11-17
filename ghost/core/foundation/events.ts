import { EventEmitter } from 'node:events';
import type { EventBus } from '../kernel/events';
import type { Logger } from '../kernel/logging';

/**
 * Builds an event bus. Events are keyed by the name of their class, and a
 * failing handler is logged, not thrown, so one listener cannot break another
 * or the code that published.
 *
 * Call it once per process, from the application's bootstrap.
 */
export function createEventBus({ logging }: { logging: Pick<Logger, 'error'> }): EventBus {
  const emitter = new EventEmitter();
  // Listeners are added for the life of the process, one per listener file.
  emitter.setMaxListeners(0);

  return {
    subscribe(event, handler) {
      emitter.on(event.name, async (payload: unknown) => {
        try {
          await handler(payload);
        } catch (error) {
          logging.error(`Unhandled error in event handler for event: ${event.name}`);
          logging.error(error);
        }
      });
    },
    dispatch(event) {
      emitter.emit(event.constructor.name, event);
    },
  };
}
