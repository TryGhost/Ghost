export const config = {
    baseUrl: process.env.GHOST_BASE_URL || 'http://localhost:2368',
    ghostDb: {
        host: process.env.GHOST_DB_HOST || 'localhost',
        port: parseInt(process.env.GHOST_DB_PORT || '3306'),
        user: process.env.GHOST_DB_USER || 'root',
        password: process.env.GHOST_DB_PASSWORD || 'root',
        database: process.env.GHOST_DB_NAME || 'ghost'
    },
    tinyBird: {
        host: process.env.TINYBIRD_HOST || 'http://localhost:7181',
        token: process.env.TINYBIRD_TOKEN || 'test-token'
    }
} as const;
