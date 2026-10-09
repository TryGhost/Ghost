import { IncorrectUsageError } from '@tryghost/errors';

/** Creates one ready instance during boot. The factory owns cleanup if startup fails. */
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
