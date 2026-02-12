import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG_DIR = path.resolve(__dirname, '../../data/state');

export const DOCKER_COMPOSE_CONFIG = {
    FILE_PATH: path.resolve(__dirname, '../../compose.yml'),
    PROJECT: 'ghost-e2e'
};

export const GHOST_DEFAULTS = {
    PORT: 2368
};

export interface GhostImageProfile {
    image: string;
    workdir: string;
    command: string[];
}

export function getImageProfile(): GhostImageProfile {
    const image = process.env.GHOST_E2E_IMAGE || 'ghost-e2e:local';
    return {
        image,
        workdir: '/home/ghost',
        command: ['node', 'index.js']
    };
}

export const MYSQL = {
    HOST: 'mysql',
    PORT: 3306,
    USER: 'root',
    PASSWORD: 'root'
};

export const TINYBIRD = {
    LOCAL_HOST: 'tinybird-local',
    PORT: 7181,
    CLI_ENV_PATH: '/mnt/shared-config/.env.tinybird',
    CONFIG_DIR: CONFIG_DIR
};

export const PUBLIC_APPS = {
    PORTAL_URL: '/ghost/assets/portal/portal.min.js',
    COMMENTS_URL: '/ghost/assets/comments-ui/comments-ui.min.js',
    SODO_SEARCH_URL: '/ghost/assets/sodo-search/sodo-search.min.js',
    SODO_SEARCH_STYLES: '/ghost/assets/sodo-search/main.css',
    SIGNUP_FORM_URL: '/ghost/assets/signup-form/signup-form.min.js',
    ANNOUNCEMENT_BAR_URL: '/ghost/assets/announcement-bar/announcement-bar.min.js'
};

export const MAILPIT = {
    PORT: 1025
};

/**
 * Configuration for dev environment mode.
 * Used when yarn dev infrastructure is detected.
 */
export const DEV_ENVIRONMENT = {
    projectNamespace: 'ghost-dev',
    networkName: 'ghost_dev'
} as const;

export const TEST_ENVIRONMENT = {
    projectNamespace: 'ghost-dev-e2e',
    gateway: {
        image: 'ghost-dev-ghost-dev-gateway'
    },
    ghost: {
        image: 'ghost-dev-ghost-dev',
        workdir: '/home/ghost/ghost/core',
        port: 2368,
        env: [
            // Environment configuration
            'NODE_ENV=development',
            'server__host=0.0.0.0',
            `server__port=2368`,

            // Database configuration (database name is set per container)
            'database__client=mysql2',
            `database__connection__host=ghost-dev-mysql`,
            `database__connection__port=3306`,
            `database__connection__user=root`,
            `database__connection__password=root`,

            // Redis configuration
            'adapters__cache__Redis__host=ghost-dev-redis',
            'adapters__cache__Redis__port=6379',

            // Email configuration
            'mail__transport=SMTP',
            'mail__options__host=ghost-dev-mailpit',
            'mail__options__port=1025',

            // Public assets via gateway (same as compose.dev.yaml)
            `portal__url=${PUBLIC_APPS.PORTAL_URL}`,
            `comments__url=${PUBLIC_APPS.COMMENTS_URL}`,
            `sodoSearch__url=${PUBLIC_APPS.SODO_SEARCH_URL}`,
            `sodoSearch__styles=${PUBLIC_APPS.SODO_SEARCH_STYLES}`,
            `signupForm__url=${PUBLIC_APPS.SIGNUP_FORM_URL}`,
            `announcementBar__url=${PUBLIC_APPS.ANNOUNCEMENT_BAR_URL}`
        ]   
    }
} as const;

