import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    timeout: process.env.CI ? 60 * 1000 : 30 * 1000,
    expect: {
        timeout: process.env.CI ? 30 * 1000 : 10 * 1000
    },
    retries: 1, // Retries open the door to flaky tests. If the test needs retries, it's not a good test or the app is broken.
    workers: 1, // One worker for now in the interest of stability. Parallelism leads to flaky tests when not done carefully.
    reporter: process.env.CI ? [['list', {printSteps: true}], ['html']] : [['list', {printSteps: true}]],
    use: {
        baseURL: process.env.GHOST_BASE_URL || 'http://localhost:2368',
        trace: 'retain-on-failure',
        browserName: 'chromium'
    },
    testDir: './',
    testMatch: ['tests/**/*.test.{js,ts}'],
    projects: [
        // Global environment setup - runs first
        {
            name: 'global-setup',
            testMatch: /global\.setup\.ts/,
            testDir: './',
            teardown: 'global-teardown'
        },
        // Main tests - run after global setup
        {
            name: 'main',
            testIgnore: ['**/*.setup.ts'], // Exclude setup files
            testDir: './tests',
            use: {
                // Use authentication state for all tests by default
                storageState: path.resolve(import.meta.dirname, './playwright/.auth/user.json'),
                viewport: {width: 1920, height: 1080}
            },
            dependencies: ['global-setup']
        },
        // Global environment teardown - runs independently (no dependencies to ensure it always runs)
        {
            name: 'global-teardown',
            testMatch: /global\.teardown\.ts/,
            testDir: './'
        }
    ]
};

export default config;
