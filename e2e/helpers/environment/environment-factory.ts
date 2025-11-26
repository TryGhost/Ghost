import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import {DEV_ENVIRONMENT} from './constants';
import {DevEnvironmentManager} from './dev-environment-manager';
import {EnvironmentManager} from './environment-manager';

const debug = baseDebug('e2e:EnvironmentFactory');

// Cached manager instance (one per worker process)
let cachedManager: EnvironmentManager | DevEnvironmentManager | null = null;

/**
 * Check if the dev environment (yarn dev) is running.
 * Detects by checking for the ghost_dev network and running MySQL container.
 */
export async function isDevEnvironmentAvailable(): Promise<boolean> {
    const docker = new Docker();

    try {
        const networks = await docker.listNetworks({
            filters: {name: [DEV_ENVIRONMENT.networkName]}
        });

        if (networks.length === 0) {
            debug('Dev environment not available: network not found');
            return false;
        }

        debug('Dev environment is available');
        return true;
    } catch (error) {
        debug('Error checking dev environment:', error);
        return false;
    }
}

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

