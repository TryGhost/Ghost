import * as fs from 'fs';
import Docker from 'dockerode';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';
import path from 'path';
import {randomUUID} from 'crypto';
import {DockerCompose} from './DockerCompose';
import {MySQLManager} from './MySQLManager';
import {TinybirdManager} from './TinybirdManager';
import {GhostManager} from './GhostManager';
import {COMPOSE_FILE_PATH, COMPOSE_PROJECT, CONFIG_DIR} from './constants';

const debug = baseDebug('e2e:EnvironmentManager');

export interface GhostInstance {
    containerId: string; // docker container ID
    instanceId: string; // unique instance name (e.g. ghost_<siteUuid>)
    database: string;
    port: number;
    baseUrl: string;
    siteUuid: string;
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
    private readonly docker: Docker;
    private readonly dockerCompose: DockerCompose;
    private mysql: MySQLManager;
    private readonly tinybird: TinybirdManager;
    private ghost: GhostManager;

    constructor() {
        this.docker = new Docker();
        this.dockerCompose = new DockerCompose({
            composeFilePath: COMPOSE_FILE_PATH,
            projectName: COMPOSE_PROJECT,
            docker: this.docker
        });
        this.mysql = new MySQLManager(this.dockerCompose);
        this.tinybird = new TinybirdManager(this.dockerCompose);
        this.ghost = new GhostManager(this.docker, this.dockerCompose, this.tinybird);
    }

    private async getPortalUrl(): Promise<string> {
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

    /**
     * Clean up leftover resources from previous test runs
     * This should be called at the start of globalSetup to ensure a clean slate,
     * especially after interrupted test runs (e.g. via ctrl+c)
     *
     * 1. Remove all leftover Ghost containers
     * 2. Clean up leftover test databases (if MySQL is running)
     * 3. Delete the MySQL snapshot (if MySQL is running)
     * 4. Recreate the ghost_testing database (if MySQL is running)
     * 5. Truncate Tinybird analytics_events datasource (if Tinybird is running)
     *
     * Note: Docker compose services are left running for reuse across test runs
     */
    private async cleanupLeftoverResources(): Promise<void> {
        try {
            logging.info('Cleaning up leftover resources from previous test runs...');

            await this.ghost.removeAll();
            await this.mysql.dropAllTestDatabases();
            await this.mysql.deleteSnapshot();
            await this.mysql.recreateBaseDatabase();
            this.tinybird.truncateAnalyticsEvents();

            logging.info('Leftover resources cleaned up successfully');
        } catch (error) {
            logging.warn('Failed to clean up some leftover resources:', error);
            // Don't throw - we want to continue with setup even if cleanup fails
        }
    }

    /**
     * Setup shared global environment for tests (i.e. mysql, tinybird, portal)
     * This should be called once before all tests run.
     *
     * 1. Clean up any leftover resources from previous test runs
     * 2. Start docker-compose services (including running Ghost migrations on the default database)
     * 3. Wait for all services to be ready (healthy or exited with code 0)
     * 4. Create a MySQL snapshot of the database after migrations, so we can quickly clone from it for each test without re-running migrations
     * 5. Fetch Tinybird tokens from the tinybird-local service and store in /data/state/tinybird.json
     *
     * NOTE: Playwright workers run in their own processes, so each worker gets its own instance of EnvironmentManager.
     * This is why we need to use a shared state file for Tinybird tokens - this.tinybird instance is not shared between workers.
     */
    public async globalSetup(): Promise<void> {
        logging.info('Starting global environment setup...');
        await this.cleanupLeftoverResources();
        this.dockerCompose.up();
        await this.dockerCompose.waitForAll();
        await this.mysql.createSnapshot();
        this.tinybird.fetchAndSaveConfig();
        logging.info('Global environment setup complete');
    }

    /**
     * Teardown global environment
     * This should be called once after all tests have finished.
     *
     * Note: Docker compose services are left running for reuse across test runs.
     * To fully stop all services, manually run: docker compose down
     *
     * 1. Remove all Ghost containers
     * 2. Clean up test databases
     * 3. Recreate the ghost_testing database for the next run
     * 4. Truncate Tinybird analytics_events datasource
     * 5. If PRESERVE_ENV=true is set, skip the teardown to allow manual inspection
     */
    public async globalTeardown(): Promise<void> {
        if (this.shouldPreserveEnvironment()) {
            logging.info('PRESERVE_ENV is set to true - skipping global environment teardown');
            return;
        }
        logging.info('Starting global environment teardown...');

        // Clean up Ghost containers
        await this.ghost.removeAll();

        // Clean up test databases
        await this.mysql.dropAllTestDatabases();

        // Recreate the base database for the next run
        await this.mysql.recreateBaseDatabase();

        // This ensures a clean slate for each test run.
        this.tinybird.truncateAnalyticsEvents();

        logging.info('Global environment teardown complete (docker compose services left running)');
    }

    /**
     * Setup an isolated Ghost instance for a test
     */
    public async setupGhostInstance(): Promise<GhostInstance> {
        try {
            const siteUuid = randomUUID();
            const instanceId = `ghost_${siteUuid}`;
            await this.mysql.setupTestDatabase(instanceId, siteUuid);
            const portalUrl = await this.getPortalUrl();
            return await this.ghost.startInstance(instanceId, siteUuid, portalUrl);
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
            await this.ghost.remove(ghostInstance.containerId);
            await this.mysql.cleanupTestDatabase(ghostInstance.database);
            debug('Ghost instance teardown completed');
        } catch (error) {
            logging.error('Failed to teardown Ghost instance:', error);
            // Don't throw - we want tests to continue even if cleanup fails
        }
    }

    private cleanupStateFiles(): void {
        try {
            if (fs.existsSync(CONFIG_DIR)) {
                // Delete all files in the directory, but keep the directory itself
                const files = fs.readdirSync(CONFIG_DIR);
                for (const file of files) {
                    const filePath = path.join(CONFIG_DIR, file);
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

    private shouldPreserveEnvironment(): boolean {
        return process.env.PRESERVE_ENV === 'true';
    }
}
