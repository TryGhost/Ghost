import {defineConfig} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const phantomRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Vendored from ghost's e2e suite (see /e2e): same page objects and test
// flows, pointed at a phantom server seeded with the real v5 export fixture.
const PORT = Number(process.env.PHANTOM_E2E_PORT ?? 2478);
const DB_PATH = process.env.PHANTOM_E2E_DB ?? '/tmp/phantom-e2e-playwright.db';

// Host-settings variants (billing banner / force upgrade) need their own
// server configs, so they run as separate projects against extra servers.
const BILLING_PORT = PORT + 1;
const FORCE_UPGRADE_PORT = PORT + 2;
const MOCK_BILLING_URL = 'https://billing.mock.test';

const serverCommand = (dbPath: string, port: number) => (
    `sh -c 'rm -f ${dbPath} && GHOST_DB_URL=file:${dbPath} npx tsx src/tools/seed-e2e.ts && GHOST_DB_URL=file:${dbPath} GHOST_PORT=${port} GHOST_E2E_RESET=1 npx tsx src/index.ts'`
);

export default defineConfig({
    timeout: 30 * 1000,
    expect: {timeout: 10 * 1000},
    retries: 0,
    workers: 1,
    fullyParallel: false,
    reporter: [['list']],
    testDir: './tests',
    testMatch: ['**/*.test.ts'],
    use: {
        // Must match the site URL phantom announces (http://localhost:<port>):
        // the shell builds absolute URLs (e.g. ActivityPub) from it, and a
        // 127.0.0.1 origin would make those cross-origin.
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
        browserName: 'chromium',
        viewport: {width: 1920, height: 1080}
    },
    projects: [
        {
            name: 'setup',
            testMatch: /global\.setup\.ts/
        },
        {
            name: 'main',
            testIgnore: ['**/global.setup.ts', '**/host-settings/**'],
            dependencies: ['setup'],
            use: {
                storageState: 'e2e/.auth/owner.json'
            }
        },
        {
            // Hosted-billing servers have their own DB and auth (the specs
            // log in via API), so no shared storage state.
            name: 'billing',
            testMatch: ['**/host-settings/upgrade-banner.test.ts'],
            use: {
                baseURL: `http://localhost:${BILLING_PORT}`
            }
        },
        {
            name: 'force-upgrade',
            testMatch: ['**/host-settings/force-upgrade.test.ts'],
            use: {
                baseURL: `http://localhost:${FORCE_UPGRADE_PORT}`
            }
        }
    ],
    webServer: [
        {
            cwd: phantomRoot,
            command: serverCommand(DB_PATH, PORT),
            url: `http://127.0.0.1:${PORT}/ghost/api/admin/site/`,
            reuseExistingServer: false,
            timeout: 60 * 1000
        },
        {
            cwd: phantomRoot,
            command: serverCommand('/tmp/phantom-e2e-billing.db', BILLING_PORT),
            env: {GHOST_HOST_SETTINGS: JSON.stringify({billing: {enabled: true, url: MOCK_BILLING_URL}})},
            url: `http://127.0.0.1:${BILLING_PORT}/ghost/api/admin/site/`,
            reuseExistingServer: false,
            timeout: 60 * 1000
        },
        {
            cwd: phantomRoot,
            command: serverCommand('/tmp/phantom-e2e-force-upgrade.db', FORCE_UPGRADE_PORT),
            env: {GHOST_HOST_SETTINGS: JSON.stringify({forceUpgrade: true, billing: {enabled: true, url: MOCK_BILLING_URL}})},
            url: `http://127.0.0.1:${FORCE_UPGRADE_PORT}/ghost/api/admin/site/`,
            reuseExistingServer: false,
            timeout: 60 * 1000
        }
    ]
});
