import {ContainerState} from './ContainerState';
import {DockerManager, GhostContainerConfig} from './DockerManager';
import type {MySQLState, NetworkState, GhostInstanceState, TinybirdState} from './ContainerState';
import debug from 'debug';

const log = debug('e2e:EnvironmentManager');

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
     * Setup a Ghost instance for a specific test
     * This method is designed to be called from test fixtures
     */
    public async setupGhostInstance(workerId: number, testId: string): Promise<GhostInstance> {
        try {
            log('Setting up Ghost instance for worker %d, test %s', workerId, testId);

            // Load shared infrastructure state
            const networkState = this.containerState.loadNetworkState();
            const mysqlState = this.containerState.loadMySQLState();
            const tinybirdState = this.containerState.loadTinybirdState();

            // Generate unique identifiers for this test
            const database = ContainerState.generateDatabaseName(workerId, testId);
            const networkAlias = ContainerState.generateNetworkAlias(workerId, testId);
            const port = ContainerState.generateUniquePort(workerId);
            const siteUuid = ContainerState.generateSiteUuid();

            log('Generated test-specific identifiers:', { database, networkAlias, port });

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

            log('Ghost instance setup completed:', ghostInstance);
            return ghostInstance;

        } catch (error) {
            log('Failed to setup Ghost instance:', error);
            throw new Error(`Failed to setup Ghost instance: ${error}`);
        }
    }

    /**
     * Teardown a Ghost instance
     */
    public async teardownGhostInstance(ghostInstance: GhostInstance): Promise<void> {
        try {
            log('Tearing down Ghost instance:', ghostInstance.containerId);

            // Stop and remove the Ghost container
            await this.dockerManager.removeContainer(ghostInstance.containerId);

            // Clean up the database
            const mysqlState = this.containerState.loadMySQLState();
            await this.cleanupTestDatabase(mysqlState, ghostInstance.database);

            log('Ghost instance teardown completed');

        } catch (error) {
            log('Failed to teardown Ghost instance:', error);
            // Don't throw - we want tests to continue even if cleanup fails
        }
    }

    /**
     * Create and restore a database for a test
     */
    private async setupTestDatabase(mysqlState: MySQLState, database: string, siteUuid: string): Promise<void> {
        try {
            log('Setting up test database:', database);

            // Create and restore database from the dump file inside the MySQL container
            await this.dockerManager.restoreDatabaseFromDump(mysqlState, database);

            // Update site_uuid in the database settings
            await this.dockerManager.executeMySQLCommand(mysqlState, 
                `UPDATE ${database}.settings SET value='${siteUuid}' WHERE \`key\`='site_uuid'`
            );

            log('Test database setup completed:', database, 'with site_uuid:', siteUuid);

        } catch (error) {
            log('Failed to setup test database:', error);
            throw new Error(`Failed to setup test database: ${error}`);
        }
    }

    /**
     * Clean up a test database
     */
    private async cleanupTestDatabase(mysqlState: MySQLState, database: string): Promise<void> {
        try {
            log('Cleaning up test database:', database);
            await this.dockerManager.executeMySQLCommand(mysqlState, `DROP DATABASE IF EXISTS ${database}`);
            log('Test database cleanup completed:', database);

        } catch (error) {
            log('Failed to cleanup test database:', error);
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
            log('Failed to get MySQL connection details:', error);
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

