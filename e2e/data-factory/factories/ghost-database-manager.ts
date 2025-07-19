import knex, {Knex} from 'knex';
import {GhostSetup} from './ghost-setup';

export interface GhostDatabaseConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
}

/**
 * Ghost-specific database manager for e2e testing.
 * This class handles Ghost MySQL database connections using knex and manages
 * the database state for testing purposes. It is NOT a generic database manager.
 * 
 * This class is tightly coupled to Ghost's database schema and setup requirements.
 */
export class GhostDatabaseManager {
    private db: Knex;
    private ghostSetup: GhostSetup;

    constructor(config: GhostDatabaseConfig = {}) {
        // Initialize knex connection specifically for Ghost's MySQL database
        this.db = knex({
            client: 'mysql2',
            connection: {
                host: config.host || process.env.database__connection__host || 'localhost',
                port: config.port || parseInt(process.env.database__connection__port || '3306'),
                user: config.user || process.env.database__connection__user || 'root',
                password: config.password || process.env.database__connection__password || 'root',
                database: config.database || process.env.database__connection__database || 'ghost',
                charset: 'utf8mb4'
            },
            pool: {min: 0, max: 5}
        });

        this.ghostSetup = new GhostSetup(this.db);
    }

    /**
     * Get the underlying knex database connection for Ghost
     */
    getDb(): Knex {
        return this.db;
    }
    
    /**
     * Get site UUID from Ghost settings
     */
    async getSiteUuid(): Promise<string | null> {
        try {
            const result = await this.db('settings')
                .where('key', 'site_uuid')
                .first();
            
            return result?.value || null;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Wait for Ghost to be fully booted (site_uuid exists)
     */
    async waitForGhostBoot(maxRetries: number = 30, retryDelayMs: number = 1000): Promise<boolean> {
        for (let i = 0; i < maxRetries; i++) {
            const siteUuid = await this.getSiteUuid();
            if (siteUuid) {
                return true;
            }
            
            if (i < maxRetries - 1) {
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, retryDelayMs);
                });
            }
        }
        
        return false;
    }

    /**
     * Check if Ghost database is ready for testing
     */
    async isReady(): Promise<boolean> {
        try {
            await this.db.raw('SELECT 1');
            return !await this.ghostSetup.needsInitialization();
        } catch (error) {
            return false;
        }
    }

    /**
     * Ensure Ghost database is set up and ready for tests
     */
    async ensureReady(): Promise<void> {
        if (!await this.isReady()) {
            throw new Error('Ghost database is not ready. Please run Ghost migrations first.');
        }

        await this.ghostSetup.ensureReady({
            name: 'Test Admin',
            email: 'test+admin@test.com',
            password: 'P4ssw0rd123$',
            blogTitle: 'Test Site',
            description: 'A test site for e2e testing'
        });
    }

    /**
     * Reset Ghost database to clean state for testing
     */
    async reset(): Promise<void> {
        await this.ghostSetup.resetToFreshState();
        await this.ensureReady();
    }

    /**
     * Get Ghost setup status
     */
    async getSetupStatus(): Promise<{
        isReady: boolean;
        needsInitialization: boolean;
        setupComplete: boolean;
    }> {
        const isReady = await this.isReady();
        const needsInitialization = await this.ghostSetup.needsInitialization();
        const setupComplete = await this.ghostSetup.isSetupComplete();

        return {
            isReady,
            needsInitialization,
            setupComplete
        };
    }

    /**
     * Close Ghost database connection
     */
    async close(): Promise<void> {
        await this.db.destroy();
    }
}

// Singleton instance to ensure database setup only happens once
let instance: GhostDatabaseManager | null = null;

/**
 * Get the singleton instance of GhostDatabaseManager.
 * This ensures database setup only happens once across all tests.
 */
export function getGhostDatabaseManager(): GhostDatabaseManager {
    if (!instance) {
        instance = new GhostDatabaseManager();
    }
    return instance;
}

/**
 * Close and reset the singleton instance.
 * Use this in global teardown.
 */
export async function closeGhostDatabaseManager(): Promise<void> {
    if (instance) {
        await instance.close();
        instance = null;
    }
}