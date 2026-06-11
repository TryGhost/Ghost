import {defineConfig} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const phantomRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Vendored from ghost's e2e suite (see /e2e): same page objects and test
// flows, pointed at a phantom server seeded with the real v5 export fixture.
const PORT = Number(process.env.PHANTOM_E2E_PORT ?? 2478);
const DB_PATH = process.env.PHANTOM_E2E_DB ?? '/tmp/phantom-e2e-playwright.db';

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
        baseURL: `http://127.0.0.1:${PORT}`,
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
            testIgnore: ['**/global.setup.ts'],
            dependencies: ['setup'],
            use: {
                storageState: 'e2e/.auth/owner.json'
            }
        }
    ],
    webServer: {
        cwd: phantomRoot,
        command: `sh -c 'rm -f ${DB_PATH} && GHOST_DB_URL=file:${DB_PATH} npx tsx src/tools/seed-e2e.ts && GHOST_DB_URL=file:${DB_PATH} GHOST_PORT=${PORT} GHOST_E2E_RESET=1 npx tsx src/index.ts'`,
        url: `http://127.0.0.1:${PORT}/ghost/api/admin/site/`,
        reuseExistingServer: false,
        timeout: 60 * 1000
    }
});
