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

    /** Bring all services up (detached). */
    up(): void {
        try {
            logging.info('Starting docker compose services...');
            execSync(`docker compose -f ${this.composeFilePath} -p ${this.projectName} up -d`, {stdio: 'inherit'});
            logging.info('Docker compose services are up');
        } catch (error) {
            logging.error('Failed to start docker compose services:', error);
            throw error;
        }
    }

    /**
     * Wait until specified services are healthy/completed.
     * - healthyServices: services with healthchecks that should report healthy
     * - completedServices: one-shot services that should exit with code 0
     */
    async waitForServices(healthyServices: string[] = [], completedServices: string[] = [], timeoutMs = 120000): Promise<void> {
        const start = Date.now();
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

        const isHealthy = async (service: string) => {
            try {
                const container = await this.getContainerForService(service);
                const info = await container.inspect();
                const status = info.State?.Health?.Status;
                return status === 'healthy';
            } catch (e) {
                return false;
            }
        };

        const isCompleted = async (service: string) => {
            try {
                const container = await this.getContainerForService(service);
                const info = await container.inspect();
                const state = info.State?.Status;
                if (state === 'exited') {
                    const code = info.State?.ExitCode ?? 1;
                    if (code !== 0) {
                        throw new Error(`${service} exited with code ${code}`);
                    }
                    return true;
                }
                return false;
            } catch (e) {
                // If not found yet, keep waiting
                if ((e as Error).message?.includes('No container found')) {
                    return false;
                }
                throw e;
            }
        };

        while (Date.now() - start < timeoutMs) {
            const healthyStatuses = await Promise.all(healthyServices.map(isHealthy));
            const completedStatuses = await Promise.all(completedServices.map(isCompleted));
            const allHealthy = healthyStatuses.every(Boolean);
            const allCompleted = completedStatuses.every(Boolean);
            if (allHealthy && allCompleted) {
                return;
            }
            await sleep(500);
        }
        throw new Error(`Timeout waiting for services. Healthy: [${healthyServices.join(', ')}], Completed: [${completedServices.join(', ')}]`);
    }

    /**
     * Stop and remove all services for the project (including volumes).
     */
    down(): void {
        try {
            execSync(`docker compose -f ${this.composeFilePath} -p ${this.projectName} down -v`, {stdio: 'inherit'});
        } catch (error) {
            logging.error('Failed to stop docker compose services:', error);
            throw error;
        }
    }

    /**
     * Read a file from a service container using `docker compose run`.
     */
    readFileFromService(service: string, filePath: string): string {
        const cmd = `docker compose -f ${this.composeFilePath} -p ${this.projectName} run --rm -T --entrypoint sh ${service} -c "cat ${filePath}"`;
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
