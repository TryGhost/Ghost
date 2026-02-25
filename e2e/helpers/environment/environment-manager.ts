import baseDebug from '@tryghost/debug';
import logging from '@tryghost/logging';
import {GhostInstance, MySQLManager} from './service-managers';
import {GhostManager} from './service-managers/ghost-manager';
import {randomUUID} from 'crypto';
import type {GhostConfig} from '@/helpers/playwright/fixture';

const debug = baseDebug('e2e:EnvironmentManager');

/**
 * Environment modes for E2E testing.
 * 
 * - dev: Uses dev infrastructure with hot-reloading dev servers (default)
 * - build: Uses pre-built image (local or registry, controlled by GHOST_E2E_IMAGE)
 */
export type EnvironmentMode = 'dev' | 'build';
type GhostEnvOverrides = GhostConfig | Record<string, string>;

/**
 * Orchestrates e2e test environment.
 * 
 * Supports two modes controlled by GHOST_E2E_MODE environment variable:
 * - dev (default): Uses dev infrastructure with hot-reloading
 * - build: Uses pre-built image (set GHOST_E2E_IMAGE for registry images)
 * 
 * All modes use the same infrastructure (MySQL, Redis, Mailpit, Tinybird)
 * started via docker compose. Ghost and gateway containers are created
 * dynamically per-worker for test isolation.
 */
export class EnvironmentManager {
    private readonly mode: EnvironmentMode;
    private readonly workerIndex: number;
    private readonly mysql: MySQLManager;
    private readonly ghost: GhostManager;
    private initialized = false;

    constructor() {
        this.mode = this.detectMode();
        this.workerIndex = parseInt(process.env.TEST_PARALLEL_INDEX || '0', 10);
        
        this.mysql = new MySQLManager();
        this.ghost = new GhostManager({
            workerIndex: this.workerIndex,
            mode: this.mode
        });
    }

    /**
     * Detect environment mode from GHOST_E2E_MODE environment variable.
     */
    private detectMode(): EnvironmentMode {
        const envMode = process.env.GHOST_E2E_MODE;
        return (envMode === 'build') ? 'build' : 'dev'; // Default to dev mode
    }

    /**
     * Global setup - creates database snapshot for test isolation.
     * 
     * Creates the worker 0 containers (Ghost + Gateway) and waits for Ghost to
     * become healthy. Ghost automatically runs migrations on startup. Once healthy,
     * we snapshot the database for test isolation.
     */
    async globalSetup(): Promise<void> {
        logging.info(`Starting ${this.mode} environment global setup...`);

        await this.cleanupResources();

        // Create base database
        await this.mysql.recreateBaseDatabase('ghost_e2e_base');

        // Create containers and wait for Ghost to be healthy (runs migrations)
        await this.ghost.setup('ghost_e2e_base');
        await this.ghost.waitForReady();
        this.initialized = true;

        // Snapshot the migrated database for test isolation
        await this.mysql.createSnapshot('ghost_e2e_base');

        logging.info(`${this.mode} environment global setup complete`);
    }

    /**
     * Global teardown - cleanup resources.
     */
    async globalTeardown(): Promise<void> {
        if (this.shouldPreserveEnvironment()) {
            logging.info('PRESERVE_ENV is set - skipping teardown');
            return;
        }

        logging.info(`Starting ${this.mode} environment global teardown...`);
        await this.cleanupResources();
        logging.info(`${this.mode} environment global teardown complete`);
    }

    /**
     * Per-test setup - creates containers on first call, then clones database and restarts Ghost.
     */
    async perTestSetup(options: {config?: GhostEnvOverrides} = {}): Promise<GhostInstance> {
        // Lazy initialization of Ghost containers (once per worker)
        if (!this.initialized) {
            debug('Initializing Ghost containers for worker', this.workerIndex, 'in mode', this.mode);
            await this.ghost.setup();
            this.initialized = true;
        }

        const siteUuid = randomUUID();
        const instanceId = `ghost_e2e_${siteUuid.replace(/-/g, '_')}`;

        // Setup database
        await this.mysql.setupTestDatabase(instanceId, siteUuid);

        // Restart Ghost with new database
        await this.ghost.restartWithDatabase(instanceId, options.config);
        await this.ghost.waitForReady();

        const port = this.ghost.getGatewayPort();

        return {
            containerId: this.ghost.ghostContainerId!,
            instanceId,
            database: instanceId,
            port,
            baseUrl: `http://localhost:${port}`,
            siteUuid
        };
    }

    /**
     * Per-test teardown - drops test database.
     */
    async perTestTeardown(instance: GhostInstance): Promise<void> {
        await this.mysql.cleanupTestDatabase(instance.database);
    }

    private async cleanupResources(): Promise<void> {
        logging.info('Cleaning up e2e resources...');
        await this.ghost.cleanupAllContainers();
        await this.mysql.dropAllTestDatabases();
        await this.mysql.deleteSnapshot();
        logging.info('E2E resources cleaned up');
    }

    private shouldPreserveEnvironment(): boolean {
        return process.env.PRESERVE_ENV === 'true';
    }
}
