import {test as setup, expect} from '@playwright/test';
import {LoginPage} from '../helpers/pages/admin';
import * as path from 'node:path';
import {existsSync, readFileSync} from 'fs';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

function authFileExists() {
    // Check if auth file exists and has valid cookies
    if (existsSync(authFile)) {
        try {
            const authData = JSON.parse(readFileSync(authFile, 'utf8'));
            if (authData.cookies && authData.cookies.length > 0) {
                console.log('✅ Valid auth file exists, skipping authentication');
                return true;
            }
        } catch (error) {
            console.log('🔄 Auth file exists but is invalid, re-authenticating...');
            return false;
        }
    }
    return false;
}

setup('authenticate', async ({page}) => {
    if (authFileExists()) {
        return;
    }

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.signIn(process.env.E2E_ACCOUNT_USERNAME || '', process.env.E2E_ACCOUNT_PASSWORD || '');
    await page.waitForURL('**/ghost/#/**');
    console.log('After waitForURL:', page.url());

    await page.context().storageState({path: authFile});
});
