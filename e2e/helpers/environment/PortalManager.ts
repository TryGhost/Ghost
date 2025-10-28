import logging from '@tryghost/logging';
import {DockerCompose} from './DockerCompose';
import baseDebug from '@tryghost/debug';

const debug = baseDebug('e2e:PortalManager');

export class PortalManager {
    private readonly dockerCompose: DockerCompose;

    constructor(dockerCompose: DockerCompose) {
        this.dockerCompose = dockerCompose;
    }

    async getUrl(): Promise<string> {
        try {
            const hostPort = await this.dockerCompose.getHostPortForService('portal', '4175');
            const portalUrl = `http://localhost:${hostPort}/portal.min.js`;

            debug(`Portal is available at: ${portalUrl}`);
            return portalUrl;
        } catch (error) {
            logging.error('Failed to get Portal URL:', error);
            throw new Error(`Failed to get portal URL: ${error}. Ensure portal service is running.`);
        }
    }
}
