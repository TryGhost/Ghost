import knex from 'knex';
import logging from '@tryghost/logging';

interface DatabaseConfig {
    client: string;
    connection: {
        host: string;
        user: string;
        password: string;
        database: string;
    };
}

function getDatabaseConfig(): DatabaseConfig {
    return {
        client: 'mysql2',
        connection: {
            host: process.env.database__connection__host || 'mysql-test',
            user: process.env.database__connection__user || 'root',
            password: process.env.database__connection__password || 'root',
            database: process.env.database__connection__database || 'ghost_test'
        }
    };
}

export async function resetDb(): Promise<void> {
    const config = getDatabaseConfig();
    logging.info('Resetting database', config);
    const db = knex(config);

    try {
        await db('sessions').truncate();
    } finally {
        await db.destroy();
    }
}
