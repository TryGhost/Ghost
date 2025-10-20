import {Page, Browser} from '@playwright/test';
import {test as base} from './base-fixture';
import {AnalyticsOverviewPage} from '../../pages/admin';
import {SettingsService} from '../../services/settings/SettingsService';
import {appConfig} from '../../utils';
import baseDebug from '@tryghost/debug';
import {login} from '../flows/login';

const debug = baseDebug('e2e:authenticated-fixture');

export interface AuthenticatedFixture {
    labs?: Record<string, boolean>;
}

async function setupLabSettings(page: Page, labsFlags: Record<string, boolean>) {
    const analyticsPage = new AnalyticsOverviewPage(page);
    await analyticsPage.goto();

    debug('Updating labs settings:', labsFlags);
    const settingsService = new SettingsService(page.request);
    await settingsService.updateSettings(labsFlags);

    // Reload the page to ensure the new labs settings take effect in the UI
    await page.reload();
    await analyticsPage.header.waitFor({state: 'visible'});
    debug('Labs settings applied and page reloaded');
}

async function setupNewAuthenticatedPage(browser: Browser, baseURL: string) {
    debug('Setting up authenticated page for Ghost instance:', baseURL);

    // Create browser context with correct baseURL and extra HTTP headers
    const context = await browser.newContext({
        baseURL: baseURL,
        extraHTTPHeaders: {
            Origin: baseURL
        }
    });

    const page = await context.newPage();
    await login(page, appConfig.auth.email, appConfig.auth.password);
    debug('Authentication completed for Ghost instance');

    return {page, context};
}

/**
 * Playwright fixture that provides authenticated access to Ghost
 * Extends base fixture with automatic login
 *
 * Usage:
 * - Import from this file instead of base-fixture.ts
 * - Use `page` fixture as normal - it will be authenticated
 * - Optionally set labs flags via test.use({labs: {featureName: true}})
 */
export const test = base.extend<AuthenticatedFixture>({
    // Define labs as an option that can be set per test or describe block
    labs: [undefined, {option: true}],
    page: async ({browser, baseURL, labs}, use) => {
        if (!baseURL) {
            throw new Error('baseURL is not defined');
        }

        const {page, context} = await setupNewAuthenticatedPage(browser, baseURL);

        const labsFlagsSpecified = labs && Object.keys(labs).length > 0;
        if (labsFlagsSpecified) {
            await setupLabSettings(page, labs);
        }

        await use(page);
        await context.close();
    }
});

export {expect} from '@playwright/test';
