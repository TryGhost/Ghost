import Docker from 'dockerode';
import type {Container} from 'dockerode';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';
import {execSync} from 'child_process';

const debug = baseDebug('e2e:DockerCompose');

type ContainerStatusItem = {
    Name: string;
    Command: string;
    CreatedAt: string;
    ExitCode: number;
    Health: string;
    State: string;
    Service: string;
}

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

            // Output all container logs for debugging
            try {
                logging.error('\n=== Docker compose logs ===');
                const logs = execSync(
                    `docker compose -f ${this.composeFilePath} -p ${this.projectName} logs`,
                    {encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10} // 10MB buffer for logs
                );
                logging.error(logs);
                logging.error('=== End docker compose logs ===\n');
            } catch (logError) {
                debug('Could not get docker compose logs:', logError);
            }

            throw error;
        }
    }

    /**
     * Get the status of all containers in the compose project.
     * Returns null if no containers are found.
     */
    async getContainersStatus(): Promise<ContainerStatusItem[] | null> {
        const command = `docker compose -f ${this.composeFilePath} -p ${this.projectName} ps -a --format json`;
        const output = execSync(command, {encoding: 'utf-8'}).trim();
        if (!output) {
            return null;
        }
        const containers = output.split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));

        if (containers.length === 0) {
            return null;
        }
        return containers;
    }

    /**
     * Check if a container is ready based on its status.
     * A container is considered ready if:
     * - It has a healthcheck and is healthy
     * - It has exited with code 0 (no healthcheck)
     *
     * @param container Container status item
     * @returns true if the container is ready, false otherwise
     * @throws Error if the container has exited with a non-zero code
     */
    isContainerReady(container: ContainerStatusItem): boolean {
        // If container has healthcheck, wait for healthy status
        if (container.Health) {
            return container.Health === 'healthy';
        }

        // If container exited, check exit code
        if (container.State === 'exited') {
            if (container.ExitCode !== 0) {
                throw new Error(`${container.Name || container.Service} exited with code ${container.ExitCode}`);
            }
            return true;
        }

        // Running container without healthcheck is not considered ready
        return false;
    }

    /**
     * Check if all containers are ready.
     * @param containers Array of container status items
     * @returns true if all containers are ready, false otherwise
     */
    areAllContainersReady(containers: ContainerStatusItem[] | null): boolean {
        if (!containers || containers.length === 0) {
            return false;
        }
        return containers.every(container => this.isContainerReady(container));
    }

    /**
     * Wait until all services from the compose file are ready.
     * A service is considered ready if:
     * - It has a healthcheck and is healthy (i.e. mysql)
     * - It has exited with code 0 (no healthcheck) (i.e. migrations)
     *
     * This method will poll the status of all containers until they are all ready or the timeout is reached.
     *
     * NOTE: `docker compose up -d --wait` does not work here because it will exit with code 1 if any container exited
     *
     * @param timeoutMs Maximum time to wait for all services to be ready (default: 60000ms)
     * @param intervalMs Interval between status checks (default: 500ms)
     *
    */
    async waitForAll(timeoutMs = 60000, intervalMs = 500): Promise<void> {
        const sleep = (ms: number) => new Promise<void>((resolve) => {
            setTimeout(resolve, ms);
        });

        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const containers = await this.getContainersStatus();
            const allContainersReady = this.areAllContainersReady(containers);
            if (allContainersReady) {
                return;
            }
            await sleep(intervalMs);
        }

        throw new Error('Timeout waiting for services to be ready');
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
     * Get the host port for a service's container port.
     * This is useful when services use dynamic port mapping.
     *
     * @param service The compose service name
     * @param containerPort The container port (e.g., '4175')
     * @returns The host port as a string
     */
    async getHostPortForService(service: string, containerPort: string): Promise<string> {
        const container = await this.getContainerForService(service);
        const containerInfo = await container.inspect();
        const portKey = `${containerPort}/tcp`;
        const portMapping = containerInfo.NetworkSettings.Ports[portKey];
        if (!portMapping || portMapping.length === 0) {
            throw new Error(`Service ${service} does not have port ${containerPort} exposed`);
        }
        const hostPort = portMapping[0].HostPort;
        debug(`Service ${service} port ${containerPort} is mapped to host port ${hostPort}`);
        return hostPort;
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
