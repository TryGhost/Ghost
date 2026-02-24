import baseDebug from '@tryghost/debug';
import logging from '@tryghost/logging';
import {GhostInstance, MySQLManager} from './service-managers';
import {GhostManager} from './service-managers/ghost-manager';
import {getLatestMigrationFileName, getMissingAuthStateFiles, shouldForceFixtureReset} from '@/helpers/utils/fixture-cache';
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
type CacheStatus =
    | {isValid: true; reason: 'cache_hit'}
    | {isValid: false; reason: 'ci_always_rebuild' | 'forced_fixture_reset' | 'missing_snapshot' | 'missing_auth_state' | 'missing_migration_files' | 'missing_migrations_table' | 'migration_mismatch'};
type GlobalSetupResult = {baseUrl: string; cacheHit: boolean};

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
     * Global setup for the fixture package.
     *
     * On cache miss: recreate the base database and boot Ghost so migrations run.
     * On cache hit: reuse existing base DB + snapshot/auth state package.
     *
     * Snapshot creation is deferred until global.setup.ts completes user onboarding.
     */
    async globalSetup(): Promise<GlobalSetupResult> {
        logging.info(`Starting ${this.mode} environment global setup...`);

        const cacheStatus = await this.getCacheStatus();
        const cacheHit = cacheStatus.isValid;
        if (cacheHit) {
            logging.info('Fixture cache hit - reusing snapshot + auth state package');
        } else {
            logging.info(`Fixture cache miss (${cacheStatus.reason}) - rebuilding fixture package`);
        }

        await this.cleanupResources({deleteSnapshot: !cacheHit});

        if (!cacheHit) {
            await this.mysql.recreateBaseDatabase('ghost_e2e_base');
        }

        await this.ghost.setup('ghost_e2e_base');
        await this.ghost.waitForReady();
        this.initialized = true;

        const baseUrl = `http://localhost:${this.ghost.getGatewayPort()}`;

        logging.info(`${this.mode} environment global setup complete`);
        return {baseUrl, cacheHit};
    }

    /**
     * Persist a reusable DB snapshot after global user/role setup is complete.
     */
    async createSnapshot(): Promise<void> {
        await this.mysql.createSnapshot('ghost_e2e_base');
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
        await this.cleanupResources({deleteSnapshot: this.isCI()});
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

    private async cleanupResources(options: {deleteSnapshot?: boolean} = {}): Promise<void> {
        const shouldDeleteSnapshot = options.deleteSnapshot ?? true;

        logging.info('Cleaning up e2e resources...');
        await this.ghost.cleanupAllContainers();
        await this.mysql.dropAllTestDatabases();
        if (shouldDeleteSnapshot) {
            await this.mysql.deleteSnapshot();
        }
        this.initialized = false;
        logging.info('E2E resources cleaned up');
    }

    private shouldPreserveEnvironment(): boolean {
        return process.env.PRESERVE_ENV === 'true';
    }

    private isCI(): boolean {
        return process.env.CI === 'true';
    }

    private async getCacheStatus(): Promise<CacheStatus> {
        if (this.isCI()) {
            return {isValid: false, reason: 'ci_always_rebuild'};
        }

        if (shouldForceFixtureReset()) {
            return {isValid: false, reason: 'forced_fixture_reset'};
        }

        const snapshotExists = await this.mysql.snapshotExists();
        if (!snapshotExists) {
            return {isValid: false, reason: 'missing_snapshot'};
        }

        const missingAuthStateFiles = getMissingAuthStateFiles();
        if (missingAuthStateFiles.length > 0) {
            return {isValid: false, reason: 'missing_auth_state'};
        }

        const latestMigrationFileName = await getLatestMigrationFileName();
        if (!latestMigrationFileName) {
            return {isValid: false, reason: 'missing_migration_files'};
        }

        const latestAppliedMigration = await this.mysql.getLatestMigrationName('ghost_e2e_base');
        if (!latestAppliedMigration) {
            return {isValid: false, reason: 'missing_migrations_table'};
        }

        if (latestAppliedMigration !== latestMigrationFileName) {
            return {isValid: false, reason: 'migration_mismatch'};
        }

        return {isValid: true, reason: 'cache_hit'};
    }
}
