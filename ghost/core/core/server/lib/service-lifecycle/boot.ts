import errors from '@tryghost/errors';
import type { ServiceLifecycle } from './index';

type CleanupOwner = {
  registerCleanupTask(task: () => Promise<void>, label?: string): void;
};

/** Initializes a root and registers cleanup only when the root owns resources. */
export async function initializeService(
  root: ServiceLifecycle<object>,
  owner?: CleanupOwner,
): Promise<void> {
  if (root.shutdown) {
    if (!owner) {
      throw new errors.IncorrectUsageError({
        message: 'A service with shutdown requires a cleanup owner.',
      });
    }
    const shutdown = root.shutdown.bind(root);
    let cleanup: Promise<void> | undefined;
    // A repeated stop from this owner must not shut down a later initialization.
    owner.registerCleanupTask(() => (cleanup ??= Promise.resolve().then(shutdown)));
  }
  await root.init();
}
