import {test as base} from '@playwright/test';
import {DatabaseFixture} from './fixtures/database';

// Define types for our custom fixtures
export type TestFixtures = {
  db: DatabaseFixture;
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
    }
});

// Add a beforeEach hook to reset data between tests
test.beforeEach(async ({db}) => {
    await db.fastReset();
});

export {expect} from '@playwright/test';
