import knex, {Knex} from 'knex';
import {config} from '../../../config/config';

export function createDatabase(): Knex {
    return knex({
        client: 'mysql2',
        connection: {
            ...config.ghostDb,
            charset: 'utf8mb4'
        },
        pool: {min: 0, max: 5}
    });
}

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
