import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import logging from '@tryghost/logging';
import {DevGhostManager} from './service-managers/dev-ghost-manager';
import {DockerCompose} from './docker-compose';
import {GhostInstance, MySQLManager} from './service-managers';
import {randomUUID} from 'crypto';

const debug = baseDebug('e2e:DevEnvironmentManager');

/**
 * Orchestrates e2e test environment when dev infrastructure is available.
 * 
 * Uses:
 * - MySQLManager with DockerCompose pointing to ghost-dev project
 * - DevGhostManager for Ghost/Gateway container lifecycle
 * 
 * All e2e containers use the 'ghost-dev-e2e' project namespace for easy cleanup.
 */
export class DevEnvironmentManager {
    private readonly workerIndex: number;
    private readonly dockerCompose: DockerCompose;
    private readonly mysql: MySQLManager;
    private readonly ghost: DevGhostManager;
    private initialized = false;

    constructor() {
        this.workerIndex = parseInt(process.env.TEST_PARALLEL_INDEX || '0', 10);
        
        // Use DockerCompose pointing to ghost-dev project to find MySQL container
        this.dockerCompose = new DockerCompose({
            composeFilePath: '', // Not needed for container lookup
            projectName: 'ghost-dev',
            docker: new Docker()
        });
        this.mysql = new MySQLManager(this.dockerCompose);
        this.ghost = new DevGhostManager({
            workerIndex: this.workerIndex
        });
    }

    /**
     * Global setup - creates database snapshot for test isolation.
     * Mirrors the standalone environment: run migrations, then snapshot.
     */
    async globalSetup(): Promise<void> {
        logging.info('Starting dev environment global setup...');

        await this.cleanupResources();
        
        // Create base database, run migrations, then snapshot
        // This mirrors what docker-compose does with ghost-migrations service
        await this.mysql.recreateBaseDatabase('ghost_e2e_base');
        await this.ghost.runMigrations('ghost_e2e_base');
        await this.mysql.createSnapshot('ghost_e2e_base');

        logging.info('Dev environment global setup complete');
    }

    /**
     * Global teardown - cleanup resources.
     */
    async globalTeardown(): Promise<void> {
        if (this.shouldPreserveEnvironment()) {
            logging.info('PRESERVE_ENV is set - skipping teardown');
            return;
        }

        logging.info('Starting dev environment global teardown...');
        await this.cleanupResources();
        logging.info('Dev environment global teardown complete');
    }

    /**
     * Per-test setup - creates containers on first call, then clones database and restarts Ghost.
     */
    async perTestSetup(options: {config?: unknown} = {}): Promise<GhostInstance> {
        // Lazy initialization of Ghost containers (once per worker)
        if (!this.initialized) {
            debug('Initializing Ghost containers for worker', this.workerIndex);
            await this.ghost.setup();
            this.initialized = true;
        }

        const siteUuid = randomUUID();
        const instanceId = `ghost_e2e_${siteUuid.replace(/-/g, '_')}`;

        // Setup database
        await this.mysql.setupTestDatabase(instanceId, siteUuid);

        // Restart Ghost with new database
        const extraConfig = options.config as Record<string, string> | undefined;
        await this.ghost.restartWithDatabase(instanceId, extraConfig);
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
