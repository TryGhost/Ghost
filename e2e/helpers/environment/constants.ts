import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG_DIR = path.resolve(__dirname, '../../data/state');

// Repository root path (for source mounting and config files)
export const REPO_ROOT = path.resolve(__dirname, '../../..');

export const DEV_COMPOSE_PROJECT = process.env.COMPOSE_PROJECT_NAME || 'ghost-dev';
// compose.dev.yaml pins the network name explicitly, so this does not follow COMPOSE_PROJECT_NAME.
export const DEV_NETWORK_NAME = 'ghost_dev';
export const DEV_SHARED_CONFIG_VOLUME = `${DEV_COMPOSE_PROJECT}_shared-config`;
export const DEV_PRIMARY_DATABASE = process.env.MYSQL_DATABASE || 'ghost_dev';

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
 * - GHOST_E2E_IMAGE: Image name (default: ghost-e2e:local)
 * 
 * Examples:
 * - Local: ghost-e2e:local (built from e2e/Dockerfile.e2e)
 * - Registry: ghcr.io/tryghost/ghost:latest (as E2E base image)
 * - Community: ghost
 */
export const BUILD_IMAGE = process.env.GHOST_E2E_IMAGE || 'ghost-e2e:local';

/**
 * Build mode gateway image.
 * Uses stock Caddy by default so CI does not need a custom gateway build.
 */
export const BUILD_GATEWAY_IMAGE = process.env.GHOST_E2E_GATEWAY_IMAGE || 'caddy:2-alpine';

export const TINYBIRD = {
    LOCAL_HOST: 'tinybird-local',
    PORT: 7181,
    JSON_PATH: path.resolve(CONFIG_DIR, 'tinybird.json')
};

/**
 * Configuration for dev environment mode.
 * Used when yarn dev infrastructure is detected.
 */
export const DEV_ENVIRONMENT = {
    projectNamespace: DEV_COMPOSE_PROJECT,
    networkName: DEV_NETWORK_NAME
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

export const TEST_ENVIRONMENT = {
    projectNamespace: 'ghost-dev-e2e',
    gateway: {
        image: `${DEV_COMPOSE_PROJECT}-ghost-dev-gateway`
    },
    ghost: {
        image: `${DEV_COMPOSE_PROJECT}-ghost-dev`,
        port: 2368
    }
} as const;
