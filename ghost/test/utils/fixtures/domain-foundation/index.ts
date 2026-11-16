// Stands in for the foundation when the fixture domains are started in a test
// or from built JavaScript: an event bus, a clock and a record of what happened.
// Fixture service roots and the library domain's boot.ts import it the way real
// ones import Ghost's event bus and logger.

type Handler = (event: unknown) => unknown;

const handlers = new Map<string, Handler[]>();

export const bus = {
  subscribe(event: { readonly name: string }, handler: Handler) {
    handlers.set(event.name, [...(handlers.get(event.name) ?? []), handler]);
  },
  // Keyed by class name, as @tryghost/domain-events is.
  async dispatch(event: object) {
    for (const handler of handlers.get(event.constructor.name) ?? []) {
      await handler(event);
    }
  },
  subscriptions(name: string) {
    return handlers.get(name)?.length ?? 0;
  },
};

/** What the fixtures did, in order, for a test to read. */
export const journal: string[] = [];

export const clock = { now: () => new Date('2026-01-01T00:00:00.000Z') };

export function reset() {
  journal.length = 0;
}
