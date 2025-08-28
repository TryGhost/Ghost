import dotenv from 'dotenv';
dotenv.config();

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    timeout: 60 * 1000, // Longer timeout for database reset and Ghost restart
    expect: {
        timeout: 15 * 1000
    },
    retries: 0, // No retries - if test fails with proper isolation, it's a real failure
    workers: 1, // Must be sequential for Ghost restart between tests
    fullyParallel: false, // Disable parallel execution
    reporter: process.env.CI ? [['list', {printSteps: true}], ['html']] : [['list', {printSteps: true}]],
    use: {
        baseURL: process.env.GHOST_BASE_URL || 'http://localhost:2368',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
        browserName: 'chromium'
    },
    testDir: './',
    testMatch: ['tests/**/*.test.{js,ts}'],
    
    // Global setup and teardown for Ghost process management
    globalSetup: './helpers/global-setup.ts',
    globalTeardown: './helpers/global-teardown.ts',
    
    projects: [
        // All tests run with isolation - no shared state
        {
            name: 'main',
            testIgnore: ['**/auth.setup.ts'], // No longer need auth setup
            testDir: './tests',
            use: {
                // No storageState - each test handles its own auth after reset
                viewport: {width: 1920, height: 1080}
            }
            // No dependencies - each test is independent
        },
        // Factory tests - also isolated
        {
            name: 'factories',
            testDir: './data-factory/tests',
            use: {
                viewport: {width: 1920, height: 1080}
            }
        }
    ]
};

export default config;
