import {loadEnv} from './env.js';

export type DatabaseConfig = {
    url: string;
    authToken?: string;
};

export type AppConfig = {
    port: number;
    db: DatabaseConfig;
    identity: {
        ssoProviders: string[];
    };
    memberAuth: {
        signupPolicy: 'open' | 'invite-only' | 'paid-only' | 'none';
    };
    queue: {
        provider: 'memory';
    };
    themes: {
        provider: 'fs' | 'r2';
        fs: {
            root: string;
        };
        r2: {
            baseUrl: string | null;
            bundlePath: string;
            assetPath: string;
        };
    };
    hostSettings: Record<string, unknown>;
    security: {
        staffDeviceVerification: boolean;
    };
};

export const loadConfig = (): AppConfig => {
    const env = loadEnv();

    const db = env.GHOST_DB_AUTH_TOKEN
        ? {url: env.GHOST_DB_URL, authToken: env.GHOST_DB_AUTH_TOKEN}
        : {url: env.GHOST_DB_URL};

    const ssoProviders = env.GHOST_SSO_PROVIDERS
        ? env.GHOST_SSO_PROVIDERS.split(',').map((entry) => entry.trim()).filter(Boolean)
        : [];

    return {
        port: env.GHOST_PORT,
        db,
        identity: {
            ssoProviders
        },
        memberAuth: {
            signupPolicy: env.GHOST_SIGNUP_POLICY
        },
        queue: {
            provider: env.GHOST_QUEUE_PROVIDER
        },
        themes: {
            provider: env.GHOST_THEME_STORE,
            fs: {
                root: env.GHOST_THEME_FS_ROOT
            },
            r2: {
                baseUrl: env.GHOST_THEME_R2_BASE_URL ?? null,
                bundlePath: env.GHOST_THEME_R2_BUNDLE_PATH,
                assetPath: env.GHOST_THEME_R2_ASSET_PATH
            }
        },
        hostSettings: env.GHOST_HOST_SETTINGS ? JSON.parse(env.GHOST_HOST_SETTINGS) as Record<string, unknown> : {},
        security: {
            staffDeviceVerification: env.GHOST_STAFF_DEVICE_VERIFICATION === '1' || env.GHOST_STAFF_DEVICE_VERIFICATION === 'true'
        }
    };
};
