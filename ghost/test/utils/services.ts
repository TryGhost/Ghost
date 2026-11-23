import type { Services } from '#foundry/services';
import type { AnyServiceDefinition } from '#kernel/define-service';

// Required, not imported: an `import` of the application gives this file an application of its
// own, with its own services, and a root's `.service` asks the one the server code requires.
const application: typeof import('../../bootstrap/app').default =
  require('../../bootstrap/app').default;
const {
  listening,
  background,
}: typeof import('../../bootstrap/services') = require('../../bootstrap/services');

/**
 * The services of Ghost's application, for a test that uses a service root without booting
 * Ghost.
 */
export const services: Services = application.services;

/**
 * What boot does once settings are loaded: tells the application about the roots that declare
 * listeners or a `start`, and lets services be built. A unit test that reads a root's `.service` without booting Ghost calls this
 * first. The unit setup closes the services after every test, which forgets each instance the
 * test built, so a test never sees a service another test built:
 *
 *     beforeEach(() => openServices());
 *
 * A test that loads a fresh copy of a root which declares listeners or a `start` passes it, as
 * the application only knows the copy it was told about.
 *
 * Two things to know. A test must `require` a root, not `import` it: an imported copy asks a
 * different application than the one opened here. And a root that another root names in `needs`
 * is built through its `create`, so a test replaces that with `sinon.stub(root, 'create')`;
 * stubbing its `.service` getter only changes what direct readers of the getter see.
 */
export function openServices(...roots: AnyServiceDefinition[]): void {
  // Boot registers the listening roots, and starting a background root registers it.
  for (const named of [...listening, ...background]) {
    services.register(named());
  }
  for (const root of roots) {
    services.register(root);
  }
  services.open();
}

/**
 * What boot does with a root it starts: builds it and runs its `start`. Services must be open.
 */
export async function startAsBoot(root: AnyServiceDefinition): Promise<void> {
  await services.start(root);
}
