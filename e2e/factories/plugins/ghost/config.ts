/**
 * Simple Ghost configuration from environment variables.
 */
export function getGhostConfig() {
    return {
        host: process.env.GHOST_DB_HOST || 'localhost',
        port: parseInt(process.env.GHOST_DB_PORT || '3306'),
        user: process.env.GHOST_DB_USER || 'root',
        password: process.env.GHOST_DB_PASSWORD || 'root',
        database: process.env.GHOST_DB_NAME || 'ghost'
    };
}