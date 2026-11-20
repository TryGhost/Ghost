import type { EventBus } from '@tryghost/kernel/events';
import type { Logger } from '@tryghost/kernel/logging';

/**
 * Ghost's event bus, as the foundation hands it out. `@tryghost/domain-events`
 * is a class with one static emitter, so there is no instance to build: this
 * adapts it. Code that still imports the package and code that is handed this
 * publish to, and listen on, the same emitter.
 *
 * A listener for an event made by `legacyEvent()` is attached to the legacy
 * bus (`core/server/lib/common/events`) instead, so that a service definition
 * can declare one. That bus hands a listener the first argument it was
 * emitted with.
 */
export function legacyEventBus({ logging }: { readonly logging: Pick<Logger, 'error'> }): EventBus {
  const domainEvents: typeof import('@tryghost/domain-events') = require('@tryghost/domain-events');
  const {
    isLegacyEvent,
  }: typeof import('../../core/server/lib/common/legacy-event') = require('../../core/server/lib/common/legacy-event');
  return {
    subscribe: (event, handler) => {
      if (!isLegacyEvent(event)) {
        // The package keys a subscription by the event's name and nothing else.
        domainEvents.subscribe(event as never, handler as never);
        return;
      }
      const legacyEvents: {
        on(name: string, listener: (payload: unknown) => void): unknown;
      } = require('../../core/server/lib/common/events');
      legacyEvents.on(event.name, (payload) => {
        // A listener that throws fails the emit, as it always has. The legacy
        // bus waits for nothing, so a rejection is logged here.
        Promise.resolve(handler(payload)).catch((error: unknown) => logging.error(error));
      });
    },
    dispatch: (event) => domainEvents.dispatch(event as never),
  };
}
