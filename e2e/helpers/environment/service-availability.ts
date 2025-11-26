import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import {DEV_ENVIRONMENT, TINYBIRD} from './constants';

const debug = baseDebug('e2e:ServiceAvailability');

/**
 * Find running Tinybird containers for a specific Docker Compose project.
 */
async function isServiceAvailable(docker: Docker, serviceName: string) {
    const containers = await docker.listContainers({
        filters: {
            label: [
                `com.docker.compose.service=${serviceName}`,
                `com.docker.compose.project=${DEV_ENVIRONMENT.projectNamespace}`
            ],
            status: ['running']
        }
    });
    return containers.length > 0;
}

export async function isDevNetworkAvailable(docker: Docker): Promise<boolean> {
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
 * Check if the dev environment (yarn dev) is running.
 * Detects by checking for the ghost_dev network and running MySQL container.
 */
export async function isDevEnvironmentAvailable(): Promise<boolean> {
    const docker = new Docker();

    if (!await isDevNetworkAvailable(docker)) {
        debug('Dev environment not available: network not found');
        return false;
    }

    if (!await isServiceAvailable(docker, 'mysql')) {
        debug('Dev environment not available: MySQL container not running');
        return false;
    }

    if (!await isServiceAvailable(docker, 'redis')) {
        debug('Dev environment not available: Redis container not running');
        return false;
    }

    if (!await isServiceAvailable(docker, 'mailpit')) {
        debug('Dev environment not available: Mailpit container not running');
        return false;
    }

    return true;
}

// Cache availability checks per process
const tinybirdAvailable: boolean | null = null;

/**
 * Check if Tinybird is running.
 * Checks for tinybird-local service in ghost-dev compose project.
 */
export async function isTinybirdAvailable(): Promise<boolean> {
    if (tinybirdAvailable !== null) {
        return tinybirdAvailable;
    }

    const docker = new Docker();
    return isServiceAvailable(docker, TINYBIRD.LOCAL_HOST);
}
