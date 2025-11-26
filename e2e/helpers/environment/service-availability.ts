import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import {DEV_ENVIRONMENT, DOCKER_COMPOSE_CONFIG, TINYBIRD} from './constants';

const debug = baseDebug('e2e:ServiceAvailability');

// Cache availability checks per process
let tinybirdAvailable: boolean | null = null;

/**
 * Find running Tinybird containers for a specific Docker Compose project.
 */
async function findTinybirdContainers(docker: Docker, projectName: string) {
    return docker.listContainers({
        filters: {
            label: [
                `com.docker.compose.service=${TINYBIRD.LOCAL_HOST}`,
                `com.docker.compose.project=${projectName}`
            ],
            status: ['running']
        }
    });
}

/**
 * Check if Tinybird is running.
 * Checks for tinybird-local service in either ghost-e2e or ghost-dev compose project.
 */
export async function isTinybirdAvailable(): Promise<boolean> {
    if (tinybirdAvailable !== null) {
        return tinybirdAvailable;
    }

    const docker = new Docker();

    try {
        // TODO: Remove DOCKER_COMPOSE_CONFIG.PROJECT fallback when no longer needed
        const containers = (await Promise.all([
            findTinybirdContainers(docker, DEV_ENVIRONMENT.projectNamespace),
            findTinybirdContainers(docker, DOCKER_COMPOSE_CONFIG.PROJECT)
        ])).flat();

        tinybirdAvailable = containers.length > 0;
        if (tinybirdAvailable) {
            debug('Tinybird is available');
        } else {
            debug('Tinybird not available: container not running');
        }

        return tinybirdAvailable;
    } catch (error) {
        debug('Error checking Tinybird availability:', error);
        tinybirdAvailable = false;
        return false;
    }
}
