import errors from '@tryghost/errors';
import type {
  AnyServiceDefinition,
  Given,
  ServiceDefinitionOf,
} from '@tryghost/kernel/define-service';
import type { Foundation, Unsubscribe } from '@tryghost/kernel/foundation';

/**
 * The services of one application: what has been built from each definition. A definition holds
 * no instance; this does, from the first use of the service until the application stops.
 */
export interface Services {
  /**
   * Makes the application listen for the events a definition declares, from when services can be
   * built until `close()`. Nothing is built: the service is built when it is first used or when
   * one of its events arrives. Registering a definition again does nothing.
   */
  register(definition: AnyServiceDefinition): void;
  /** Allows services to be built. Called when what services read is ready. */
  open(): void;
  /** Whether services can be built now. */
  readonly isOpen: boolean;
  /** The instance, built now if this is its first use. Throws while services cannot be built. */
  get<Service>(definition: ServiceDefinitionOf<Service>): Service;
  /**
   * Builds the service if nothing has, then runs its `start` and waits for it. Starting a
   * definition registers it.
   */
  start(definition: AnyServiceDefinition): Promise<void>;
  /**
   * Runs the `stop` of everything started, last started first, stops listening, forgets every
   * instance and every registration, and refuses to build until `open()` is called again. What
   * starts the application again registers again.
   */
  close(): Promise<void>;
}

interface Built {
  readonly service: unknown;
  readonly given: Given;
}

interface Open {
  readonly instances: Map<AnyServiceDefinition, Built>;
  /** Being built now: a definition found here again needs itself. */
  readonly building: Set<AnyServiceDefinition>;
  /** Started, in the order they were. */
  readonly started: AnyServiceDefinition[];
  readonly listening: Unsubscribe[];
}

function isPromise(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as { then?: unknown } | null | undefined)?.then === 'function';
}

/**
 * Builds services from their definitions, the first time each is used, and keeps them until
 * `close()`. Everything it keeps is inside the object it returns, so two applications in one
 * process each have their own instances of the same definitions.
 */
export function createServices({
  name,
  foundation,
}: {
  /** The application's name, for error messages. */
  readonly name: string;
  readonly foundation: Foundation;
}): Services {
  const registered = new Set<AnyServiceDefinition>();
  let open: Open | undefined;

  function build(definition: AnyServiceDefinition): Built {
    if (!open) {
      throw new errors.IncorrectUsageError({
        message: `${definition.name} was used while ${name} cannot build services. A service is built on first use, from the point in the start sequence where building is safe until the application stops.`,
      });
    }
    const { instances, building } = open;
    const built = instances.get(definition);
    if (built) {
      return built;
    }
    if ((definition.listeners.length > 0 || definition.start) && !registered.has(definition)) {
      throw new errors.IncorrectUsageError({
        message: `${definition.name} declares listeners or a start, but ${name} does not register it. Unregistered, its events are missed until its first use and its start never runs.`,
      });
    }
    if (building.has(definition)) {
      throw new errors.IncorrectUsageError({
        message: `${definition.name} needs itself, directly or through what it needs.`,
      });
    }

    building.add(definition);
    try {
      const needed: Record<string, unknown> = {};
      for (const [key, need] of Object.entries(definition.needs as object)) {
        needed[key] = build(need as AnyServiceDefinition).service;
      }
      const given = { ...needed, foundation } as Given;
      const service: unknown = definition.create(given);
      if (isPromise(service)) {
        // Whoever built it is told; the promise's own failure has nobody waiting for it.
        Promise.resolve(service).catch(() => {});
        throw new errors.IncorrectUsageError({
          message: `${definition.name} is built asynchronously. A service is built synchronously: move what it waits for into its start.`,
        });
      }
      const result = { service, given };
      instances.set(definition, result);
      return result;
    } finally {
      building.delete(definition);
    }
  }

  function listen(current: Open, definition: AnyServiceDefinition) {
    for (const { event, handle } of definition.listeners) {
      current.listening.push(
        // A failed build reaches the event bus as a failed handler would.
        foundation.events.subscribe(event, (...payload: never[]) =>
          handle(build(definition).service, ...payload),
        ),
      );
    }
  }

  return {
    register(definition) {
      if (registered.has(definition)) {
        return;
      }
      registered.add(definition);
      if (open) {
        listen(open, definition);
      }
    },
    open() {
      if (open) {
        return;
      }
      open = { instances: new Map(), building: new Set(), started: [], listening: [] };
      for (const definition of registered) {
        listen(open, definition);
      }
    },
    get isOpen() {
      return open !== undefined;
    },
    get<Service>(definition: ServiceDefinitionOf<Service>): Service {
      return build(definition).service as Service;
    },
    async start(definition) {
      this.register(definition);
      const { service, given } = build(definition);
      const current = open;
      if (!definition.start || !current || current.started.includes(definition)) {
        return;
      }
      // Recorded first, so that a second call made meanwhile does not start it again.
      current.started.push(definition);
      try {
        await definition.start(service, given);
      } catch (error) {
        current.started.splice(current.started.indexOf(definition), 1);
        await definition.stop?.(service);
        throw error;
      }
    },
    async close() {
      const closing = open;
      registered.clear();
      if (!closing) {
        return;
      }
      open = undefined;
      for (const unsubscribe of closing.listening) {
        unsubscribe();
      }
      for (const definition of closing.started.reverse()) {
        try {
          await definition.stop?.(closing.instances.get(definition)?.service);
        } catch (error) {
          foundation.logger.error(error);
        }
      }
    },
  };
}
