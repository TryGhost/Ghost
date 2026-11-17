import type { EventBus } from '../kernel/events';

/**
 * Ghost's event bus, as the foundation hands it out. `@tryghost/domain-events`
 * is a class with one static emitter, so there is no instance to build: this
 * adapts it. Code that still imports the package and code that is handed this
 * publish to, and listen on, the same emitter.
 */
export function legacyEventBus(): EventBus {
  const domainEvents: typeof import('@tryghost/domain-events') = require('@tryghost/domain-events');
  return {
    // The package keys a subscription by the event's name and nothing else.
    subscribe: (event, handler) => domainEvents.subscribe(event as never, handler as never),
    dispatch: (event) => domainEvents.dispatch(event as never),
  };
}
