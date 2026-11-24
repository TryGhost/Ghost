import type { ListenerDeclaration, Provider } from '#support/define-provider';
import type { AnyServiceDefinition, Lifetime, ServiceDefinition } from '#support/define-service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Definition<Service> = ServiceDefinition<Service, any>;

/** A ready-made instance to use for a definition instead of building it. */
export type Instance = readonly [definition: AnyServiceDefinition, instance: unknown];

export function instance<Service>(definition: Definition<Service>, value: Service): Instance {
  return [definition, value];
}

export interface Scope {
  readonly lifetime: Lifetime;
  /** Returns the scope's instance of a service, building it on first use. */
  get<Service>(definition: Definition<Service>): Service;
  /** Unsubscribes the scope's listeners and drops its instances. */
  dispose(): void;
}

export interface Application extends Scope {
  /** Checks every declaration, then allows services to be built. Builds nothing itself. */
  boot(): void;
  /** Opens a scope for one site. Site-lifetime services are built once per scope. */
  createSiteScope(options?: { readonly instances?: readonly Instance[] }): Scope;
}

export class ApplicationError extends Error {
  override name = 'ApplicationError';
}

// A service may need only services that live at least as long as it does.
const RANK: Record<Lifetime, number> = { process: 0, site: 1 };

function outlives(a: Lifetime, b: Lifetime): boolean {
  return RANK[a] <= RANK[b];
}

/** Rejects declarations that could not work, before anything is built. */
function validate(providers: readonly Provider[]): void {
  const names = new Map<string, AnyServiceDefinition>();
  const done = new Set<AnyServiceDefinition>();
  const path: AnyServiceDefinition[] = [];

  function visit(definition: AnyServiceDefinition): void {
    if (done.has(definition)) {
      return;
    }
    if (path.includes(definition)) {
      const cycle = [...path.slice(path.indexOf(definition)), definition];
      throw new ApplicationError(
        `Services need each other in a circle: ${cycle.map((entry) => entry.name).join(' → ')}.`,
      );
    }
    const sameName = names.get(definition.name);
    if (sameName !== undefined && sameName !== definition) {
      throw new ApplicationError(`Two different services are both named "${definition.name}".`);
    }
    names.set(definition.name, definition);

    path.push(definition);
    for (const [key, need] of Object.entries<AnyServiceDefinition>(definition.needs)) {
      if (!outlives(need.lifetime, definition.lifetime)) {
        throw new ApplicationError(
          `"${definition.name}" lives for the ${definition.lifetime} but needs "${need.name}" (as ${key}), ` +
            `which lives only for one ${need.lifetime}. It would keep one ${need.lifetime}'s instance for all of them.`,
        );
      }
      visit(need);
    }
    path.pop();
    done.add(definition);
  }

  for (const provider of providers) {
    for (const definition of [...provider.services, ...provider.actions]) {
      visit(definition);
    }
    for (const listener of provider.listeners) {
      visit(listener.bus);
      visit(listener.service);
      if (!outlives(listener.service.lifetime, listener.bus.lifetime)) {
        throw new ApplicationError(
          `"${provider.name}" listens for "${listener.event}" on "${listener.bus.name}", which is shared by the whole ` +
            `${listener.bus.lifetime}, with "${listener.service.name}", which exists once per ${listener.service.lifetime}. ` +
            `Every ${listener.service.lifetime} would react to the same event.`,
        );
      }
    }
  }
}

class ServiceScope implements Scope {
  readonly lifetime: Lifetime;
  readonly #parent: ServiceScope | undefined;
  readonly #instances = new Map<AnyServiceDefinition, unknown>();
  readonly #unsubscribe: (() => void)[] = [];
  #open = true;

  constructor(
    lifetime: Lifetime,
    parent: ServiceScope | undefined,
    instances: readonly Instance[],
  ) {
    this.lifetime = lifetime;
    this.#parent = parent;
    for (const [definition, value] of instances) {
      if (definition.lifetime !== lifetime) {
        throw new ApplicationError(
          `"${definition.name}" lives for the ${definition.lifetime}, so a ${lifetime} scope cannot be given its instance.`,
        );
      }
      this.#instances.set(definition, value);
    }
  }

  get<Service>(definition: Definition<Service>): Service {
    if (!this.#open) {
      throw new ApplicationError(`"${definition.name}" was asked for from a scope that has ended.`);
    }
    if (definition.lifetime !== this.lifetime) {
      if (this.#parent !== undefined && outlives(definition.lifetime, this.lifetime)) {
        return this.#parent.get(definition);
      }
      throw new ApplicationError(
        `"${definition.name}" exists once per ${definition.lifetime}. Ask a ${definition.lifetime} scope for it.`,
      );
    }
    if (this.#instances.has(definition)) {
      return this.#instances.get(definition) as Service;
    }
    const needs: Record<string, unknown> = {};
    for (const [key, need] of Object.entries<AnyServiceDefinition>(definition.needs)) {
      needs[key] = this.get(need);
    }
    const built = definition.create(needs) as Service;
    this.#instances.set(definition, built);
    return built;
  }

  /** Subscribes the listeners whose bus lives in this scope. The listening service is built by its first event. */
  listen(listeners: readonly ListenerDeclaration[]): void {
    try {
      for (const listener of listeners) {
        if (listener.bus.lifetime !== this.lifetime) {
          continue;
        }
        const bus = this.get(listener.bus);
        const handler = (...args: unknown[]) =>
          listener.handle(this.get(listener.service), ...args);
        // Recorded first, so a subscription that throws part-way is still removed.
        this.#unsubscribe.push(() => bus.removeListener(listener.event, handler));
        bus.on(listener.event, handler);
      }
    } catch (error) {
      this.#stopListening();
      throw error;
    }
  }

  #stopListening(): void {
    for (const unsubscribe of this.#unsubscribe.splice(0)) {
      unsubscribe();
    }
  }

  dispose(): void {
    this.#stopListening();
    this.#instances.clear();
    this.#open = false;
  }
}

export function createApplication(options: {
  readonly providers: readonly Provider[];
  readonly instances?: readonly Instance[];
}): Application {
  const providers = [...options.providers];
  const listeners = providers.flatMap((provider) => provider.listeners);
  const root = new ServiceScope('process', undefined, options.instances ?? []);
  const sites = new Set<ServiceScope>();
  let booted = false;

  function assertBooted(): void {
    if (!booted) {
      throw new ApplicationError('The application was used before boot().');
    }
  }

  return {
    lifetime: 'process',
    boot() {
      if (booted) {
        return;
      }
      validate(providers);
      root.listen(listeners);
      booted = true;
    },
    get(definition) {
      assertBooted();
      return root.get(definition);
    },
    createSiteScope({ instances = [] } = {}) {
      assertBooted();
      const site = new ServiceScope('site', root, instances);
      site.listen(listeners);
      sites.add(site);
      return {
        lifetime: 'site',
        get: (definition) => site.get(definition),
        dispose() {
          site.dispose();
          sites.delete(site);
        },
      };
    },
    dispose() {
      for (const site of sites) {
        site.dispose();
      }
      sites.clear();
      root.dispose();
    },
  };
}
