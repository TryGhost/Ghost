/**
 * Simple Ghost configuration from environment variables.
 */
export function ghostConfig() {
    return {
        host: process.env.GHOST_DB_HOST || 'localhost',
        port: parseInt(process.env.GHOST_DB_PORT || '3306'),
        user: process.env.GHOST_DB_USER || 'root',
        password: process.env.GHOST_DB_PASSWORD || 'root',
        database: process.env.GHOST_DB_NAME || 'ghost'
    };
}

export function tinybirdConfig() {
    return {
        host: process.env.TINYBIRD_HOST || 'http://localhost:7181/v0/events',
        token: process.env.TINYBIRD_TOKEN || 'test-token'
    };
}
