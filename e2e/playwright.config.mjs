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
        // Main tests - run after setup with authentication
        {
            name: 'main',
            testIgnore: ['**/auth.setup.ts'], // Exclude setup files
            testDir: './tests',
            use: {
                // Use authentication state for all tests by default
                storageState: path.resolve(import.meta.dirname, './playwright/.auth/user.json'),
                viewport: {width: 1920, height: 1080}
            },
            dependencies: ['setup']
        },
        // Factory tests
        {
            name: 'factories',
            testDir: './data-factory/tests'
        },
        // Setup project - runs first
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
            testDir: './tests'
        }
    ]
};

export default config;
