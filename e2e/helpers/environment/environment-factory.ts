import {DevEnvironmentManager} from './dev-environment-manager';
import {EnvironmentManager} from './environment-manager';
import {isDevEnvironmentAvailable} from './service-availability';

// Cached manager instance (one per worker process)
let cachedManager: EnvironmentManager | DevEnvironmentManager | null = null;

/**
 * Get the environment manager for this worker.
 * Creates and caches a manager on first call, returns cached instance thereafter.
 */
export async function getEnvironmentManager(): Promise<EnvironmentManager | DevEnvironmentManager> {
    if (!cachedManager) {
        const useDevEnv = await isDevEnvironmentAvailable();
        cachedManager = useDevEnv ? new DevEnvironmentManager() : new EnvironmentManager();
    }
    return cachedManager;
}

