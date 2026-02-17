import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import logging from '@tryghost/logging';
import {execSync} from 'child_process';
import type {Container} from 'dockerode';

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

    constructor(options: { composeFilePath: string; projectName: string; docker: Docker }) {
        this.composeFilePath = options.composeFilePath;
        this.projectName = options.projectName;
        this.docker = options.docker;
    }

    async up(): Promise<void> {
        const command = this.composeCommand('up -d');

        try {
            logging.info('Starting docker compose services...');
            execSync(command, {encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10});
            logging.info('Docker compose services are up');
        } catch (error) {
            this.logCommandFailure(command, error);
            logging.error('Failed to start docker compose services:', error);
            this.ps();
            this.logs();
            throw error;
        }

        await this.waitForAll();
    }

    // Stop and remove all services for the project including volumes
    down(): void {
        const command = this.composeCommand('down -v');

        try {
            execSync(command, {encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10});
        } catch (error) {
            this.logCommandFailure(command, error);
            logging.error('Failed to stop docker compose services:', error);
            throw error;
        }
    }

    execShellInService(service: string, shellCommand: string): string {
        const command = this.composeCommand(`run --rm -T --entrypoint sh ${service} -c "${shellCommand}"`);
        debug('readFileFromService running:', command);

        return execSync(command, {encoding: 'utf-8'});
    }

    execInService(service: string, command: string[]): string {
        const cmdArgs = command.map(arg => `"${arg}"`).join(' ');
        const cmd = this.composeCommand(`run --rm -T ${service} ${cmdArgs}`);

        debug('execInService running:', cmd);
        return execSync(cmd, {encoding: 'utf-8'});
    }

    async getContainerForService(serviceLabel: string): Promise<Container> {
        debug('getContainerForService called for service:', serviceLabel);

        const containers = await this.docker.listContainers({
            all: true,
            filters: {
                label: [
                    `com.docker.compose.project=${this.projectName}`,
                    `com.docker.compose.service=${serviceLabel}`
                ]
            }
        });

        if (containers.length === 0) {
            throw new Error(`No container found for service: ${serviceLabel}`);
        }

        if (containers.length > 1) {
            throw new Error(`Multiple containers found for service: ${serviceLabel}`);
        }

        const container = this.docker.getContainer(containers[0].Id);

        debug('getContainerForService returning container:', container.id);
        return container;
    }

    /**
     * Get the host port for a service's container port.
     * This is useful when services use dynamic port mapping.
     *
     * @param serviceLabel The compose service name
     * @param containerPort The container port (e.g., '4175')
     * @returns The host port as a string
     */
    async getHostPortForService(serviceLabel: string, containerPort: number): Promise<string> {
        const container = await this.getContainerForService(serviceLabel);
        const containerInfo = await container.inspect();
        const portKey = `${containerPort}/tcp`;
        const portMapping = containerInfo.NetworkSettings.Ports[portKey];

        if (!portMapping || portMapping.length === 0) {
            throw new Error(`Service ${serviceLabel} does not have port ${containerPort} exposed`);
        }
        const hostPort = portMapping[0].HostPort;

        debug(`Service ${serviceLabel} port ${containerPort} is mapped to host port ${hostPort}`);
        return hostPort;
    }

    async getNetwork(): Promise<Docker.Network> {
        const networkId = await this.getNetworkId();
        debug('getNetwork returning network ID:', networkId);

        const network = this.docker.getNetwork(networkId);

        debug('getNetwork returning network:', network.id);
        return network;
    }

    private async getNetworkId() {
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

        return networks[0].Id;
    }

    // Output all container logs for debugging
    private logs(): void {
        try {
            logging.error('\n=== Docker compose logs ===');

            const logs = execSync(
                this.composeCommand('logs'),
                {encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10} // 10MB buffer for logs
            );

            logging.error(logs);
            logging.error('=== End docker compose logs ===\n');
        } catch (logError) {
            debug('Could not get docker compose logs:', logError);
        }
    }

    private ps(): void {
        try {
            logging.error('\n=== Docker compose ps -a ===');

            const ps = execSync(this.composeCommand('ps -a'), {
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024 * 10
            });

            logging.error(ps);
            logging.error('=== End docker compose ps -a ===\n');
        } catch (psError) {
            debug('Could not get docker compose ps -a:', psError);
        }
    }

    private composeCommand(args: string): string {
        return `docker compose -f ${this.composeFilePath} -p ${this.projectName} ${args}`;
    }

    private logCommandFailure(command: string, error: unknown): void {
        if (!(error instanceof Error)) {
            return;
        }

        const commandError = error as Error & {
            stdout?: Buffer | string;
            stderr?: Buffer | string;
        };

        const stdout = commandError.stdout?.toString().trim();
        const stderr = commandError.stderr?.toString().trim();

        logging.error(`Command failed: ${command}`);

        if (stdout) {
            logging.error('\n=== docker compose command stdout ===');
            logging.error(stdout);
            logging.error('=== End docker compose command stdout ===\n');
        }

        if (stderr) {
            logging.error('\n=== docker compose command stderr ===');
            logging.error(stderr);
            logging.error('=== End docker compose command stderr ===\n');
        }
    }

    private async getContainers(): Promise<ContainerStatusItem[] | null> {
        const command = this.composeCommand('ps -a --format json');
        const output = execSync(command, {encoding: 'utf-8'}).trim();

        if (!output) {
            return null;
        }

        const containers = output
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));

        if (containers.length === 0) {
            return null;
        }

        return containers;
    }

    /**
     * Wait until all services from the compose file are ready.
     * NOTE: `docker compose up -d --wait` does not work here because it will exit with code 1 if any container exited.
     *
     * @param timeoutMs Maximum time to wait for all services to be ready (default: 60000ms)
     * @param intervalMs Interval between status checks (default: 500ms)
     *
     */
    private async waitForAll(timeoutMs = 60000, intervalMs = 500): Promise<void> {
        const sleep = (ms: number) => new Promise<void>((resolve) => {
            setTimeout(resolve, ms);
        });

        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const containers = await this.getContainers();
            const allContainersReady = this.areAllContainersReady(containers);

            if (allContainersReady) {
                return;
            }

            await sleep(intervalMs);
        }

        throw new Error('Timeout waiting for services to be ready');
    }

    private areAllContainersReady(containers: ContainerStatusItem[] | null): boolean {
        if (!containers || containers.length === 0) {
            return false;
        }

        return containers.every(container => this.isContainerReady(container));
    }

    /**
     * Check if a container is ready based on its status.
     *
     * A container is considered ready if:
     * - It has a healthcheck and is healthy
     * - It has exited with code 0 (no healthcheck)
     *
     * @param container Container status item
     * @returns true if the container is ready, false otherwise
     * @throws Error if the container has exited with a non-zero code
     */
    private isContainerReady(container: ContainerStatusItem): boolean {
        const {Health, State, ExitCode, Name, Service} = container;

        if (Health) {
            return Health === 'healthy';
        }

        if (State !== 'exited') {
            return false;
        }

        if (ExitCode === 0) {
            return true;
        }

        throw new Error(`${Name || Service} exited with code ${ExitCode}`);
    }
}
