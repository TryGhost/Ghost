import {test as base} from '@playwright/test';
import {DatabaseFixture} from './fixtures/database';

// Import page objects
import {LoginPage} from './page-objects/LoginPage';
import {TwoFactorAuthPage} from './page-objects/TwoFactorAuthPage';
import {DashboardPage} from './page-objects/DashboardPage';

// Define types for our custom fixtures
export type TestFixtures = {
  db: DatabaseFixture;
  loginPage: LoginPage;
  twoFactorAuthPage: TwoFactorAuthPage;
  dashboardPage: DashboardPage;
  appUrls: {
    baseURL: string;
    adminURL: string;
  };
};

// Extend the base Playwright test with our custom fixtures
export const test = base.extend<TestFixtures>({
    // Fixture for Database operations
    db: async ({}, use) => {
        const db = new DatabaseFixture({
            database: process.env.MYSQL_DATABASE || 'ghost_test'
        });

        await db.connect();

        // Run the test with the database fixture
        await use(db);

        // Cleanup after test
        await db.disconnect();
    },

    loginPage: async ({page}, use) => {
        await use(new LoginPage(page));
    },

    twoFactorAuthPage: async ({page}, use) => {
        await use(new TwoFactorAuthPage(page));
    },

    dashboardPage: async ({page}, use) => {
        await use(new DashboardPage(page));
    },

    appUrls: async ({}, use) => {
        await use({
            baseURL: process.env.BASE_URL || 'http://localhost:2368',
            adminURL: `${process.env.BASE_URL || 'http://localhost:2368'}/ghost`
        });
    }
});

// Add a beforeEach hook to reset data between tests
test.beforeEach(async ({db}) => {
    await db.fastReset();
});

export {expect} from '@playwright/test';
