import dotenv from 'dotenv';
dotenv.config();

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    timeout: process.env.CI ? 60 * 1000 : 30 * 1000,
    expect: {
        timeout: process.env.CI ? 30 * 1000 : 10 * 1000
    },
    retries: 0, // Retries open the door to flaky tests. If the test needs retries, it's not a good test or the app is broken.
    workers: process.env.CI ? 2 : 10,
    reporter: process.env.CI ? [['list', {printSteps: true}], ['html']] : [['list', {printSteps: true}]],
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
            testDir: './',
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
            testDir: './'
        }
    ]
};

export default config;
