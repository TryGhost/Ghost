import dotenv from 'dotenv';
import os from 'os';
dotenv.config({quiet: true});

/*
 * 1/3 of the number of CPU cores seems to strike a good balance. Each worker
 * runs in its own process (1 core) and gets its own Ghost instance (1 core)
 * while leaving some head room for DBs, frontend dev servers, etc.
 *
 * It's possible to use more workers, but then the total test time and flakiness
 * goes up dramatically.
 */
const getWorkerCount = () => {
    const cpuCount = os.cpus().length;
    return Math.floor(cpuCount / 3) || 1;
};

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    timeout: process.env.CI ? 60 * 1000 : 30 * 1000,
    expect: {
        timeout: process.env.CI ? 30 * 1000 : 10 * 1000
    },
    retries: 0, // Retries open the door to flaky tests. If the test needs retries, it's not a good test or the app is broken.
    maxFailures: process.argv.includes('--ui') ? 0 : 1,
    workers: parseInt(process.env.TEST_WORKERS_COUNT, 10) || getWorkerCount(),
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
            testIgnore: ['**/*.setup.ts', '**/*.teardown.ts', 'analytics/**/*.test.ts'],
            testDir: './tests',
            use: {
                viewport: {width: 1920, height: 1080}
            },
            dependencies: ['global-setup']
        },
        {
            name: 'analytics',
            testDir: './tests',
            testMatch: ['analytics/**/*.test.ts'],
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
