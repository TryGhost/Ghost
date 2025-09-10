import * as fs from 'fs';
import Docker from 'dockerode';
import type {Container} from 'dockerode';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';
import path from 'path';
import {randomUUID} from 'crypto';
import {DockerCompose} from './DockerCompose';
import {MySQLManager} from './MySQLManager';

const debug = baseDebug('e2e:EnvironmentManager');

export interface GhostContainerConfig {
    instanceId: string;
    database: string;
    siteUuid: string;
    workingDir?: string;
    command?: string[];
}

export interface GhostInstance {
    containerId: string; // docker container ID
    instanceId: string; // unique instance name (e.g. ghost_<siteUuid>)
    database: string;
    port: number;
    baseUrl: string;
    siteUuid: string;
}

export interface TinybirdState {
    workspaceId: string;
    adminToken: string;
    trackerToken: string;
}

/**
 * Manages the lifecycle of Docker containers and shared services for end-to-end tests
 *
 * @usage
 * ```
 * const environmentManager = new EnvironmentManager();
 * await environmentManager.globalSetup(); // Call once before all tests to start MySQL, Tinybird, etc.
 * const ghostInstance = await environmentManager.setupGhostInstance(workerId); // Call before each test to create an isolated Ghost instance
 * await environmentManager.teardownGhostInstance(ghostInstance); // Call after each test to clean up the Ghost instance
 * await environmentManager.globalTeardown(); // Call once after all tests to stop shared services
 * ````
 */
export class EnvironmentManager {
    private readonly stateDir = path.resolve(__dirname, '../../data/state');
    private readonly tinybirdStateFile = path.join(this.stateDir, 'tinybird.json');
    private docker: Docker;
    private dockerCompose: DockerCompose;
    private mysql: MySQLManager;

    constructor() {
        this.ensureDataDir();
        this.docker = new Docker();
        this.dockerCompose = new DockerCompose({
            composeFilePath: path.resolve(__dirname, '../../compose.e2e.yml'),
            projectName: 'ghost-e2e',
            docker: this.docker
        });
        this.mysql = new MySQLManager(this.dockerCompose);
    }

    /**
     * ================
     * Public Methods
     * ================
     */

    /**
     * Setup shared global environment for tests (i.e. mysql, tinybird)
     */
    public async globalSetup(): Promise<void> {
        logging.info('Starting global environment setup...');
        this.dockerCompose.upAndWaitFor(['ghost-migrations', 'tb-cli']);
        await this.mysql.createSnapshot();
        this.fetchTinybirdTokens();
        logging.info('Global environment setup complete');
    }

    /**
     * Teardown global environment
     */
    public async globalTeardown(): Promise<void> {
        if (this.shouldPreserveEnvironment()) {
            logging.info('PRESERVE_ENV is set to true - skipping global environment teardown');
            return;
        }
        logging.info('Starting global environment teardown...');
        this.dockerCompose.down();
        this.cleanupStateFiles();
        logging.info('Global environment teardown complete');
    }

    /**
     * Setup an isolated Ghost instance for a test
     */
    public async setupGhostInstance(): Promise<GhostInstance> {
        try {
            const siteUuid = randomUUID();
            const instanceId = `ghost_${siteUuid}`;
            await this.mysql.setupTestDatabase(instanceId, siteUuid);
            return await this.startGhostInstance(instanceId, siteUuid);
        } catch (error) {
            logging.error('Failed to setup Ghost instance:', error);
            throw new Error(`Failed to setup Ghost instance: ${error}`);
        }
    }

    /**
     * Teardown a Ghost instance
     */
    public async teardownGhostInstance(ghostInstance: GhostInstance): Promise<void> {
        if (this.shouldPreserveEnvironment()) {
            return;
        }
        try {
            debug('Tearing down Ghost instance:', ghostInstance.containerId);
            await this.removeContainer(ghostInstance.containerId);
            await this.mysql.cleanupTestDatabase(ghostInstance.database);
            debug('Ghost instance teardown completed');
        } catch (error) {
            logging.error('Failed to teardown Ghost instance:', error);
            // Don't throw - we want tests to continue even if cleanup fails
        }
    }

    /**
     * ================
     * Private Methods
     * ================
     */

    // MySQL responsibilities are handled by MySQLManager

    private async startGhostInstance(instanceId: string, siteUuid: string) {
        const ghostConfig: GhostContainerConfig = {
            instanceId,
            database: instanceId,
            siteUuid: siteUuid
        };
        const container = await this.createGhostContainer(ghostConfig);
        const containerInfo = await container.inspect();
        const hostPort = parseInt(containerInfo.NetworkSettings.Ports['2368/tcp'][0].HostPort, 10);
        await this.waitForGhostReady(hostPort, 30000); // 30 second timeout

        const ghostInstance: GhostInstance = {
            containerId: container.id,
            instanceId,
            database: instanceId,
            port: hostPort,
            baseUrl: `http://localhost:${hostPort}`,
            siteUuid: siteUuid
        };
        return ghostInstance;
    }

    /**
     * Create and start a Ghost container
     */
    private async createGhostContainer(config: GhostContainerConfig): Promise<Container> {
        try {
            const network = await this.dockerCompose.getNetwork();
            const tinybirdState = this.loadTinybirdState();
            const environment = {
                server__host: '0.0.0.0',
                server__port: '2368',
                database__client: 'mysql2',
                database__connection__host: 'mysql',
                database__connection__port: '3306',
                database__connection__user: 'root',
                database__connection__password: 'root',
                database__connection__database: config.instanceId,
                NODE_ENV: 'development',
                TB_HOST: 'http://tinybird-local:7181',
                TB_LOCAL_HOST: 'tinybird-local',
                tinybird__stats__endpoint: 'http://tinybird-local:7181',
                tinybird__stats__endpointBrowser: 'http://localhost:7181',
                tinybird__tracker__endpoint: 'http://localhost/.ghost/analytics/api/v1/page_hit',
                tinybird__workspaceId: tinybirdState.workspaceId,
                tinybird__adminToken: tinybirdState.adminToken
            };

            const containerConfig = {
                Image: process.env.GHOST_IMAGE_TAG || 'ghost-monorepo',
                Env: Object.entries(environment).map(([key, value]) => `${key}=${value}`),
                NetworkingConfig: {
                    EndpointsConfig: {
                        [network.id]: {
                            Aliases: [config.instanceId]
                        }
                    }
                },
                ExposedPorts: {
                    '2368/tcp': {}
                },
                HostConfig: {
                    PortBindings: {
                        '2368/tcp': [{HostPort: '0'}]
                    }
                },
                Labels: {
                    'com.docker.compose.project': 'ghost-e2e',
                    'com.docker.compose.service': `ghost-${config.siteUuid}`,
                    'tryghost/e2e': 'ghost'
                },
                WorkingDir: config.workingDir || '/home/ghost/ghost/core',
                Cmd: config.command || ['yarn', 'dev'],
                AttachStdout: true,
                AttachStderr: true
            };

            debug('Ghost environment variables:', JSON.stringify(environment, null, 2));
            debug('Full Docker container config:', JSON.stringify(containerConfig, null, 2));

            debug('Starting Ghost container...');
            const container = await this.docker.createContainer(containerConfig);
            await container.start();
            debug('Ghost container started:', container.id);
            return container;
        } catch (error) {
            logging.error('Failed to create Ghost container:', error);
            throw new Error(`Failed to create Ghost container: ${error}`);
        }
    }

    /**
     * Wait for Ghost to be ready by checking HTTP health
     */
    private async waitForGhostReady(port: number, timeoutMs: number = 60000): Promise<void> {
        const startTime = Date.now();
        const healthUrl = `http://localhost:${port}/ghost/api/admin/site/`;

        while (Date.now() - startTime < timeoutMs) {
            try {
                // Simple HTTP check to see if Ghost API responds
                const response = await fetch(healthUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000) // 5 second timeout per request
                });

                // If we get any response (even 401/404), Ghost is ready
                if (response.status < 500) {
                    debug('Ghost is ready, responded with status:', response.status);
                    return;
                }

                debug('Ghost not ready yet, status:', response.status);
            } catch (error) {
                debug('Ghost health check failed, retrying...', error instanceof Error ? error.message : String(error));
            }

            // Wait 200ms before next check
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 200);
            });
        }

        throw new Error(`Timeout waiting for Ghost to start on port ${port}`);
    }

    /*
     * ==============
     * State Management
     * ==============
     */

    private ensureDataDir(): void {
        try {
            if (!fs.existsSync(this.stateDir)) {
                fs.mkdirSync(this.stateDir, {recursive: true});
                debug('created state directory:', this.stateDir);
            }
        } catch (error) {
            // handle race condition where directory might be created between existssync and mkdirsync
            if (!fs.existsSync(this.stateDir)) {
                logging.error('failed to ensure state directory exists:', error);
                throw new Error(`failed to ensure state directory exists: ${error}`);
            }
        }
    }

    private saveTinybirdState(state: TinybirdState): void {
        try {
            this.ensureDataDir();
            fs.writeFileSync(this.tinybirdStateFile, JSON.stringify(state, null, 2));
            debug('Tinybird state saved:', state);
        } catch (error) {
            logging.error('Failed to save Tinybird state:', error);
            throw new Error(`Failed to save Tinybird state: ${error}`);
        }
    }

    private loadTinybirdState(): TinybirdState {
        try {
            if (!fs.existsSync(this.tinybirdStateFile)) {
                throw new Error('Tinybird state file does not exist');
            }
            const data = fs.readFileSync(this.tinybirdStateFile, 'utf8');
            const state = JSON.parse(data) as TinybirdState;
            debug('Tinybird state loaded:', state);
            return state;
        } catch (error) {
            logging.error('Failed to load Tinybird state:', error);
            throw new Error(`Failed to load Tinybird state: ${error}`);
        }
    }

    private cleanupStateFiles(): void {
        try {
            if (fs.existsSync(this.stateDir)) {
                // Delete all files in the directory, but keep the directory itself
                const files = fs.readdirSync(this.stateDir);
                for (const file of files) {
                    const filePath = path.join(this.stateDir, file);
                    const stat = fs.statSync(filePath);
                    if (stat.isDirectory()) {
                        fs.rmSync(filePath, {recursive: true, force: true});
                    } else {
                        fs.unlinkSync(filePath);
                    }
                }
                debug('State files cleaned up');
            }
        } catch (error) {
            logging.error('Failed to cleanup state files:', error);
            throw new Error(`Failed to cleanup state files: ${error}`);
        }
    }

    /**
     * Stop and remove a container
     */
    private async removeContainer(containerId: string): Promise<void> {
        try {
            const container = this.docker.getContainer(containerId);
            try {
                await container.stop({t: 10}); // 10 second timeout
            } catch (error) {
                debug('Container already stopped or stop failed, forcing removal:', containerId);
            }

            await container.remove({force: true});
            debug('Container removed:', containerId);
        } catch (error) {
            debug('Failed to remove container:', error);
            // Don't throw - container might already be removed
        }
    }

    private fetchTinybirdTokens() {
        logging.info('Fetching Tinybird tokens...');
        // The tb-cli entrypoint grabs these values and stores them in /mnt/shared-config/.env.tinybird
        // We can read that file to get the tokens
        const rawTinybirdEnv = this.dockerCompose.readFileFromService('tb-cli', '/mnt/shared-config/.env.tinybird');
        const envLines = rawTinybirdEnv.split('\n');
        const envVars: Record<string, string> = {};
        for (const line of envLines) {
            const [key, value] = line.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim();
            }
        }
        const tinybirdState = {
            workspaceId: envVars.TINYBIRD_WORKSPACE_ID,
            adminToken: envVars.TINYBIRD_ADMIN_TOKEN,
            trackerToken: envVars.TINYBIRD_TRACKER_TOKEN
        };
        this.saveTinybirdState(tinybirdState);
        logging.info('Tinybird tokens fetched');
    }

    private shouldPreserveEnvironment(): boolean {
        return process.env.PRESERVE_ENV === 'true';
    }
}
