import { IncorrectUsageError } from '@tryghost/errors';

interface ServiceRoot<Service> {
  readonly init: () => Promise<void>;
  readonly service: Service;
}

/**
 * Provides init() and a .service getter for one application-owned instance.
 *
 * @param name - Service name used when reporting access before initialization.
 * @param create - Returns a fully initialized instance, synchronously or asynchronously.
 * If startup fails, this callback must release any resources it acquired before
 * throwing or rejecting. defineService allows retries but cannot perform that cleanup.
 * An optional extras object groups transitional helpers without invoking them.
 * @see [Service initialization](./README.md#service-initialization)
 */
export function defineService<Service>(
  name: string,
  create: () => Service | Promise<Service>,
): ServiceRoot<Service>;
export function defineService<Service, Extras extends object>(
  name: string,
  create: () => Service | Promise<Service>,
  extras: Extras,
): ServiceRoot<Service> & { readonly extras: Extras };
export function defineService<Service, Extras extends object>(
  name: string,
  create: () => Service | Promise<Service>,
  extras?: Extras,
) {
  let instance: Service | undefined;
  let initialization: Promise<void> | undefined;

  async function createService(): Promise<void> {
    instance = await create();
  }

  const root = {
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

  return extras === undefined ? root : Object.assign(root, { extras });
}
