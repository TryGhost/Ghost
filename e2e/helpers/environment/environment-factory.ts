import {EnvironmentManager} from './environment-manager';

// Cached manager instance (one per worker process)
let cachedManager: EnvironmentManager | null = null;

/**
 * Get the environment manager for this worker.
 * Creates and caches a manager on first call, returns cached instance thereafter.
 */
export async function getEnvironmentManager(): Promise<EnvironmentManager> {
    if (!cachedManager) {
        cachedManager = new EnvironmentManager();
    }
    return cachedManager;
}
