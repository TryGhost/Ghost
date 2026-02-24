import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import {DEV_ENVIRONMENT, TINYBIRD} from './constants';

const debug = baseDebug('e2e:ServiceAvailability');

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
/**
 * Check if Tinybird is running.
 * Checks for tinybird-local service in ghost-dev compose project.
 */
export async function isTinybirdAvailable(): Promise<boolean> {
    const docker = new Docker();
    const tinybirdAvailable = await isServiceAvailable(docker, TINYBIRD.LOCAL_HOST);
    debug(`Tinybird availability for compose project ${DEV_ENVIRONMENT.projectNamespace}:`, tinybirdAvailable);
    return tinybirdAvailable;
}
