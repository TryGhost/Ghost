import { IncorrectUsageError } from '@tryghost/errors';
import type { Given, Needed, ServiceDefinition } from '@tryghost/kernel/define-service';
import type { Foundation } from '@tryghost/kernel/foundation';

type Definition = ServiceDefinition<any, any>;

/**
 * The services of one application: what has been built from each definition.
 * A definition holds no instance; this does, for as long as the application is
 * started.
 */
export interface Services {
  /**
   * Listens for the events a definition declares. Nothing is built: the
   * service is built when it is first used or when one of its events arrives.
   * Registering a definition again does nothing.
   */
  register(definition: Definition): void;
  /** Allows services to be built. The start sequence calls this when what they read is ready. */
  open(): void;
  /**
   * The instance, built now if this is its first use. Throws when the
   * application is not ready to build services, or when the service is built
   * asynchronously and has not finished: `resolve()` waits for those.
   */
  get<Service>(needed: Needed<Service>): Service;
  /** The instance, waiting for it when it is built asynchronously. */
  resolve<Service>(needed: Needed<Service>): Promise<Service>;
  /** Builds the service and runs its `start`. Only the start sequence calls this. */
  start(definition: Definition): Promise<void>;
  /**
   * Runs the `stop` of everything started, in reverse order, forgets every
   * instance, and refuses to build until `open()` is called again.
   */
  close(): Promise<void>;
}

interface Built {
  /** The instance, or the promise of one that is still being built. */
  readonly value: unknown;
  readonly given: Given<object>;
}

interface Open {
  readonly instances: Map<Definition, Built>;
  /** Being built now, without having awaited anything yet. */
  readonly creating: Set<Definition>;
  readonly started: Definition[];
}

function isPromise(value: unknown): value is Promise<unknown> {
  return typeof (value as { then?: unknown } | undefined)?.then === 'function';
}

// A root that holds its own instance, as the older form of `defineService` returns.
function isHolder<Service>(needed: Needed<Service>): needed is { readonly service: Service } {
  return !('create' in needed);
}

/**
 * Builds services from their definitions, the first time each is used, and
 * keeps them until `close()`. It keeps nothing outside the object it returns,
 * so two applications in one process each have their own instances.
 */
export function createServices({
  name,
  foundation,
}: {
  /** The application's name, for error messages. */
  readonly name: string;
  readonly foundation: Foundation;
}): Services {
  // For the life of the application: the event bus cannot remove a listener.
  const registered = new Set<Definition>();
  let open: Open | undefined;

  function assemble(definition: Definition, given: Record<string, unknown> & Given<object>) {
    const waiting: Promise<void>[] = [];
    for (const [key, needed] of Object.entries<Needed<any>>(definition.needs ?? {})) {
      const value = isHolder(needed) ? needed.service : build(needed);
      if (isPromise(value)) {
        waiting.push(value.then((service) => void (given[key] = service)));
      } else {
        given[key] = value;
      }
    }
    return waiting.length
      ? Promise.all(waiting).then(() => definition.create(given))
      : definition.create(given);
  }

  function build(definition: Definition): unknown {
    if (!open) {
      throw new IncorrectUsageError({
        message: `${definition.name} was used while ${name} is not started. A service is built on first use, once the start sequence has reached the services step and until the application stops.`,
      });
    }
    const { instances, creating } = open;
    const built = instances.get(definition);
    if (built) {
      return built.value;
    }
    if ((definition.listeners?.length || definition.start) && !registered.has(definition)) {
      throw new IncorrectUsageError({
        message: `${definition.name} declares listeners or a start, but ${name} does not register it. Name it in the application's services step, or its events are missed until its first use and its start never runs.`,
      });
    }
    if (creating.has(definition)) {
      throw new IncorrectUsageError({
        message: `${definition.name} needs itself, directly or through what it needs.`,
      });
    }

    const given: Record<string, unknown> & Given<object> = { foundation };
    creating.add(definition);
    let value: unknown;
    try {
      value = assemble(definition, given);
    } finally {
      creating.delete(definition);
    }
    if (isPromise(value)) {
      const building: Promise<unknown> = value.then(
        (service) => {
          if (instances.get(definition)?.value === building) {
            instances.set(definition, { value: service, given });
          }
          return service;
        },
        (error: unknown) => {
          // Forgotten, so that the next use tries again.
          if (instances.get(definition)?.value === building) {
            instances.delete(definition);
          }
          throw error;
        },
      );
      value = building;
    }
    instances.set(definition, { value, given });
    return value;
  }

  function get<Service>(needed: Needed<Service>): Service {
    if (isHolder(needed)) {
      return needed.service;
    }
    const value = build(needed);
    if (isPromise(value)) {
      // Whoever awaits the build sees its failure; this caller is told to wait.
      value.catch(() => {});
      throw new IncorrectUsageError({
        message: `${needed.name} is built asynchronously and is not ready. Await resolve(), or have the start sequence build it.`,
      });
    }
    return value as Service;
  }

  async function resolve<Service>(needed: Needed<Service>): Promise<Service> {
    return (isHolder(needed) ? needed.service : build(needed)) as Service;
  }

  function deliver(definition: Definition, handle: (service: any, event: never) => unknown) {
    return (event: unknown) => {
      // Not started: there is nothing to deliver to.
      if (!open) {
        return undefined;
      }
      // A failed build reaches the event bus as a failed handler would.
      const service = build(definition);
      return isPromise(service)
        ? service.then((ready) => handle(ready, event as never))
        : handle(service, event as never);
    };
  }

  return {
    register(definition) {
      if (registered.has(definition)) {
        return;
      }
      registered.add(definition);
      for (const { event, handle } of definition.listeners ?? []) {
        foundation.events.subscribe(event, deliver(definition, handle));
      }
    },
    open() {
      open ??= { instances: new Map(), creating: new Set(), started: [] };
    },
    get,
    resolve,
    start(definition) {
      // Not an async function: a service that is built synchronously is built
      // and started before this returns, as the start sequence expects.
      async function run(service: unknown) {
        const current = open;
        const built = current?.instances.get(definition);
        if (!definition.start || !current || !built || current.started.includes(definition)) {
          return;
        }
        // Recorded first, so that a second call made meanwhile does not start it again.
        current.started.push(definition);
        try {
          await definition.start(service, built.given);
        } catch (error) {
          current.started.splice(current.started.indexOf(definition), 1);
          await definition.stop?.(service);
          throw error;
        }
      }
      try {
        const service = build(definition);
        return isPromise(service) ? service.then(run) : run(service);
      } catch (error) {
        return Promise.reject(error);
      }
    },
    async close() {
      const closing = open;
      open = undefined;
      for (const definition of closing?.started.reverse() ?? []) {
        try {
          await definition.stop?.(closing?.instances.get(definition)?.value);
        } catch (error) {
          foundation.logging.error(error);
        }
      }
    },
  };
}
