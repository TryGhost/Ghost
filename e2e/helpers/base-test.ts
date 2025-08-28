import {test as base} from '@playwright/test';
import {resetGhostForTest} from './utils/ghost/simple-ghost-manager';
import {LoginPage} from './pages/admin';
import {appConfig} from './utils/app-config';
import {createPostFactory} from '../data-factory';
import type {PostFactory} from '../data-factory';

/**
 * Base test with automatic Ghost reset between tests
 * 
 * This provides:
 * - Fresh database for each test
 * - Ghost restart for complete isolation
 * - Admin user creation and authentication
 * - Ready-to-use factories
 * 
 * All tests should use this instead of raw Playwright test
 */

type TestFixtures = {
    ghostReset: void; // Just ensures Ghost is reset, no admin login
    ghostAdmin: {
        postFactory: PostFactory;
    };
};

export const test = base.extend<TestFixtures>({
    ghostReset: [async ({request}, use) => {
        // Reset database and restart Ghost
        // This ensures complete isolation between tests
        await resetGhostForTest(request);
        
        await use();
    }, {auto: true}], // Auto fixture runs for every test automatically
    
    ghostAdmin: async ({page}, use) => {
        // ghostReset ensures database is clean (via auto dependency)
        
        // Login with fresh admin user
        const loginPage = new LoginPage(page);
        await page.goto('http://localhost:2368/ghost/#/signin');
        await loginPage.signIn(appConfig.auth.email, appConfig.auth.password);
        
        // Wait for admin to load - could be any nav item
        await page.waitForSelector('nav a[href*="#/"]', {timeout: 10000});
        
        // Ensure we're fully logged in by waiting for a specific admin element
        await page.waitForLoadState('networkidle');
        
        // Create factories with fresh auth
        const postFactory = await createPostFactory(page);
        
        // Admin is logged in and ready
        
        // Provide the test with ready-to-use utilities
        await use({
            postFactory
        });
    }
});

export {expect} from '@playwright/test';