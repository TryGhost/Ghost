import {LoginPage} from '@/helpers/pages';
import {Page} from '@playwright/test';

export async function loginToGetAuthenticatedSession(page: Page, email: string, password: string) {
    const loginPage = new LoginPage(page);
    await loginPage.waitForLoginPageAfterUserCreated();
    await loginPage.signIn(email, password);

    // Wait for app to be ready - either normal content or billing iframe (forceUpgrade mode)
    // The sidebar navigation is always visible in both cases
    await page.getByRole('navigation').waitFor({state: 'visible'});
}
