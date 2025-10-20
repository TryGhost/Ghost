import {Page} from '@playwright/test';
import {AnalyticsOverviewPage, LoginPage} from '../../pages/admin';

export async function login(page: Page, email: string, password: string): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.waitForLoginPageAfterUserCreated();
    await loginPage.signIn(email, password);
    const analyticsPage = new AnalyticsOverviewPage(page);
    await analyticsPage.header.waitFor({state: 'visible'});
}
