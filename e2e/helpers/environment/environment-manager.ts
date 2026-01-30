import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import logging from '@tryghost/logging';
import {DOCKER_COMPOSE_CONFIG, PORTAL, TINYBIRD} from './constants';
import {DockerCompose} from './docker-compose';
import {GhostInstance, GhostManager, MySQLManager, PortalManager, TinybirdManager} from './service-managers';
import {randomUUID} from 'crypto';

const debug = baseDebug('e2e:EnvironmentManager');

/**
 * Manages the lifecycle of Docker containers and shared services for end-to-end tests
 *
 * @usage
 * ```
 * const environmentManager = new EnvironmentManager();
 * await environmentManager.globalSetup(); // Call once before all tests to start MySQL, Tinybird, etc.
 * const ghostInstance = await environmentManager.perTestSetup(); // Call before each test to create an isolated Ghost instance
 * await environmentManager.perTestTeardown(ghostInstance); // Call after each test to clean up the Ghost instance
 * await environmentManager.globalTeardown(); // Call once after all tests to stop shared services
 * ````
 */
export class EnvironmentManager {
    private readonly dockerCompose: DockerCompose;
    private readonly mysql: MySQLManager;
    private readonly tinybird: TinybirdManager;
    private readonly ghost: GhostManager;
    private readonly portal: PortalManager;

    constructor(
        composeFilePath: string = DOCKER_COMPOSE_CONFIG.FILE_PATH,
        composeProjectName: string = DOCKER_COMPOSE_CONFIG.PROJECT
    ) {
        const docker = new Docker();
        this.dockerCompose = new DockerCompose({
            composeFilePath: composeFilePath,
            projectName: composeProjectName,
            docker: docker
        });

        this.mysql = new MySQLManager(this.dockerCompose);
        this.tinybird = new TinybirdManager(this.dockerCompose, TINYBIRD.CONFIG_DIR, TINYBIRD.CLI_ENV_PATH);
        this.ghost = new GhostManager(docker, this.dockerCompose, this.tinybird);
        this.portal = new PortalManager(this.dockerCompose, PORTAL.PORT);
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
     *
     * When GHOST_E2E_COMPOSE_RUNNING=true (external compose mode), compose services are assumed
     * to already be running on the host. See isExternalComposeMode() for details.
     */
    public async globalSetup(): Promise<void> {
        logging.info('Starting global environment setup...');

        if (this.isExternalComposeMode()) {
            logging.info('External compose mode: services already running on host');
            await this.cleanupResourcesWithoutCompose();
            await this.mysql.createSnapshot();
            // Tinybird config should already be fetched by the host
            logging.info('Global environment setup complete (external compose mode)');
            return;
        }

        await this.cleanupResources();
        await this.dockerCompose.up();
        await this.mysql.createSnapshot();
        this.tinybird.fetchAndSaveConfig();

        logging.info('Global environment setup complete');
    }

    /**
     * Setup that executes on each test start
     */
    public async perTestSetup(options: {config?: unknown} = {}): Promise<GhostInstance> {
        try {
            const {siteUuid, instanceId} = this.uniqueTestDetails();
            await this.mysql.setupTestDatabase(instanceId, siteUuid);
            const portalUrl = await this.portal.getUrl();

            return await this.ghost.createAndStartInstance(instanceId, siteUuid, portalUrl, options.config);
        } catch (error) {
            logging.error('Failed to setup Ghost instance:', error);
            throw new Error(`Failed to setup Ghost instance: ${error}`);
        }
    }

    /**
     * This should be called once after all tests have finished.
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

        if (this.isExternalComposeMode()) {
            await this.cleanupResourcesWithoutCompose();
        } else {
            await this.cleanupResources();
        }

        logging.info('Global environment teardown complete (docker compose services left running)');
    }

    /**
     * Setup that executes on each test stop
     */
    public async perTestTeardown(ghostInstance: GhostInstance): Promise<void> {
        try {
            debug('Tearing down Ghost instance:', ghostInstance.containerId);

            await this.ghost.stopAndRemoveInstance(ghostInstance.containerId);
            await this.mysql.cleanupTestDatabase(ghostInstance.database);

            debug('Ghost instance teardown completed');
        } catch (error) {
            // Don't throw - we want tests to continue even if cleanup fails
            logging.error('Failed to teardown Ghost instance:', error);
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
    private async cleanupResources(): Promise<void> {
        try {
            logging.info('Cleaning up leftover resources from previous test runs...');

            await this.ghost.removeAll();
            await this.mysql.dropAllTestDatabases();
            await this.mysql.deleteSnapshot();
            await this.mysql.recreateBaseDatabase();
            this.tinybird.truncateAnalyticsEvents();

            logging.info('Leftover resources cleaned up successfully');
        } catch (error) {
            // Don't throw - we want to continue with setup even if cleanup fails
            logging.warn('Failed to clean up some leftover resources:', error);
        }
    }

    private shouldPreserveEnvironment(): boolean {
        return process.env.PRESERVE_ENV === 'true';
    }

    /**
     * External Compose Mode (GHOST_E2E_COMPOSE_RUNNING=true)
     *
     * When tests run inside a container (CI or local containerized testing),
     * Docker Compose services must be started on the HOST because:
     *
     * 1. Volume mount paths in compose.yml are host paths, not container paths
     * 2. The `docker compose` CLI would fail to resolve paths inside the container
     *
     * In this mode:
     * - Skip `docker compose` CLI commands (up, down, run)
     * - Use dockerode API directly for container operations (works via mounted socket)
     * - Tinybird config must be fetched by the host before tests start
     *
     * The dockerode library communicates with Docker via the Unix socket,
     * which works when the socket is mounted into the test container.
     */
    private isExternalComposeMode(): boolean {
        return process.env.GHOST_E2E_COMPOSE_RUNNING === 'true';
    }

    /**
     * Clean up resources without using docker compose CLI commands.
     * Used in external compose mode where compose services are running on the host.
     * Only performs dockerode-based operations that work through the mounted socket.
     *
     * NOTE: We do NOT call recreateBaseDatabase() here because ghost-migrations
     * has already run and populated ghost_testing with tables. Recreating it
     * would wipe out the migrated schema.
     *
     * NOTE: We skip tinybird.truncateAnalyticsEvents() because it uses `docker compose run`
     * which would fail inside the container.
     */
    private async cleanupResourcesWithoutCompose(): Promise<void> {
        try {
            logging.info('Cleaning up resources (external compose mode)...');

            // These use dockerode API directly, not compose CLI
            await this.ghost.removeAll();
            await this.mysql.dropAllTestDatabases();
            await this.mysql.deleteSnapshot();

            logging.info('Resources cleaned up (external compose mode)');
        } catch (error) {
            logging.warn('Failed to clean up some resources:', error);
        }
    }

    // each test is going to have unique Ghost container, and site uuid for analytic events
    private uniqueTestDetails() {
        const siteUuid = randomUUID();
        const instanceId = `ghost_${siteUuid}`;

        return {
            siteUuid,
            instanceId
        };
    }
}
