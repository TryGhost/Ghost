import baseDebug from '@tryghost/debug';
import logging from '@tryghost/logging';
import {DockerCompose} from '../DockerCompose';

const debug = baseDebug('e2e:PortalManager');

export class PortalManager {
    private readonly dockerCompose: DockerCompose;

    constructor(dockerCompose: DockerCompose,private readonly port: number) {
        this.dockerCompose = dockerCompose;
    }

    async getUrl(): Promise<string> {
        try {
            const hostPort = await this.dockerCompose.getHostPortForService('portal', this.port);
            const portalUrl = `http://localhost:${hostPort}/portal.min.js`;

            debug(`Portal is available at: ${portalUrl}`);
            return portalUrl;
        } catch (error) {
            logging.error('Failed to get Portal URL:', error);
            throw new Error(`Failed to get portal URL: ${error}. Ensure portal service is running.`);
        }
    }
}
