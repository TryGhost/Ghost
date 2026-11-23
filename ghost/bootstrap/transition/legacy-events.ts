import type { EventBus, EventKey } from '#kernel/foundation';

const LEGACY = Symbol('An event of the legacy string-named bus');

interface LegacyEventKey extends EventKey {
  readonly [LEGACY]: true;
}

/**
 * EARMARKED. Names an event of the legacy string-named bus (`server/lib/common/events`), such as
 * `site.changed`, so that a service can declare a listener for it.
 *
 * It exists because models and the routing layer still announce changes on that bus. It leaves
 * when nothing a service listens for is published there.
 */
export function legacyEvent(name: string): EventKey {
  const key: LegacyEventKey = { name, [LEGACY]: true };
  return key;
}

function isLegacyEvent(event: EventKey): event is LegacyEventKey {
  return LEGACY in event;
}

/**
 * EARMARKED. The application's event bus, as one face over the two buses legacy code publishes
 * on: `@tryghost/domain-events` for typed events and the string-named bus for the rest. Neither
 * is loaded until something subscribes or dispatches.
 *
 * It exists because both buses are modules that build themselves. It leaves when the foundry
 * builds the bus and `@tryghost/domain-events` is an alias over it.
 */
export function legacyEventBus(): EventBus {
  return {
    subscribe(event, handler) {
      if (isLegacyEvent(event)) {
        const legacyEvents: NodeJS.EventEmitter = require('../../core/server/lib/common/events');
        // The emitter passes whatever was emitted; each listener names what it expects.
        const listener = handler as (...payload: unknown[]) => void;
        legacyEvents.on(event.name, listener);
        return () => {
          legacyEvents.off(event.name, listener);
        };
      }
      const DomainEvents: typeof import('@tryghost/domain-events') = require('@tryghost/domain-events');
      // Subscribed under the key's name, as the bus keys an event by the name of its class.
      return DomainEvents.subscribe(
        event as Parameters<typeof DomainEvents.subscribe>[0],
        handler as Parameters<typeof DomainEvents.subscribe>[1],
      );
    },
    dispatch(event) {
      const DomainEvents: typeof import('@tryghost/domain-events') = require('@tryghost/domain-events');
      DomainEvents.dispatch(event as Parameters<typeof DomainEvents.dispatch>[0]);
    },
  };
}
