import { IncorrectUsageError } from '@tryghost/errors';

/**
 * Provides init() and a .service getter for one application-owned instance.
 *
 * @param name - Service name used when reporting access before initialization.
 * @param create - Returns a fully initialized instance, synchronously or asynchronously.
 * If startup fails, this callback must release any resources it acquired before
 * throwing or rejecting. defineService allows retries but cannot perform that cleanup.
 * @see [Service initialization](./README.md#service-initialization)
 */
export function defineService<Service>(name: string, create: () => Service | Promise<Service>) {
  let instance: Service | undefined;
  let initialization: Promise<void> | undefined;

  async function createService(): Promise<void> {
    instance = await create();
  }

  return {
    init(): Promise<void> {
      initialization ??= createService().catch((error) => {
        initialization = undefined;
        throw error;
      });
      return initialization;
    },
    get service(): Service {
      if (instance === undefined) {
        throw new IncorrectUsageError({
          message: `${name} used before init(). Call init() from boot first.`,
        });
      }
      return instance;
    },
  };
}
