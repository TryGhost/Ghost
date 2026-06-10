import {createClient} from '@libsql/client';
import {drizzle} from 'drizzle-orm/libsql';
import type {DatabaseConfig} from '../platform/config/config.js';

export const createDb = (config: DatabaseConfig) => {
    const client = createClient({
        url: config.url,
        ...(config.authToken !== undefined ? {authToken: config.authToken} : {})
    });

    return drizzle(client);
};

export type DbClient = ReturnType<typeof createDb>;
