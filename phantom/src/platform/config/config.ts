import {loadEnv} from './env.js';

export type DatabaseConfig = {
    url: string;
    authToken?: string;
};

export type AppConfig = {
    port: number;
    db: DatabaseConfig;
};

export const loadConfig = (): AppConfig => {
    const env = loadEnv();

    return {
        port: env.GHOST_PORT,
        db: {
            url: env.GHOST_DB_URL,
            authToken: env.GHOST_DB_AUTH_TOKEN
        }
    };
};
