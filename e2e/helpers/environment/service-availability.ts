import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import {DOCKER_COMPOSE_CONFIG, TINYBIRD} from './constants';

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
        const containers = (await Promise.all([
            findTinybirdContainers(docker, DOCKER_COMPOSE_CONFIG.PROJECT),
            findTinybirdContainers(docker, 'ghost-dev')
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

/**
 * Check if we're running in CI environment.
 */
export function isCI(): boolean {
    return process.env.CI === 'true';
}

/**
 * Determine if analytics tests should be skipped.
 * Returns true if Tinybird is not available AND we're not in CI.
 * In CI, we want tests to fail if Tinybird isn't available.
 */
export async function shouldSkipAnalyticsTests(): Promise<boolean> {
    if (isCI()) {
        // In CI, never skip - let tests fail if Tinybird isn't available
        return false;
    }

    const available = await isTinybirdAvailable();
    if (!available) {
        debug('Skipping analytics tests: Tinybird not available (non-CI)');
        return true;
    }

    return false;
}

