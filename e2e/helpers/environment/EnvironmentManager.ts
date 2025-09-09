import {ContainerState} from './ContainerState';
import {DockerManager, GhostContainerConfig} from './DockerManager';
import type {MySQLState} from './ContainerState';
import {GenericContainer, Network, Wait} from 'testcontainers';
import {MySqlContainer} from '@testcontainers/mysql';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';
import path from 'path';

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
    constructor() {
        this.containerState = new ContainerState();
        this.dockerManager = new DockerManager();
    }

    /**
     * Initialize global environment
     * This method is designed to be called once before all tests to setup shared infrastructure
     */
    public async initializeGlobalEnvironment(): Promise<void> {
        logging.info('Starting global environment setup...');

        const containerState = new ContainerState();
        const dockerManager = new DockerManager();

        // Clean up any existing state
        containerState.cleanupAll();

        logging.info('Creating Docker network...');
        const network = await new Network().start();

        const networkState = {
            networkId: network.getId(),
            networkName: network.getName()
        };
        containerState.saveNetworkState(networkState);
        logging.info('Network created: ', networkState.networkId);
        debug('Network created and state saved:', networkState);

        logging.info('Starting MySQL container...');
        const mysql = await new MySqlContainer('mysql:8.0')
            .withNetwork(network)
            .withNetworkAliases('mysql')
            .withReuse()
            .withTmpFs({'/var/lib/mysql': 'rw,noexec,nosuid,size=1024m'})
            .withDatabase('ghost-test-initial')
            .start();

        const mysqlState = {
            containerId: mysql.getId(),
            rootPassword: mysql.getRootPassword(),
            mappedPort: mysql.getMappedPort(3306),
            database: mysql.getDatabase(),
            host: 'localhost'
        };
        containerState.saveMySQLState(mysqlState);

        logging.info('MySQL started: ', mysqlState.containerId);
        debug('MySQL container started and state saved:', {
            containerId: mysqlState.containerId,
            mappedPort: mysqlState.mappedPort,
            database: mysqlState.database
        });

        const ghostEnv = {
            server__host: '0.0.0.0',
            database__client: 'mysql2',
            database__connection__host: 'mysql',
            database__connection__port: '3306',
            database__connection__user: 'root',
            database__connection__password: mysqlState.rootPassword,
            database__connection__database: mysqlState.database,
            NODE_ENV: 'development'
        };

        logging.info('Running Ghost migrations');
        await new GenericContainer(process.env.GHOST_IMAGE_TAG || 'ghost-monorepo')
            .withNetwork(network)
            .withNetworkAliases('ghost-migration')
            .withWorkingDir('/home/ghost')
            .withCommand(['yarn', 'knex-migrator', 'init'])
            .withEnvironment(ghostEnv)
            .withWaitStrategy(Wait.forOneShotStartup())
            .start();

        logging.info('Ghost migrations completed successfully');

        logging.info('Creating database dump...');
        await dockerManager.executeInContainer(mysqlState.containerId, [
            'sh', '-c',
            `mysqldump -u root -p${mysqlState.rootPassword} --opt --single-transaction ${mysqlState.database} > /tmp/dump.sql`
        ]);
        logging.info('Database dump created inside MySQL container');

        logging.info('Starting Tinybird local container...');
        const tinybirdContainer = await new GenericContainer('tinybirdco/tinybird-local:latest')
            .withNetwork(network)
            .withNetworkAliases('tinybird-local')
            .withReuse()
            .withExposedPorts(7181)
            .withWaitStrategy(Wait.forHttp('/v0/health', 7181))
            .start();

        const tinybirdState = {
            containerId: tinybirdContainer.getId(),
            workspaceId: 'placeholder_workspace_id', // Will be updated after schema deployment
            adminToken: 'placeholder_admin_token',
            trackerToken: 'placeholder_tracker_token',
            mappedPort: tinybirdContainer.getMappedPort(7181),
            host: 'localhost'
        };
        containerState.saveTinybirdState(tinybirdState);
        logging.info('Tinybird started: ', tinybirdState.containerId);

        const tinybirdDataPath = path.resolve(process.cwd(), '../ghost/core/core/server/data/tinybird');
        logging.info('Deploying Tinybird schema from:', tinybirdDataPath);

        await new GenericContainer('ghost-tb-cli:latest')
            .withNetwork(network)
            .withBindMounts([
                {
                    source: tinybirdDataPath,
                    target: '/home/tinybird',
                    mode: 'ro'
                },
                {
                    source: '/var/run/docker.sock',
                    target: '/var/run/docker.sock',
                    mode: 'rw'
                }
            ])
            .withWorkingDir('/home/tinybird')
            .withEnvironment({
                TB_HOST: 'http://tinybird-local:7181',
                TB_LOCAL_HOST: 'tinybird-local'
            })
            .withLabels({'ghost-e2e': 'tb-cli-deploy'})
            .withAutoRemove(true)
            .withEntrypoint(['sh'])
            .withCommand(['-c', 'ls -la /home/tinybird && tb --local build'])
            .withWaitStrategy(Wait.forOneShotStartup())
            .start();

        logging.info('Tinybird schema deployment completed');

        logging.info('Fetching Tinybird tokens...');
        const tbInfoContainer = await new GenericContainer('ghost-tb-cli:latest')
            .withNetwork(network)
            .withBindMounts([
                {
                    source: tinybirdDataPath,
                    target: '/home/tinybird',
                    mode: 'ro'
                },
                {
                    source: '/var/run/docker.sock',
                    target: '/var/run/docker.sock',
                    mode: 'rw'
                }
            ])
            .withWorkingDir('/home/tinybird')
            .withEnvironment({
                TB_HOST: 'http://tinybird-local:7181',
                TB_LOCAL_HOST: 'tinybird-local'
            })
            .withLabels({'ghost-e2e': 'tb-cli-info'})
            .withAutoRemove(true)
            .withEntrypoint(['sh'])
            .withCommand(['-c', 'tb --output json info'])
            .withWaitStrategy(Wait.forOneShotStartup())
            .start();

        // Get workspace info from container logs
        const tbInfoLogs = await tbInfoContainer.logs();
        let tbInfoString = '';

        // Handle Docker stream format
        if (tbInfoLogs && typeof tbInfoLogs.on === 'function') {
            // It's a stream
            await new Promise((resolve) => {
                tbInfoLogs.on('data', (chunk: Buffer) => {
                    tbInfoString += chunk.toString();
                });
                tbInfoLogs.on('end', resolve);
            });
        } else {
            // It's already a string or buffer
            tbInfoString = tbInfoLogs.toString();
        }

        // Clean up any extra characters and parse JSON
        const cleanJson = tbInfoString.replace(/^.*?{/, '{').replace(/}.*$/, '}');
        const tbInfo = JSON.parse(cleanJson);

        const workspaceId = tbInfo.local.workspace_id;
        const workspaceToken = tbInfo.local.token;

        // Get admin and tracker tokens via API call
        const tokensResult = await dockerManager.executeInContainer(tinybirdState.containerId, [
            'curl', '-s', '-H', `Authorization: Bearer ${workspaceToken}`,
            'http://localhost:7181/v0/tokens'
        ]);

        const tokensData = JSON.parse(tokensResult.stdout);
        const adminToken = tokensData.tokens.find((t: {name: string; token: string}) => t.name === 'admin token')?.token;
        const trackerToken = tokensData.tokens.find((t: {name: string; token: string}) => t.name === 'tracker')?.token;

        if (!adminToken || !trackerToken) {
            throw new Error('Failed to extract admin or tracker tokens');
        }

        // Update Tinybird state with real values
        const updatedTinybirdState = {
            ...tinybirdState,
            workspaceId,
            adminToken,
            trackerToken
        };
        containerState.saveTinybirdState(updatedTinybirdState);
        logging.info('Tinybird tokens fetched');

        logging.info('Global environment setup completed successfully');
    }

    /**
     * Teardown global environment
     * This method is designed to be called once after all tests to clean up shared infrastructure
     */
    public async teardownGlobalEnvironment(): Promise<void> {
        logging.info('Starting global environment cleanup...');

        const containerState = new ContainerState();
        const dockerManager = new DockerManager();

        try {
        // Check if we have state to clean up
            const hasNetworkState = containerState.hasNetworkState();
            const hasMySQLState = containerState.hasMySQLState();
            const hasTinybirdState = containerState.hasTinybirdState();

            if (!hasNetworkState && !hasMySQLState && !hasTinybirdState) {
                logging.info('No container state found, nothing to clean up');
                return;
            }

            let networkId: string | null = null;

            // Get network ID if available
            try {
                const networkState = containerState.loadNetworkState();
                networkId = networkState.networkId;
                logging.info('Found network to clean up:', networkId);
            } catch (error) {
                logging.error('Could not load network state:', error);
            }

            // If we have a network, perform comprehensive cleanup
            if (networkId) {
                logging.info('Performing comprehensive network cleanup...');

                try {
                // This will:
                // 1. Find all containers on the network
                // 2. Stop and remove them (Ghost instances + MySQL)
                // 3. Remove the network
                    await dockerManager.cleanupNetwork(networkId);
                    logging.info('Network cleanup completed successfully');
                } catch (error) {
                    logging.warn('Network cleanup failed, attempting individual cleanup:', error);

                    // Fallback: try to clean up MySQL container directly
                    try {
                        const mysqlState = containerState.loadMySQLState();
                        await dockerManager.removeContainer(mysqlState.containerId);
                        logging.info('MySQL container cleanup completed');
                    } catch (mysqlError) {
                        logging.error('MySQL container cleanup failed:', mysqlError);
                    }

                    // Try to remove network anyway
                    try {
                        await dockerManager.removeNetwork(networkId);
                        logging.info('Network removal completed');
                    } catch (networkError) {
                        logging.error('Network removal failed:', networkError);
                    }
                }
            } else {
            // No network info, try to clean up MySQL directly
                try {
                    const mysqlState = containerState.loadMySQLState();
                    await dockerManager.removeContainer(mysqlState.containerId);
                    logging.info('MySQL container cleanup completed');
                } catch (error) {
                    logging.error('Could not clean up MySQL container:', error);
                }
            }

            // Clean up state files
            containerState.cleanupAll();
            logging.info('State files cleaned up');

            logging.info('Global environment cleanup completed successfully');
        } catch (error) {
            logging.error('Global environment cleanup encountered errors:', error);

            // Still try to clean up state files even if container cleanup failed
            try {
                containerState.cleanupAll();
                logging.info('State files cleaned up after error');
            } catch (stateCleanupError) {
                logging.error('State file cleanup also failed:', stateCleanupError);
            }
        }
    }

    /**
     * Setup a Ghost instance for a specific test
     * This method is designed to be called from test fixtures
     */
    public async setupGhostInstance(workerId: number, testId: string): Promise<GhostInstance> {
        try {
            debug('Setting up Ghost instance for worker %d, test %s', workerId, testId);

            // Load shared infrastructure state
            const networkState = this.containerState.loadNetworkState();
            const mysqlState = this.containerState.loadMySQLState();
            const tinybirdState = this.containerState.loadTinybirdState();

            // Generate unique identifiers for this test
            const database = ContainerState.generateDatabaseName(workerId, testId);
            const networkAlias = ContainerState.generateNetworkAlias(workerId, testId);
            const port = ContainerState.generateUniquePort(workerId);
            const siteUuid = ContainerState.generateSiteUuid();

            debug('Generated test-specific identifiers:', {database, networkAlias, port});

            // Create and restore database
            await this.setupTestDatabase(mysqlState, database, siteUuid);

            // Create Ghost container
            const ghostConfig: GhostContainerConfig = {
                networkId: networkState.networkId,
                networkAlias: networkAlias,
                database: database,
                mysqlHost: 'mysql', // Network alias of MySQL container
                mysqlPort: '3306',
                mysqlUser: 'root',
                mysqlPassword: mysqlState.rootPassword,
                exposedPort: port,
                siteUuid: siteUuid,
                tinybirdConfig: {
                    workspaceId: tinybirdState.workspaceId,
                    adminToken: tinybirdState.adminToken,
                    trackerToken: tinybirdState.trackerToken
                },
                workingDir: '/home/ghost/ghost/core',
                command: ['yarn', 'dev']
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
        try {
            debug('Tearing down Ghost instance:', ghostInstance.containerId);

            // Stop and remove the Ghost container
            await this.dockerManager.removeContainer(ghostInstance.containerId);

            // Clean up the database
            const mysqlState = this.containerState.loadMySQLState();
            await this.cleanupTestDatabase(mysqlState, ghostInstance.database);

            debug('Ghost instance teardown completed');
        } catch (error) {
            logging.error('Failed to teardown Ghost instance:', error);
            // Don't throw - we want tests to continue even if cleanup fails
        }
    }

    /**
     * Create and restore a database for a test
     */
    private async setupTestDatabase(mysqlState: MySQLState, database: string, siteUuid: string): Promise<void> {
        try {
            debug('Setting up test database:', database);

            // Create and restore database from the dump file inside the MySQL container
            await this.dockerManager.restoreDatabaseFromDump(mysqlState, database);

            // Update site_uuid in the database settings
            await this.dockerManager.executeMySQLCommand(mysqlState,
                `UPDATE ${database}.settings SET value='${siteUuid}' WHERE \`key\`='site_uuid'`
            );

            debug('Test database setup completed:', database, 'with site_uuid:', siteUuid);
        } catch (error) {
            logging.error('Failed to setup test database:', error);
            throw new Error(`Failed to setup test database: ${error}`);
        }
    }

    /**
     * Clean up a test database
     */
    private async cleanupTestDatabase(mysqlState: MySQLState, database: string): Promise<void> {
        try {
            debug('Cleaning up test database:', database);
            await this.dockerManager.executeMySQLCommand(mysqlState, `DROP DATABASE IF EXISTS ${database}`);
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
        return this.containerState.hasNetworkState() &&
               this.containerState.hasMySQLState() &&
               this.containerState.hasTinybirdState();
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
}

