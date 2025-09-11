import Docker from 'dockerode';
import type {Container} from 'dockerode';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';
import {execSync} from 'child_process';

const debug = baseDebug('e2e:DockerCompose');

export class DockerCompose {
    private readonly composeFilePath: string;
    private readonly projectName: string;
    private readonly docker: Docker;

    constructor(options: {composeFilePath: string; projectName: string; docker: Docker}) {
        this.composeFilePath = options.composeFilePath;
        this.projectName = options.projectName;
        this.docker = options.docker;
    }

    /**
     * Bring up services and wait for specific one-shot services to complete.
     */
    upAndWaitFor(servicesToWait: string[] = []): void {
        try {
            logging.info('Starting docker compose services...');
            execSync(`docker compose -f ${this.composeFilePath} up -d`, {stdio: 'inherit'});
            if (servicesToWait.length > 0) {
                // NOTE: `docker compose up -d --wait` will fail if one-shot services are included
                execSync(`docker compose -f ${this.composeFilePath} wait ${servicesToWait.join(' ')}`);
            }
            logging.info('Docker compose services are up');
        } catch (error) {
            logging.error('Failed to start docker compose services:', error);
            throw error;
        }
    }

    /**
     * Stop and remove all services for the project (including volumes).
     */
    down(): void {
        try {
            execSync(`docker compose -f ${this.composeFilePath} down -v`, {stdio: 'inherit'});
        } catch (error) {
            logging.error('Failed to stop docker compose services:', error);
            throw error;
        }
    }

    /**
     * Read a file from a service container using `docker compose run`.
     */
    readFileFromService(service: string, filePath: string): string {
        const cmd = `docker compose -f ${this.composeFilePath} run --rm -T --entrypoint sh ${service} -c "cat ${filePath}"`;
        debug('readFileFromService running:', cmd);
        const output = execSync(cmd, {encoding: 'utf-8'}).toString();
        return output;
    }

    /**
     * Find the container for a compose service by label.
     */
    async getContainerForService(service: string): Promise<Container> {
        debug('getContainerForService called for service:', service);
        const containers = await this.docker.listContainers({
            all: true,
            filters: {
                label: [
                    `com.docker.compose.project=${this.projectName}`,
                    `com.docker.compose.service=${service}`
                ]
            }
        });
        if (containers.length === 0) {
            throw new Error(`No container found for service: ${service}`);
        }
        if (containers.length > 1) {
            throw new Error(`Multiple containers found for service: ${service}`);
        }
        const container = this.docker.getContainer(containers[0].Id);
        debug('getContainerForService returning container:', container.id);
        return container;
    }

    /**
     * Get the Docker network for the compose project.
     */
    async getNetwork(): Promise<Docker.Network> {
        debug('getNetwork called');
        const networks = await this.docker.listNetworks({
            filters: {label: [`com.docker.compose.project=${this.projectName}`]}
        });
        debug('getNetwork found networks:', networks.map(n => n.Id));
        if (networks.length === 0) {
            throw new Error('No Docker network found for the Compose project');
        }
        if (networks.length > 1) {
            throw new Error('Multiple Docker networks found for the Compose project');
        }
        const networkId = networks[0].Id;
        debug('getNetwork returning network ID:', networkId);
        const network = this.docker.getNetwork(networkId);
        debug('getNetwork returning network:', network.id);
        return network;
    }
}

