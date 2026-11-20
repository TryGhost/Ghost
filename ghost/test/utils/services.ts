import type { Services } from '@tryghost/foundry/services';
import type { ServiceDefinition } from '@tryghost/kernel/define-service';

// Required, not imported: an `import` of the application gives this file an
// application of its own, with its own services.
const application: typeof import('../../bootstrap/app').default =
  require('../../bootstrap/app').default;

/**
 * The services of Ghost's application, for a unit test that uses a service
 * definition without booting Ghost.
 */
export const services: Services = application.services;

/**
 * What the start sequence does when it reaches the services step: attaches
 * the listeners of the declared definitions and lets services be built. A
 * unit test that reads a service without booting Ghost calls this, and closes
 * the services when it is done, which forgets every instance the test built:
 *
 *     beforeEach(() => openServices());
 *     afterEach(() => services.close());
 */
export function openServices(): void {
  for (const declared of application.steps.services?.declared ?? []) {
    services.register(declared.load());
  }
  services.open();
}

/**
 * What the start sequence does with a definition that the services list
 * names: attaches its listeners, builds it and runs its `start`.
 */
export async function startAsBoot(definition: ServiceDefinition<any, any>): Promise<void> {
  services.register(definition);
  await services.start(definition);
}
