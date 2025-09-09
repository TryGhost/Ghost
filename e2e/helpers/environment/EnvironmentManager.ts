import {ContainerState} from './ContainerState';
import {DockerManager, GhostContainerConfig} from './DockerManager';
import Docker from 'dockerode';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';
import path from 'path';
import {execSync} from 'child_process';

const debug = baseDebug('e2e:EnvironmentManager');

export interface GhostInstance {
    containerId: string;
    database: string;
    port: number;
    baseUrl: string;
    siteUuid: string;
}

export class EnvironmentManager {
    private containerState: ContainerState;
    private dockerManager: DockerManager;
    private composeFilePath = path.resolve(__dirname, '../../compose.e2e.yml');
    private composeProjectName = 'ghost-e2e';
    private docker: Docker;
    constructor() {
        this.containerState = new ContainerState();
        this.dockerManager = new DockerManager();
        this.docker = new Docker();
    }

    /**
     * Get a Docker container entity by its Docker Compose service name
     */
    public async getContainerForService(service: string): Promise<Docker.Container> {
        debug('getContainerForService called for service:', service);
        const containers = await this.docker.listContainers({all: true, filters: {label: [
            `com.docker.compose.project=${this.composeProjectName}`,
            `com.docker.compose.service=${service}`
        ]}});
        debug('getContainerForService found containers:', containers.map(c => c.Id));
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
     * Get the Docker network ID used by the Compose setup
     */
    public async getNetwork(): Promise<Docker.Network> {
        debug('getNetwork called');
        const networks = await this.docker.listNetworks({filters: {label: [`com.docker.compose.project=${this.composeProjectName}`]}});
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

    /**
     * Initialize global environment
     * This method is designed to be called once before all tests to setup shared infrastructure
     */
    public async initializeGlobalEnvironment(): Promise<void> {
        logging.info('Starting global environment setup...');
        try {
            // Start Docker Compose services
            execSync(`docker compose -f ${this.composeFilePath} up -d`, {stdio: 'inherit'});
            // Wait for ghost migrations and tb migrations to complete
            // NOTE: `docker compose up -d --wait` will fail if one-shot services are included
            execSync(`docker compose -f ${this.composeFilePath} wait ghost-migrations tb-cli`);
        } catch (error) {
            logging.error('Failed to start Docker Compose services:', error);
            throw error;
        }
        const mysqlContainer = await this.getContainerForService('mysql');

        await this.execInContainer(
            mysqlContainer,
            'mysqldump -uroot -proot --opt --single-transaction ghost_testing > /tmp/dump.sql'
        );

        logging.info('Database dump created inside MySQL container');

        logging.info('Fetching Tinybird tokens...');
        const rawTinybirdEnv = execSync(
            `docker compose -f ${this.composeFilePath} run --rm -T --entrypoint sh tb-cli -c "cat /mnt/shared-config/.env.tinybird"`,
            {encoding: 'utf-8'}
        ).toString();
        debug('Raw Tinybird .env content: ', rawTinybirdEnv);
        const envLines = rawTinybirdEnv.split('\n');
        const envVars: Record<string, string> = {};
        for (const line of envLines) {
            const [key, value] = line.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim();
            }
        }
        debug('Parsed Tinybird env vars: ', envVars);
        const workspaceId = envVars.TINYBIRD_WORKSPACE_ID;
        const adminToken = envVars.TINYBIRD_ADMIN_TOKEN;
        const trackerToken = envVars.TINYBIRD_TRACKER_TOKEN;
        debug('Extracted Tinybird tokens: ', {workspaceId, adminToken, trackerToken});
        // Update Tinybird state with real values
        const updatedTinybirdState = {
            workspaceId,
            adminToken,
            trackerToken
        };
        this.containerState.saveTinybirdState(updatedTinybirdState);
        logging.info('Tinybird tokens fetched');

        logging.info('Global environment setup completed successfully');
    }

    /**
     * Teardown global environment
     * This method is designed to be called once after all tests to clean up shared infrastructure
     */
    public async teardownGlobalEnvironment(): Promise<void> {
        debug('teardownGlobalEnvironment called');
        debug('PRESERVE_ENV:', process.env.PRESERVE_ENV);
        if (process.env.PRESERVE_ENV === 'true') {
            logging.info('PRESERVE_ENV is set to true - skipping global environment teardown');
            return;
        }
        logging.info('Starting global environment cleanup...');
        try {
            execSync(`docker compose -f ${this.composeFilePath} down -v`, {stdio: 'inherit'});
        } catch (error) {
            logging.error('Failed to stop Docker Compose services:', error);
            throw error;
        }
    }

    /**
     * Setup a Ghost instance for a specific test
     * This method is designed to be called from test fixtures
     */
    public async setupGhostInstance(workerId: number, testId: string): Promise<GhostInstance> {
        try {
            debug('Setting up Ghost instance for worker %d, test %s', workerId, testId);

            const network = await this.getNetwork();
            // // Load shared infrastructure state
            // const networkState = this.containerState.loadNetworkState();
            // const mysqlState = this.containerState.loadMySQLState();
            // const tinybirdState = this.containerState.loadTinybirdState();

            // Generate unique identifiers for this test
            const networkAlias = ContainerState.generateNetworkAlias(workerId, testId);
            debug('Generated network alias:', networkAlias);
            const port = ContainerState.generateUniquePort(workerId);
            debug('Generated unique port:', port);
            const siteUuid = ContainerState.generateSiteUuid();
            debug('Generated site UUID:', siteUuid);
            const database = `ghost_${siteUuid}`;
            debug('Generated database name:', database);
            const tinybirdState = this.containerState.loadTinybirdState();
            debug('Loaded Tinybird state:', tinybirdState);

            debug('Generated test-specific identifiers:', {database, networkAlias, port});

            // Create and restore database
            await this.setupTestDatabase(database, siteUuid);

            // Create Ghost container
            const ghostConfig: GhostContainerConfig = {
                networkId: network.id,
                networkAlias: networkAlias,
                database: database,
                mysqlHost: 'mysql', // Network alias of MySQL container
                mysqlPort: '3306',
                mysqlUser: 'root',
                mysqlPassword: 'root',
                exposedPort: port,
                siteUuid: siteUuid,
                workingDir: '/home/ghost/ghost/core',
                command: ['yarn', 'dev'],
                tinybird: {
                    workspaceId: tinybirdState.workspaceId,
                    adminToken: tinybirdState.adminToken,
                    trackerToken: tinybirdState.trackerToken
                }
            };

            const containerId = await this.dockerManager.createGhostContainer(ghostConfig);

            const ghostInstance: GhostInstance = {
                containerId,
                database,
                port,
                baseUrl: `http://localhost:${port}`,
                siteUuid
            };

            debug('Ghost instance setup completed:', ghostInstance);
            return ghostInstance;
        } catch (error) {
            logging.error('Failed to setup Ghost instance:', error);
            throw new Error(`Failed to setup Ghost instance: ${error}`);
        }
    }

    /**
     * Teardown a Ghost instance
     */
    public async teardownGhostInstance(ghostInstance: GhostInstance): Promise<void> {
        if (process.env.PRESERVE_ENV === 'true') {
            return;
        }
        try {
            debug('Tearing down Ghost instance:', ghostInstance.containerId);

            // Stop and remove the Ghost container
            await this.dockerManager.removeContainer(ghostInstance.containerId);

            // Clean up the database
            await this.cleanupTestDatabase(ghostInstance.database);

            debug('Ghost instance teardown completed');
        } catch (error) {
            logging.error('Failed to teardown Ghost instance:', error);
            // Don't throw - we want tests to continue even if cleanup fails
        }
    }

    /**
     * Create and restore a database for a test
     */
    private async setupTestDatabase(database: string, siteUuid: string): Promise<void> {
        try {
            debug('Setting up test database:', database);

            const mysqlContainer = await this.getContainerForService('mysql');

            await this.execInContainer(
                mysqlContainer,
                'mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS \\`' + database + '\\`;"'
            );
            debug('Database created:', database);

            await this.execInContainer(
                mysqlContainer,
                'mysql -uroot -proot ' + database + ' < /tmp/dump.sql'
            );
            debug('Database restored from dump:', database);

            await this.execInContainer(
                mysqlContainer,
                'mysql -uroot -proot -e "UPDATE \\`' + database + '\\`.settings SET value=\'' + siteUuid + '\' WHERE \\`key\\`=\'site_uuid\';"'
            );

            debug('site_uuid updated in database settings:', siteUuid);
            debug('Test database setup completed:', database, 'with site_uuid:', siteUuid);
        } catch (error) {
            logging.error('Failed to setup test database:', error);
            throw new Error(`Failed to setup test database: ${error}`);
        }
    }

    /**
     * Clean up a test database
     */
    private async cleanupTestDatabase(database: string): Promise<void> {
        try {
            debug('Cleaning up test database:', database);
            const mysqlContainer = await this.getContainerForService('mysql');

            await this.execInContainer(
                mysqlContainer,
                'mysql -uroot -proot -e "DROP DATABASE IF EXISTS \\`' + database + '\\`;"'
            );

            debug('Test database cleanup completed:', database);
        } catch (error) {
            logging.warn('Failed to cleanup test database:', error);
            // Don't throw - cleanup failures shouldn't break tests
        }
    }

    /**
     * Get MySQL connection details for direct database access
     * Useful for data factories or direct database operations
     */
    public getMySQLConnection(): {host: string, port: number, user: string, password: string} {
        try {
            const mysqlState = this.containerState.loadMySQLState();
            return {
                host: mysqlState.host,
                port: mysqlState.mappedPort,
                user: 'root',
                password: mysqlState.rootPassword
            };
        } catch (error) {
            logging.error('Failed to get MySQL connection details:', error);
            throw new Error(`Failed to get MySQL connection details: ${error}`);
        }
    }

    /**
     * Check if the global environment is ready
     */
    public isEnvironmentReady(): boolean {
        return true;
    }

    /**
     * Get environment status for debugging
     */
    public getEnvironmentStatus() {
        return {
            networkReady: this.containerState.hasNetworkState(),
            mysqlReady: this.containerState.hasMySQLState(),
            tinybirdReady: this.containerState.hasTinybirdState()
        };
    }

    /**
     * Execute a command in a container and wait for completion
     * @param container - The Docker container to execute the command in
     * @param command - The shell command to execute
     * @returns The command output
     * @throws Error if the command fails
     */
    private async execInContainer(container: Docker.Container, command: string): Promise<string> {
        // Wrap command with exit code check
        const wrappedCommand = `${command}; echo "__EXIT_CODE__=$?"`;

        const exec = await container.exec({
            Cmd: ['sh', '-c', wrappedCommand],
            AttachStdout: true,
            AttachStderr: true
        });

        const stream = await exec.start({});
        stream.setEncoding('utf8');

        // Wait for the command to complete
        const output = await new Promise<string>((resolve, reject) => {
            let data = '';
            stream.on('data', (chunk: string) => data += chunk);
            stream.on('end', () => resolve(data));
            stream.on('error', reject);
        });

        // Check exit code
        const exitCodeMatch = output.match(/__EXIT_CODE__=(\d+)/);
        if (exitCodeMatch) {
            const exitCode = parseInt(exitCodeMatch[1], 10);
            if (exitCode !== 0) {
                // Remove the exit code marker from output for cleaner error message
                const cleanOutput = output.replace(/__EXIT_CODE__=\d+/, '').trim();
                throw new Error(`Command failed with exit code ${exitCode}: ${command}\nOutput: ${cleanOutput}`);
            }
            // Remove the exit code marker from successful output
            return output.replace(/__EXIT_CODE__=\d+/, '').trim();
        }

        // If no exit code found, return output as-is but log a warning
        debug('Warning: No exit code found in command output');
        return output;
    }
}

