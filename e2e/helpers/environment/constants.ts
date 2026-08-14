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
 * Used when pnpm dev infrastructure is detected.
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
    'mail__options__port=1025',

    // Disable IndexNow pings (tests run with real network access)
    'privacy__useIndexNow=false',

    // Disable gravatar avatar lookups (real external call, no e2e coverage)
    'privacy__useGravatar=false',

    // Disable browser-side Sentry reporting during tests
    'client_sentry__disabled=true'
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

/**
 * Egress monitoring — see service-managers/egress-monitor.ts.
 *
 * A CoreDNS sidecar records every EXTERNAL host the Ghost container resolves, so
 * outbound HTTP(S) calls are visible (and optionally enforced) in tests that
 * otherwise run with unrestricted network access.
 */

// Dedicated DNS image for the sidecar — pinned by digest, pulled at runtime
// (through the CI registry mirror). Deliberately NOT the Ghost application image.
export const EGRESS_DNS_IMAGE = 'coredns/coredns:1.12.0@sha256:40384aa1f5ea6bfdc77997d243aec73da05f27aed0c5e9d65bfa98933c519d97';

// CoreDNS config, bind-mounted into the sidecar at /Corefile.
export const EGRESS_COREFILE_PATH = path.resolve(__dirname, 'Corefile');

// Master switch for ALL egress monitoring — the DNS sidecar (server-side) and
// the Playwright request listener (browser-side). On by default; set to '0' to
// disable both.
export const EGRESS_MONITOR_ENABLED = process.env.E2E_EGRESS_MONITOR !== '0';

// Fail a test when it triggers egress to a host that is not on EGRESS_ALLOWLIST.
// On by default so unexpected outbound requests (e.g. a new integration, or a
// service that should be mocked) surface as a test failure. Set
// E2E_EGRESS_ENFORCE=0 to record-only, e.g. while expanding the allowlist.
export const EGRESS_ENFORCE = process.env.E2E_EGRESS_ENFORCE !== '0';
export const EGRESS_MOCK_RESPONSE_HEADER = 'x-ghost-e2e-mocked-external';

/**
 * Hosts the suite is allowed to reach. An entry matches itself and any subdomain
 * (so `unsplash.com` covers `images.unsplash.com`); reverse-DNS (*.arpa) lookups
 * are ignored. Each entry is a host the suite legitimately contacts — anything
 * not listed fails enforcement (see EGRESS_ENFORCE).
 *
 * Deliberately NOT here:
 * - api.stripe.com — Ghost should hit the fake Stripe server, not real Stripe.
 *   It only leaks because a test connects Stripe without `stripeEnabled`; the fix
 *   is the test, not an allowlist entry. (Hence the specific Stripe subdomains
 *   below rather than a blanket `stripe.com`.)
 * - gravatar.com — gated off in e2e instead (privacy__useGravatar above).
 */
export const EGRESS_ALLOWLIST: readonly string[] = [
    // Local test infrastructure (not real external egress)
    'host.docker.internal', // host gateway: fake Stripe/Mailgun servers + Caddy gateway
    'localhost', // the site/admin under test
    '127.0.0.1', // the site/admin under test
    'mock.test', // e2e billing mock (billing.mock.test) served by the harness

    // Ghost-owned
    'ghost.org', // static.ghost.org theme/admin assets + ghost.org changelog & update-check

    // Stripe — browser-side only (Stripe.js/Elements must load from Stripe's own CDN).
    // Listed per-subdomain so api.stripe.com (server-side) is NOT covered — see above.
    'js.stripe.com', // Stripe.js loaded by Portal/checkout
    'm.stripe.com', // Stripe Elements
    'm.stripe.network', // Stripe Elements

    // reCAPTCHA, pulled in by Stripe checkout
    'google.com', // reCAPTCHA challenge (www.google.com)
    'gstatic.com', // reCAPTCHA static assets (t0–t3.gstatic.com)

    // Other third-party services the product uses
    'bunny.net', // web fonts (fonts.bunny.net)
    'transistor.fm', // podcast embeds (partner.transistor.fm)
    'geojs.io' // member signup + staff sign-in geolocation (get.geojs.io)
];
