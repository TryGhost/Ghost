import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import {TINYBIRD} from './constants';

const debug = baseDebug('e2e:ServiceAvailability');

// Cache availability checks per process
let tinybirdAvailable: boolean | null = null;

/**
 * Check if Tinybird is running and healthy.
 * Checks for tinybird-local container in either ghost-e2e or ghost-dev network.
 */
export async function isTinybirdAvailable(): Promise<boolean> {
    if (tinybirdAvailable !== null) {
        return tinybirdAvailable;
    }

    const docker = new Docker();

    try {
        const containers = await docker.listContainers({
            filters: {
                name: [TINYBIRD.LOCAL_HOST],
                status: ['running']
            }
        });

        if (containers.length === 0) {
            debug('Tinybird not available: container not running');
            tinybirdAvailable = false;
            return false;
        }

        // Check if healthy
        const container = containers[0];
        if (!container.Status.includes('healthy')) {
            debug('Tinybird not available: container not healthy');
            tinybirdAvailable = false;
            return false;
        }

        debug('Tinybird is available');
        tinybirdAvailable = true;
        return true;
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


