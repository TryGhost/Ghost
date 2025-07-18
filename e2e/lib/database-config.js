/**
 * Database configuration helper for E2E tests
 */

/**
 * Get database configuration from environment variables
 * @returns {Object} Knex database configuration
 */
function getDatabaseConfig() {
    // Check for explicit database config
    const client = process.env.database__client;
    
    if (client === 'sqlite3') {
        // SQLite configuration (requires sqlite3 package to be installed)
        const filename = process.env.database__connection__filename || '/tmp/ghost-test.db';
        
        return {
            client: 'sqlite3',
            connection: {
                filename
            },
            useNullAsDefault: true,
            debug: false
        };
    } else {
        // Default to MySQL (which is available in Ghost)
        const host = process.env.database__connection__host || 'localhost';
        const port = process.env.database__connection__port || 3306;
        const user = process.env.database__connection__user || 'root';
        const password = process.env.database__connection__password || 'root';
        const database = process.env.database__connection__database || 'ghost';
        
        return {
            client: 'mysql2',
            connection: {
                host,
                port: parseInt(port, 10),
                user,
                password,
                database,
                charset: 'utf8mb4'
            },
            pool: {
                min: 0,
                max: 5
            },
            acquireConnectionTimeout: 60000,
            useNullAsDefault: true
        };
    }
}

/**
 * Get database configuration for specific test environment
 * @param {string} env - Test environment (e.g., 'ci', 'local')
 * @returns {Object} Knex database configuration
 */
function getDatabaseConfigForEnv(env) {
    switch (env) {
    case 'ci':
        return {
            client: 'mysql2',
            connection: {
                host: 'localhost',
                port: 3306,
                user: 'root',
                password: 'root',
                database: 'ghost_test',
                charset: 'utf8mb4',
                timezone: 'UTC'
            },
            pool: {min: 0, max: 5},
            useNullAsDefault: true
        };
        
    case 'local':
        return {
            client: 'sqlite3',
            connection: {
                filename: ':memory:'
            },
            useNullAsDefault: true
        };
        
    default:
        return getDatabaseConfig();
    }
}

module.exports = {
    getDatabaseConfig,
    getDatabaseConfigForEnv
};