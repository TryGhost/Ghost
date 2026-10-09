import { IncorrectUsageError } from '@tryghost/errors';

/** Creates one ready instance during boot. The factory owns cleanup if startup fails. */
export function defineService<Service>(name: string, create: () => Service | Promise<Service>) {
  let instance: Service | undefined;
  let initialization: Promise<void> | undefined;

  async function createAndPublish(): Promise<void> {
    instance = await create();
  }

  return {
    init(): Promise<void> {
      initialization ??= createAndPublish().catch((error) => {
        initialization = undefined;
        throw error;
      });
      return initialization;
    },
    getInstance(): Service {
      if (instance === undefined) {
        throw new IncorrectUsageError({
          message: `${name} used before init(). Call init() from boot first.`,
        });
      }
      return instance;
    },
  };
}
