import {loadEnv} from './env.js';

export type DatabaseConfig = {
    url: string;
    authToken?: string;
};

export type AppConfig = {
    port: number;
    db: DatabaseConfig;
    memberAuth: {
        signupPolicy: 'open' | 'invite-only' | 'paid-only' | 'none';
    };
};

export const loadConfig = (): AppConfig => {
    const env = loadEnv();

    const db = env.GHOST_DB_AUTH_TOKEN
        ? {url: env.GHOST_DB_URL, authToken: env.GHOST_DB_AUTH_TOKEN}
        : {url: env.GHOST_DB_URL};

    return {
        port: env.GHOST_PORT,
        db,
        memberAuth: {
            signupPolicy: env.GHOST_SIGNUP_POLICY
        }
    };
};
