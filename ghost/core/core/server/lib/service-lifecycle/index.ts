import errors from '@tryghost/errors';
import logging from '@tryghost/logging';

type Shutdown = () => Promise<void>;

export type ServiceLifecycle<T extends object> = {
  service: T;
  init(): Promise<void>;
  shutdown?: Shutdown;
};

/** Construct explicitly at boot; add startup and cleanup hooks only when needed. */
export function defineService<T extends object>({
  name,
  create,
  start,
  shutdown,
}: {
  name: string;
  create(): T | Promise<T>;
  start?(instance: T): void | Promise<void>;
  shutdown?(instance: T): void | Promise<void>;
}): ServiceLifecycle<T> {
  let instance: T | undefined;
  let initialization: Promise<void> | undefined;
  let currentShutdown: Shutdown | undefined;
  let creating = false;
  let stopping = false;
  let cleanupFailed = false;
  const methods = new Map<PropertyKey, (...args: unknown[]) => unknown>();
  const misuse = (message: string) =>
    new errors.IncorrectUsageError({ message: `${name}: ${message}` });

  const resolve = (): T => {
    if (!instance) {
      throw misuse('service is not ready. Await init() before use.');
    }
    return instance;
  };

  const service = new Proxy({} as T, {
    get(_target, property) {
      // Promise resolution must never mistake this facade for a thenable.
      if (property === 'then') {
        return undefined;
      }
      const target = resolve();
      const value = Reflect.get(target, property, target);
      if (typeof value !== 'function') {
        return value;
      }
      if (!methods.has(property)) {
        methods.set(property, (...args) => {
          const receiver = resolve();
          const method = Reflect.get(receiver, property, receiver);
          if (typeof method !== 'function') {
            throw misuse(`${String(property)} is no longer a method.`);
          }
          return Reflect.apply(method, receiver, args);
        });
      }
      return methods.get(property);
    },
  });

  const init = (): Promise<void> => {
    if (cleanupFailed) {
      return Promise.reject(misuse('cleanup failed; this service cannot be initialized again.'));
    }
    if (stopping) {
      return Promise.reject(misuse('shutdown is still in progress.'));
    }
    if (creating) {
      return Promise.reject(misuse('initialization called recursively while creating service.'));
    }
    if (initialization) {
      return initialization;
    }

    const ready = Promise.withResolvers<void>();
    initialization = ready.promise;
    let candidate: T | undefined;
    let cleanup: Promise<void> | undefined;
    const dispose = (): Promise<void> => {
      cleanup ??= Promise.resolve()
        .then(() => candidate && shutdown?.(candidate))
        .catch((error) => {
          cleanupFailed = true;
          throw error;
        });
      return cleanup;
    };

    if (shutdown) {
      let stopped: Promise<void> | undefined;
      const stop = (): Promise<void> => {
        if (!stopped) {
          stopping = true;
          instance = undefined;
          stopped = (async () => {
            try {
              await ready.promise;
            } catch {
              // The init caller receives the startup failure.
            }
            await dispose();
            initialization = undefined;
            stopping = false;
          })();
        }
        return stopped;
      };
      currentShutdown = stop;
    }

    const initialize = async () => {
      try {
        let created: T | Promise<T>;
        creating = true;
        try {
          created = create();
        } finally {
          creating = false;
        }
        candidate = await created;
        await start?.(candidate);
        if (stopping) {
          throw misuse('initialization was interrupted by shutdown.');
        }
        instance = candidate;
      } catch (error) {
        try {
          await dispose();
        } catch (cleanupError) {
          try {
            logging.error(cleanupError);
          } catch {
            // Neither cleanup nor logging may replace the startup failure.
          }
        }
        if (!stopping && !cleanupFailed) {
          initialization = undefined;
        }
        throw error;
      }
    };
    void initialize().then(ready.resolve, ready.reject);
    return ready.promise;
  };

  if (!shutdown) {
    return { service, init };
  }
  return {
    service,
    init,
    shutdown: () => currentShutdown?.() ?? Promise.resolve(),
  };
}
