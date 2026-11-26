/**
 * Ghost has two event buses today. The site has one: this sends an event named
 * by a string to the legacy bus, and an event named by its class to domain events.
 */
import type { Events } from '#support/site';

type Handler = (...args: unknown[]) => unknown;

const legacyEvents = (): {
  on(event: string, handler: Handler): unknown;
  removeListener(event: string, handler: Handler): unknown;
} => require('../core/server/lib/common/events');

// Domain events cannot be unsubscribed from, so each class is subscribed to once
// for the process, and what is added and removed is who that subscription calls.
const handlersByClass = new Map<object, Set<Handler>>();

/**
 * Calls every listener for a class as domain events would call each of them had
 * it subscribed itself: all are started, in the order they were added, before
 * any is waited for, and one that throws or rejects is logged and stops no other.
 * It settles when all have, so domain events count the event as handled only then.
 */
async function callEach(name: string, handlers: readonly Handler[], payload: unknown) {
  await Promise.all(
    handlers.map(async (handler) => {
      try {
        await handler(payload);
      } catch (error) {
        const logging = require('@tryghost/logging');
        logging.error('Unhandled error in event handler for event: ' + name);
        logging.error(error);
      }
    }),
  );
}

export const events: Events = {
  on(event, handler) {
    if (typeof event === 'string') {
      return legacyEvents().on(event, handler);
    }
    let handlers = handlersByClass.get(event);
    if (handlers === undefined) {
      const subscribed = new Set<Handler>();
      handlersByClass.set(event, subscribed);
      require('@tryghost/domain-events').subscribe(event, (payload: unknown) =>
        callEach(event.name, [...subscribed], payload),
      );
      handlers = subscribed;
    }
    handlers.add(handler);
    return undefined;
  },
  removeListener(event, handler) {
    if (typeof event === 'string') {
      return legacyEvents().removeListener(event, handler);
    }
    handlersByClass.get(event)?.delete(handler);
    return undefined;
  },
};
