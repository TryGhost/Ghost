import {DevEnvironmentManager} from './dev-environment-manager';
import {EnvironmentManager} from './environment-manager';
import {getImageProfile} from './constants';
import {isDevEnvironmentAvailable} from './service-availability';

// Cached manager instance (one per worker process)
let cachedManager: EnvironmentManager | DevEnvironmentManager | null = null;

/**
 * Get the environment manager for this worker.
 * Creates and caches a manager on first call, returns cached instance thereafter.
 *
 * Priority: GHOST_E2E_IMAGE > dev environment detection > default container mode
 */
export async function getEnvironmentManager(): Promise<EnvironmentManager | DevEnvironmentManager> {
    if (!cachedManager) {
        // Check for dev environment first (unless an explicit image was provided)
        if (!process.env.GHOST_E2E_IMAGE) {
            const useDevEnv = await isDevEnvironmentAvailable();
            if (useDevEnv) {
                cachedManager = new DevEnvironmentManager();
                return cachedManager;
            }
        }

        // Container mode: use profile from env vars
        const profile = getImageProfile();
        cachedManager = new EnvironmentManager(profile);
    }
    return cachedManager;
}
