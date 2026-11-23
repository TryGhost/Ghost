import type { Services } from '#foundry/services';
import type { Given, ServiceNeeds } from '#kernel/define-service';

/** The instance of each service an endpoints module needs, read when it is used. */
export type Handed<Needs extends ServiceNeeds> = Omit<Given<Needs>, 'foundation'>;

/**
 * An endpoints module that is handed its services: the service definitions it needs, and the
 * controller built around their instances.
 */
export interface Endpoints<Needs extends ServiceNeeds, Controller extends object> {
  readonly needs: Needs;
  readonly controller: (handed: Handed<Needs>) => Controller;
}

/**
 * Declares the services an endpoints module needs and builds its controller around them, so that
 * the module reads no service off a module it imports.
 *
 * `handed` holds no instance. Each property reads the service from the application when it is
 * used, so a method reads `handed.segments` inside its `query` and never keeps it: the service
 * is built on first use and is a new instance after Ghost stops and starts.
 */
export function defineEndpoints<const Needs extends ServiceNeeds, Controller extends object>(
  needs: Needs,
  controller: (handed: Handed<Needs>) => Controller,
): Endpoints<Needs, Controller> {
  return { needs, controller };
}

function isEndpoints(loaded: object): loaded is Endpoints<ServiceNeeds, object> {
  return (
    typeof (loaded as { controller?: unknown }).controller === 'function' &&
    typeof (loaded as { needs?: unknown }).needs === 'object'
  );
}

// One controller for each module, as the API framework keys what it builds by the controller.
const built = new WeakMap<object, object>();

/**
 * Builds the controller of an endpoints module, handing it the services it needs from the
 * application's services. A module that is still a plain controller is returned as it is.
 */
export function withServices<Loaded extends object>(services: Services, loaded: Loaded): object {
  if (!isEndpoints(loaded)) {
    return loaded;
  }
  let controller = built.get(loaded);
  if (!controller) {
    const handed = {};
    for (const [name, definition] of Object.entries(loaded.needs)) {
      Object.defineProperty(handed, name, {
        enumerable: true,
        get: () => services.get(definition),
      });
    }
    controller = loaded.controller(handed as Handed<ServiceNeeds>);
    built.set(loaded, controller);
  }
  return controller;
}
