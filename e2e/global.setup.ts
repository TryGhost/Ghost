import {test as setup, expect} from '@playwright/test';
import {EnvironmentManager} from './helpers/environment';
import {AnalyticsOverviewPage, LoginPage} from './helpers/pages/admin';
import * as path from 'node:path';
import {existsSync, readFileSync} from 'fs';
import {appConfig, setupUser} from './helpers/utils';

const authFile = path.join(__dirname, appConfig.auth.storageFile);

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

setup('global environment setup', async ({browser}) => {
    const environmentManager = new EnvironmentManager();
    await environmentManager.setup();
    
    // Store environment manager instance in global state for access by other tests
    (global as any).environmentManager = environmentManager;
    
    // Ensure teardown runs even if tests fail
    const teardownHandler = async () => {
        if ((global as any).environmentManager) {
            await (global as any).environmentManager.teardown();
            delete (global as any).environmentManager;
        }
    };
    
    process.on('SIGINT', teardownHandler);
    process.on('SIGTERM', teardownHandler);
    process.on('exit', teardownHandler);
    process.on('uncaughtException', teardownHandler);
    process.on('unhandledRejection', teardownHandler);
});

setup('authenticate', async ({browser}) => {
    if (authFileExists()) {
        return;
    }

    await setupUser(appConfig.baseURL, {email: appConfig.auth.email, password: appConfig.auth.password});

    const context = await browser.newContext();
    const page = await context.newPage();
    
    const loginPage = new LoginPage(page);
    await loginPage.waitForLoginPageAfterUserCreated();

    await loginPage.signIn(appConfig.auth.email, appConfig.auth.password);

    // waiting for the page to be loaded before storing the credentials
    const analyticsPage = new AnalyticsOverviewPage(page);
    await expect(analyticsPage.header).toBeVisible();

    await context.storageState({path: authFile});
    await context.close();
});