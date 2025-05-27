import knex from 'knex';

interface DatabaseConfig {
    client: string;
    connection: {
        host?: string;
        user?: string;
        password?: string;
        database?: string;
        filename?: string;
    };
}

function getDatabaseConfig(): DatabaseConfig {
    const nodeEnv = process.env.NODE_ENV || 'testing';

    if (nodeEnv.includes('mysql')) {
        return {
            client: 'mysql2',
            connection: {
                host: process.env.database__connection__host || 'localhost',
                user: process.env.database__connection__user || 'root',
                password: process.env.database__connection__password || 'root',
                database: process.env.database__connection__database || 'ghost_testing'
            }
        };
    }

    return {
        client: 'sqlite3',
        connection: {
            filename: process.env.database__connection__filename || '/dev/shm/ghost-test.db'
        }
    };
}

export async function resetDb(): Promise<void> {
    const config = getDatabaseConfig();
    const db = knex(config);

    try {
        await db('sessions').truncate();
    } finally {
        await db.destroy();
    }
}
