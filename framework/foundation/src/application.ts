import type { Provider } from '#support/define-provider';
import type { Site } from '#support/site';

export interface Application {
  /**
   * Subscribes every listed listener to the site's events. A listener's file is
   * loaded when its first event arrives. Returns a function that unsubscribes them.
   *
   * A listener is called as the emitter calls any listener: if it throws, the
   * emitter sees it. If it returns a promise that rejects, or its file cannot be
   * loaded, that is logged.
   */
  listen(site: Site): () => void;
}

export function createApplication(options: {
  readonly providers: readonly Provider[];
}): Application {
  const providers = [...options.providers];

  return {
    listen(site) {
      const subscribed: (() => void)[] = [];
      const stop = () => {
        for (const unsubscribe of subscribed.splice(0)) {
          unsubscribe();
        }
      };

      try {
        for (const provider of providers) {
          for (const [event, loads] of Object.entries(provider.listeners)) {
            for (const load of loads) {
              const handler = (...args: unknown[]) => {
                let listener;
                try {
                  listener = load().default;
                } catch (error) {
                  // A file that cannot be loaded is no fault of whoever emitted the event.
                  site.log.error(error);
                  return;
                }
                const result = listener(site, ...args);
                // An emitter does not wait for its listeners, so nothing else would see this fail.
                if (result instanceof Promise) {
                  result.catch((error: unknown) => site.log.error(error));
                }
              };
              // Recorded first, so a subscription that throws part-way is still removed.
              subscribed.push(() => site.events.removeListener(event, handler));
              site.events.on(event, handler);
            }
          }
        }
      } catch (error) {
        stop();
        throw error;
      }

      return stop;
    },
  };
}
