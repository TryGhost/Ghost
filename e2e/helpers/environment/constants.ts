import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG_DIR = path.resolve(__dirname, '../../data/state');

// Repository root path (for compose files and source mounting)
export const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * Compose file paths for infrastructure services.
 * Used by EnvironmentManager to start required services.
 */
export const COMPOSE_FILES = {
    infra: path.resolve(REPO_ROOT, 'compose.infra.yaml'),
    dev: path.resolve(REPO_ROOT, 'compose.dev.yaml'),
    analytics: path.resolve(REPO_ROOT, 'compose.analytics.yaml')
} as const;

/**
 * Caddyfile paths for different modes.
 * - dev: Proxies to host dev servers for HMR
 * - build: Minimal passthrough (assets served by Ghost from /content/files/)
 */
export const CADDYFILE_PATHS = {
    dev: path.resolve(REPO_ROOT, 'docker/dev-gateway/Caddyfile'),
    build: path.resolve(REPO_ROOT, 'docker/dev-gateway/Caddyfile.build')
} as const;

/**
 * Build mode image configuration.
 * Used for build mode - can be locally built or pulled from registry.
 * 
 * Override with environment variable:
 * - GHOST_E2E_IMAGE: Image name (default: ghost-e2e-local)
 * 
 * Examples:
 * - Local: ghost-e2e-local (built from e2e/Dockerfile)
 * - Registry: ghcr.io/tryghost/ghost-development:5.x.x
 * - Community: ghost
 */
export const BUILD_IMAGE = process.env.GHOST_E2E_IMAGE || 'ghost-e2e-local';

export const TINYBIRD = {
    LOCAL_HOST: 'tinybird-local',
    PORT: 7181,
    CLI_ENV_PATH: '/mnt/shared-config/.env.tinybird',
    CONFIG_DIR: CONFIG_DIR
};

/**
 * Configuration for dev environment mode.
 * Used when yarn dev infrastructure is detected.
 */
export const DEV_ENVIRONMENT = {
    projectNamespace: 'ghost-dev',
    networkName: 'ghost_dev'
} as const;

/**
 * Base environment variables shared by all modes.
 */
export const BASE_GHOST_ENV = [
    // Environment configuration
    'NODE_ENV=development',
    'server__host=0.0.0.0',
    'server__port=2368',

    // Database configuration (database name is set per container)
    'database__client=mysql2',
    'database__connection__host=ghost-dev-mysql',
    'database__connection__port=3306',
    'database__connection__user=root',
    'database__connection__password=root',

    // Redis configuration
    'adapters__cache__Redis__host=ghost-dev-redis',
    'adapters__cache__Redis__port=6379',

    // Email configuration
    'mail__transport=SMTP',
    'mail__options__host=ghost-dev-mailpit',
    'mail__options__port=1025'
] as const;

/**
 * Public app asset URLs for dev mode (served via gateway proxying to host dev servers).
 * Local mode has these baked into the E2E image via ENV vars in e2e/Dockerfile.
 */
export const LOCAL_ASSET_URLS = [
    'portal__url=/ghost/assets/portal/portal.min.js',
    'comments__url=/ghost/assets/comments-ui/comments-ui.min.js',
    'sodoSearch__url=/ghost/assets/sodo-search/sodo-search.min.js',
    'sodoSearch__styles=/ghost/assets/sodo-search/main.css',
    'signupForm__url=/ghost/assets/signup-form/signup-form.min.js',
    'announcementBar__url=/ghost/assets/announcement-bar/announcement-bar.min.js'
] as const;

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
            ...BASE_GHOST_ENV,
            // Public assets via gateway (same as compose.dev.yaml)
            ...LOCAL_ASSET_URLS
        ]   
    }
} as const;

