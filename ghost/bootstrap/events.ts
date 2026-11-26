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
        Promise.all([...subscribed].map((subscriber) => subscriber(payload))),
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
