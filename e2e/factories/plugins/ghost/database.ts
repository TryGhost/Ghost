import knex, {Knex} from 'knex';
import {getGhostConfig} from './config';

/**
 * Simple database connection for Ghost.
 */
export function createDatabase(): Knex {
    const config = getGhostConfig();
    return knex({
        client: 'mysql2',
        connection: {
            ...config,
            charset: 'utf8mb4'
        },
        pool: {min: 0, max: 5}
    });
}

/**
 * Get site UUID from Ghost settings
 */
export async function getSiteUuid(db: Knex): Promise<string | null> {
    try {
        const result = await db('settings')
            .where('key', 'site_uuid')
            .first();
        return result?.value || null;
    } catch {
        return null;
    }
}