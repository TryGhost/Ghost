import dotenv from 'dotenv';
import os from 'os';
dotenv.config();

/*
 * Determine the number of workers to use based on CPU cores.
 * Heuristic: half the number of CPU cores, with a minimum of 1 worker.
 * Rationale: Each worker runs in its own process (1 core) and gets its own Ghost instance (1 core) = 2 cores per worker.
 * Possible to use more workers, but total test time actually increases, presumably due to context switching.
 */
const getWorkerCount = () => {
    const cpuCount = os.cpus().length;
    return Math.floor(cpuCount / 2) || 1;
};

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    timeout: process.env.CI ? 60 * 1000 : 30 * 1000,
    expect: {
        timeout: process.env.CI ? 30 * 1000 : 10 * 1000
    },
    retries: 0, // Retries open the door to flaky tests. If the test needs retries, it's not a good test or the app is broken.
    workers: process.env.CI ? 4 : parseInt(process.env.TEST_WORKERS_COUNT, 10) || getWorkerCount(),
    fullyParallel: true,
    reporter: process.env.CI ? [['list', {printSteps: true}], ['blob']] : [['list', {printSteps: true}], ['html']],
    use: {
        // Base URL will be set dynamically per test via fixture
        baseURL: process.env.GHOST_BASE_URL || 'http://localhost:2368',
        trace: 'retain-on-failure',
        browserName: 'chromium'
    },
    testDir: './',
    testMatch: ['tests/**/*.test.{js,ts}'],
    projects: [
        {
            name: 'global-setup',
            testMatch: /global\.setup\.ts/,
            testDir: './tests',
            teardown: 'global-teardown',
            timeout: 60 * 1000 // 60 seconds for setup
        },
        {
            name: 'main',
            testIgnore: ['**/*.setup.ts', '**/*.teardown.ts'],
            testDir: './tests',
            use: {
                viewport: {width: 1920, height: 1080}
            },
            dependencies: ['global-setup']
        },
        {
            name: 'global-teardown',
            testMatch: /global\.teardown\.ts/,
            testDir: './tests'
        }
    ]
};

export default config;
