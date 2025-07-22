import {Page} from '@playwright/test';
import {LoginPage} from './pages/admin';

/**
 * Login to Ghost admin with the default test user
 * This is a convenience function for tests that need authentication
 */
export async function loginAsAdmin(page: Page): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.loginAndAssertSuccess('test+admin@test.com', 'P4ssw0rd123$');
}

/**
 * Login to Ghost admin with custom credentials
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.loginAndAssertSuccess(email, password);
}

/**
 * Assert that the user is logged in (not on signin page)
 */
export async function assertLoggedIn(page: Page): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.assertLoginSuccessful();
}

/**
 * Assert that the user is not logged in (on signin page)
 */
export async function assertNotLoggedIn(page: Page): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.assertLoginFailed();
}