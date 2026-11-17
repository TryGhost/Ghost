import { IncorrectUsageError } from '@tryghost/errors';
import type { Logger } from '../logging';
import {
  definitionKind,
  type DefinitionKind,
  type DomainDefinition,
  type JobDefinition,
  type ListenerDefinition,
  type RouteDefinition,
} from './definitions';
import {
  defaultExport,
  type DomainFile,
  type DomainFileKind,
  type DomainManifest,
} from './discover';

/**
 * Starts what discovery found. This file holds no state of its own and knows
 * nothing about Ghost: the foundation, the event bus, the job scheduler and the
 * logger are passed in.
 *
 * Start order:
 *   1. start()  each domain's blocking service roots, then its listeners.
 *               Domains start together, so none can rely on another's order.
 *   2. ready()  after Ghost is ready: roots that do not block boot, then jobs.
 */

interface StartableRoot {
  init(dependencies: unknown): Promise<void>;
  stop(): Promise<void>;
  readonly startAfter: readonly string[];
  readonly blocking: boolean;
}

export interface DomainLayerDependencies {
  readonly manifest: DomainManifest;
  /**
   * The application's foundation. Each domain's boot.ts receives it; a domain
   * without one hands it to its roots unchanged.
   */
  readonly foundation?: unknown;
  /** Subscribes a handler to the event with this name, for the life of the process. */
  readonly subscribe: (
    event: { readonly name: string },
    handler: (event: unknown) => unknown,
  ) => void;
  /** Schedules a job. Called once per job each time Ghost becomes ready. */
  readonly schedule: (job: ScheduledJob) => void;
  readonly logging: Pick<Logger, 'error'>;
}

export interface ScheduledJob extends JobDefinition {
  /** `<domain>/<job name>`. */
  readonly name: string;
}

export interface DomainRoute extends RouteDefinition {
  readonly domain: string;
  /** Absolute path of the handler's file, without an extension. */
  readonly handlerModule: string;
  /** The member of that file the route names. */
  readonly handlerMember: string;
  /** Loads the handler's file on first call and returns the named member. */
  loadHandler(): unknown;
}

export interface DomainFragment<Value> {
  readonly domain: string;
  readonly value: Value;
}

function fail(message: string): never {
  throw new IncorrectUsageError({ message });
}

function definition<Value>(file: DomainFile, expected: DefinitionKind): Value {
  const value = defaultExport(file);
  if (definitionKind(value) !== expected) {
    fail(`${file.id} must default-export a ${expected} definition.`);
  }
  return value as Value;
}

function serviceRoot(file: DomainFile): StartableRoot {
  const root = defaultExport(file) as Partial<StartableRoot> | undefined;
  if (typeof root?.init !== 'function' || typeof root.stop !== 'function') {
    fail(`${file.id} must default-export a defineService root.`);
  }
  return root as StartableRoot;
}

// Roots in an order where each comes after the ones it names.
function inStartOrder(domain: string, roots: Map<string, StartableRoot>) {
  const ordered: string[] = [];
  const visiting = new Set<string>();
  const visit = (name: string, from?: string) => {
    if (ordered.includes(name)) {
      return;
    }
    const root = roots.get(name);
    if (!root) {
      fail(
        `${domain}: ${from} starts after ${name}, which is not a service root in the same domain. ` +
          'Reach another domain through its actions when the work is done, not through start order.',
      );
    }
    if (visiting.has(name)) {
      fail(`${domain}: service roots start after each other in a cycle through ${name}.`);
    }
    visiting.add(name);
    for (const dependency of root.startAfter) {
      visit(dependency, name);
    }
    visiting.delete(name);
    ordered.push(name);
  };
  for (const name of [...roots.keys()].sort()) {
    visit(name);
  }
  return ordered;
}

export type FragmentKind = 'settings' | 'permissions' | 'schema';

/**
 * Every domain's fragment of one kind, in domain order, for a central registry
 * to merge. It needs only the manifest, so a registry that loads before
 * anything has started can call it.
 */
export function collectFragments<Value>(
  manifest: DomainManifest,
  fragment: FragmentKind,
): DomainFragment<Value>[] {
  return manifest.files
    .filter((file) => file.kind === fragment)
    .map((file) => ({ domain: file.domain, value: definition<Value>(file, fragment) }));
}

/** Every domain's routes for one surface. The routes files are loaded; handlers are not. */
export function collectRoutes(manifest: DomainManifest, surface: string): DomainRoute[] {
  return manifest.files
    .filter((file) => file.kind === 'routes')
    .flatMap((file) => {
      const { routes } = definition<{ routes: RouteDefinition[] }>(file, 'routes');
      return routes
        .filter((route) => route.surface === surface)
        .map((route) => {
          const [handlerFile, handlerMember] = route.handler.split('#') as [string, string];
          const handlerModule = `${file.module.slice(0, -'routes'.length)}${handlerFile}`;
          let loaded: { readonly value: unknown } | undefined;
          return {
            ...route,
            domain: file.domain,
            handlerModule,
            handlerMember,
            loadHandler() {
              if (!loaded) {
                const exports = manifest.load(handlerModule) as Record<string, unknown> & {
                  default?: Record<string, unknown>;
                };
                const value = exports[handlerMember] ?? exports.default?.[handlerMember];
                if (value === undefined) {
                  fail(`${file.id}: ${route.handler} does not exist.`);
                }
                loaded = { value };
              }
              return loaded.value;
            },
          };
        });
    });
}

export function createDomainLayer({
  manifest,
  foundation,
  subscribe,
  schedule,
  logging,
}: DomainLayerDependencies) {
  const filesOf = (kind: DomainFileKind, domain?: string) =>
    manifest.files.filter((file) => file.kind === kind && (!domain || file.domain === domain));

  // Listeners stay subscribed for the life of the process, because the event bus
  // cannot unsubscribe. `active` makes stop() and a later start() behave.
  let active = false;
  const subscribed = new Set<string>();
  const started: StartableRoot[] = [];
  const supplied = new Map<string, Promise<unknown>>();

  // What the domain file supplies to its roots, built once per process.
  function dependenciesOf(domain: string) {
    let dependencies = supplied.get(domain);
    if (!dependencies) {
      const [file] = filesOf('domain', domain);
      const build = file
        ? definition<DomainDefinition<unknown, unknown>>(file, 'domain').dependencies
        : undefined;
      // The domain file is handed the foundation; without one, the roots are.
      dependencies = Promise.resolve().then(() => (build ? build(foundation) : foundation));
      supplied.set(domain, dependencies);
    }
    return dependencies;
  }

  function rootsOf(domain: string) {
    return new Map(filesOf('service', domain).map((file) => [file.name, serviceRoot(file)]));
  }

  async function startRoots(domain: string, blocking: boolean) {
    const roots = rootsOf(domain);
    for (const name of inStartOrder(domain, roots)) {
      const root = roots.get(name)!;
      if (blocking && root.blocking) {
        const late = root.startAfter.find((dependency) => !roots.get(dependency)!.blocking);
        if (late !== undefined) {
          fail(`${domain}: ${name} blocks boot but starts after ${late}, which does not.`);
        }
      }
      if (root.blocking === blocking) {
        await root.init(await dependenciesOf(domain));
        started.push(root);
      }
    }
  }

  function subscribeListeners(domain: string) {
    for (const file of filesOf('listener', domain)) {
      if (subscribed.has(file.id)) {
        continue;
      }
      const listener = definition<ListenerDefinition>(file, 'listener');
      const event = typeof listener.event === 'string' ? { name: listener.event } : listener.event;
      subscribe(event, (payload) => (active ? listener.handle(payload) : undefined));
      subscribed.add(file.id);
    }
  }

  return {
    manifest,

    /** Starts every domain's blocking roots and subscribes its listeners. Boot awaits this. */
    async start() {
      await Promise.all(
        manifest.domains.map(async (domain) => {
          await startRoots(domain, true);
          subscribeListeners(domain);
        }),
      );
      active = true;
    },

    /**
     * Starts the roots that do not block boot and schedules the jobs. Call it
     * once Ghost is ready and do not await it for boot's sake: a failure here is
     * logged, not thrown.
     *
     * @param options.jobs - False to schedule nothing, for a process that runs no
     * background work, such as one under test.
     */
    async ready({ jobs = true }: { jobs?: boolean } = {}) {
      await Promise.all(
        manifest.domains.map(async (domain) => {
          try {
            await startRoots(domain, false);
          } catch (error) {
            logging.error(`[domains] ${domain} failed to start a non-blocking service`, error);
          }
        }),
      );
      for (const file of jobs ? filesOf('job') : []) {
        try {
          const job = definition<JobDefinition>(file, 'job');
          schedule({ ...job, name: `${file.domain}/${file.name}` });
        } catch (error) {
          logging.error(`[domains] could not schedule ${file.id}`, error);
        }
      }
    },

    /** Stops what start() and ready() started, in reverse order. */
    async stop() {
      active = false;
      for (const root of started.splice(0).reverse()) {
        await root.stop();
      }
    },

    /** Every domain's routes for one surface. The routes file is loaded; handlers are not. */
    routes: (surface: string) => collectRoutes(manifest, surface),

    /** Every domain's fragment of one kind, in domain order, for a central registry to merge. */
    fragments: <Value>(fragment: FragmentKind) => collectFragments<Value>(manifest, fragment),
  };
}

export type DomainLayer = ReturnType<typeof createDomainLayer>;
