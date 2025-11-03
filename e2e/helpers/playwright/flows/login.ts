import {AnalyticsOverviewPage, LoginPage} from '../../pages';
import {Page} from '@playwright/test';

export async function loginToGetAuthenticatedSession(page: Page, email: string, password: string) {
    const loginPage = new LoginPage(page);
    await loginPage.waitForLoginPageAfterUserCreated();
    await loginPage.signIn(email, password);
    const analyticsPage = new AnalyticsOverviewPage(page);
    await analyticsPage.header.waitFor({state: 'visible'});
}
