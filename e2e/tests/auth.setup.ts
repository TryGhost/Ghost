import {test as setup, expect} from '@playwright/test';
import {AnalyticsOverviewPage, LoginPage} from '../helpers/pages/admin';
import * as path from 'node:path';
import {existsSync, readFileSync} from 'fs';
import {appConfig, setupUser} from '../helpers/utils';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

// Check if auth file exists and has valid cookies
function authFileExists() {
    if (existsSync(authFile)) {
        try {
            const authData = JSON.parse(readFileSync(authFile, 'utf8'));
            const authDataCookiesPresent = authData.cookies && authData.cookies.length > 0;

            if (authDataCookiesPresent) {
                return true;
            }
        } catch (error) {
            return false;
        }
    }
    return false;
}

setup('authenticate', async ({page}) => {
    if (authFileExists()) {
        return;
    }

    await setupUser(appConfig.baseURL, {email: appConfig.auth.email, password: appConfig.auth.password});
    // TODO: remove the wait
    await new Promise(r => {setTimeout(r, 2000)});

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.signIn(appConfig.auth.email, appConfig.auth.password);

    // waiting for the page to be loaded before storing the credentials
    const analyticsPage = new AnalyticsOverviewPage(page);
    await expect(analyticsPage.header).toBeVisible();

    await page.context().storageState({path: authFile});
});
