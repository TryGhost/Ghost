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
import {COMPOSE_FILE_PATH, COMPOSE_PROJECT, STATE_DIR} from './constants';

const debug = baseDebug('e2e:EnvironmentManager');

export interface GhostInstance {
    containerId: string; // docker container ID
    instanceId: string; // unique instance name (e.g. ghost_<siteUuid>)
    database: string;
    port: number;
    baseUrl: string;
    siteUuid: string;
}

// Tinybird state type is managed by TinybirdManager

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
    private docker: Docker;
    private dockerCompose: DockerCompose;
    private mysql: MySQLManager;
    private tinybird: TinybirdManager;
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

    /**
     * Setup shared global environment for tests (i.e. mysql, tinybird)
     * This should be called once before all tests run.
     *
     * 1. Start docker-compose services (including running Ghost migrations on the default database)
     * 2. Create a MySQL snapshot of the database after migrations, so we can quickly clone from it for each test without re-running migrations
     * 3. Fetch Tinybird tokens from the tinybird-local service and store in /data/state/tinybird.json
     */
    public async globalSetup(): Promise<void> {
        logging.info('Starting global environment setup...');
        this.dockerCompose.upAndWaitFor(['ghost-migrations', 'tb-cli']);
        await this.mysql.createSnapshot();
        this.tinybird.fetchTokens();
        logging.info('Global environment setup complete');
    }

    /**
     * Teardown global environment
     * This should be called once after all tests have finished.
     * 1. Stop and remove all docker-compose services
     * 2. Clean up any state files created during the tests
     3. If PRESERVE_ENV=true is set, skip the teardown to allow manual inspection
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
            return await this.ghost.startInstance(instanceId, siteUuid);
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
            if (fs.existsSync(STATE_DIR)) {
                // Delete all files in the directory, but keep the directory itself
                const files = fs.readdirSync(STATE_DIR);
                for (const file of files) {
                    const filePath = path.join(STATE_DIR, file);
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
