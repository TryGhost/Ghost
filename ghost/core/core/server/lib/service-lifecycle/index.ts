import errors from '@tryghost/errors';
import logging from '@tryghost/logging';

type Disposer = () => void | Promise<void>;

type Lifetime<T> = {
  scope: object;
  state: 'starting' | 'ready' | 'stopping' | 'stopped' | 'failed';
  instance?: T;
  creating: boolean;
  acceptingDisposers: boolean;
  disposers: Disposer[];
  startup: Promise<void>;
  cleanup?: Promise<void>;
  shutdown?: Promise<void>;
};

export type ServiceLifecycle<T extends object> = {
  service: T;
  init(scope: object): Promise<void>;
  shutdown(scope: object): Promise<void>;
};

/**
 * Owns one ready capability per boot. Register cleanup before fallible resource
 * acquisition; a failed or interrupted start disposes without publishing it.
 * The facade supports member reads and calls, not object reflection or mutation.
 */
export function defineService<T extends object>({
  name,
  create,
}: {
  name: string;
  create(lifetime: { onDispose(dispose: Disposer): void }): T | Promise<T>;
}): ServiceLifecycle<T> {
  let current: Lifetime<T> | undefined;
  let cleanupFailed = false;
  const usedScopes = new WeakSet<object>();
  const methods = new Map<PropertyKey, (...args: unknown[]) => unknown>();
  const misuse = (message: string) =>
    new errors.IncorrectUsageError({ message: `${name}: ${message}` });

  const resolve = (): T => {
    if (current?.state !== 'ready' || !current.instance) {
      throw misuse('service is not ready. Await init() before use.');
    }
    return current.instance;
  };

  const service = new Proxy({} as T, {
    get(_target, property) {
      // Promise resolution must never mistake this facade for a thenable.
      if (property === 'then') {
        return undefined;
      }
      const instance = resolve();
      const value = Reflect.get(instance, property, instance);
      if (typeof value !== 'function') {
        return value;
      }
      if (!methods.has(property)) {
        methods.set(property, (...args) => {
          const target = resolve();
          const method = Reflect.get(target, property, target);
          if (typeof method !== 'function') {
            throw misuse(`${String(property)} is no longer a method.`);
          }
          return Reflect.apply(method, target, args);
        });
      }
      return methods.get(property);
    },
  });

  const dispose = (lifetime: Lifetime<T>): Promise<void> => {
    lifetime.cleanup ??= Promise.resolve().then(async () => {
      const failures: unknown[] = [];
      for (const disposer of lifetime.disposers.reverse()) {
        try {
          await disposer();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length > 0) {
        cleanupFailed = true;
        lifetime.state = 'failed';
        // Preserve every failure while preventing a new boot over leaked resources.
        // eslint-disable-next-line ghost/ghost-custom/ghost-error-usage -- Native AggregateError retains all disposer failures.
        throw new AggregateError(failures, `${name}: service cleanup failed`);
      }
      lifetime.state = 'stopped';
    });
    return lifetime.cleanup;
  };

  const init = (scope: object): Promise<void> => {
    if (cleanupFailed) {
      return Promise.reject(misuse('cleanup failed; this service cannot be initialized again.'));
    }
    if (current?.scope === scope) {
      if (current.creating) {
        return Promise.reject(misuse('initialization called recursively while creating service.'));
      }
      if (
        current.state === 'starting' ||
        current.state === 'ready' ||
        (current.state === 'stopping' && !current.shutdown)
      ) {
        return current.startup;
      }
      return Promise.reject(misuse('this boot scope has stopped; use a fresh scope.'));
    }
    if (current && current.state !== 'stopped') {
      return Promise.reject(misuse('another boot scope still owns this service.'));
    }
    if (usedScopes.has(scope)) {
      return Promise.reject(misuse('this boot scope has stopped; use a fresh scope.'));
    }

    const startup = Promise.withResolvers<void>();
    const lifetime: Lifetime<T> = {
      scope,
      state: 'starting',
      creating: false,
      acceptingDisposers: true,
      disposers: [],
      startup: startup.promise,
    };
    current = lifetime;
    usedScopes.add(scope);

    const start = async () => {
      try {
        let candidate: T | Promise<T>;
        lifetime.creating = true;
        try {
          candidate = create({
            onDispose(disposer) {
              if (!lifetime.acceptingDisposers) {
                throw misuse('cleanup must be registered during creation.');
              }
              lifetime.disposers.push(disposer);
            },
          });
        } finally {
          lifetime.creating = false;
        }
        const instance = await candidate;
        lifetime.acceptingDisposers = false;
        if (lifetime.state !== 'starting') {
          throw misuse('initialization was interrupted by shutdown.');
        }
        lifetime.instance = instance;
        lifetime.state = 'ready';
      } catch (error) {
        lifetime.acceptingDisposers = false;
        lifetime.state = 'stopping';
        try {
          await dispose(lifetime);
        } catch (cleanupError) {
          try {
            logging.error(cleanupError);
          } finally {
            // A logging failure must not replace the original startup failure either.
            throw error;
          }
        }
        throw error;
      }
    };
    void start().then(startup.resolve, startup.reject);
    return lifetime.startup;
  };

  const shutdown = (scope: object): Promise<void> => {
    const lifetime = current;
    if (!lifetime || lifetime.scope !== scope) {
      return Promise.resolve();
    }
    if (!lifetime.shutdown) {
      lifetime.state = 'stopping';
      lifetime.instance = undefined;
      lifetime.shutdown = (async () => {
        try {
          await lifetime.startup;
        } catch {
          // The init caller receives the original error; disposal is shared below.
        }
        try {
          await dispose(lifetime);
        } finally {
          lifetime.state = cleanupFailed ? 'failed' : 'stopped';
        }
      })();
    }
    return lifetime.shutdown;
  };

  return { service, init, shutdown };
}
