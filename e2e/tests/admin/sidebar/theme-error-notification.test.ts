import {Page} from '@playwright/test';
import {SidebarPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright/fixture';

function mockActiveThemeWithErrors(page: Page, errors: object[] = [{
    code: 'GS001-DEPR-PURL',
    rule: 'Replace deprecated helper',
    details: 'The <code>{{pageUrl}}</code> helper has been deprecated.',
    failures: [{ref: 'default.hbs', message: 'deprecated usage'}],
    fatal: false,
    level: 'error'
}]) {
    return page.route('**/ghost/api/admin/themes/active/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                themes: [{
                    name: 'casper',
                    active: true,
                    package: {name: 'Casper', version: '1.0.0'},
                    errors: errors,
                    warnings: []
                }]
            })
        });
    });
}

function mockActiveThemeWithoutErrors(page: Page) {
    return page.route('**/ghost/api/admin/themes/active/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                themes: [{
                    name: 'casper',
                    active: true,
                    package: {name: 'Casper', version: '1.0.0'},
                    errors: [],
                    warnings: []
                }]
            })
        });
    });
}

test.describe('Ghost Admin - Theme Error Notification', () => {
    test('shows banner when theme has errors', async ({page}) => {
        const sidebar = new SidebarPage(page);
        await mockActiveThemeWithErrors(page);

        await sidebar.goto('/ghost');

        await expect(sidebar.themeErrorBanner).toBeVisible();
        await expect(sidebar.themeErrorBanner).toContainText('Your theme has errors');
    });

    test('opens dialog when clicking banner', async ({page}) => {
        const sidebar = new SidebarPage(page);
        await mockActiveThemeWithErrors(page);

        await sidebar.goto('/ghost');
        await sidebar.themeErrorBanner.click();

        await expect(sidebar.themeErrorDialog).toBeVisible();
        await expect(sidebar.themeErrorDialog).toContainText('Replace deprecated helper');
    });

    test('does not show banner when theme has no errors', async ({page}) => {
        const sidebar = new SidebarPage(page);
        await mockActiveThemeWithoutErrors(page);

        await sidebar.goto('/ghost');

        await expect(sidebar.themeErrorBanner).toBeHidden();
    });

    test('filters out GS110 show_title_and_feature_image errors', async ({page}) => {
        const sidebar = new SidebarPage(page);
        await mockActiveThemeWithErrors(page, [{
            code: 'GS110-NO-MISSING-PAGE-BUILDER-USAGE',
            rule: 'Check page builder usage',
            details: 'Missing page builder helper usage.',
            failures: [{ref: 'post.hbs', message: 'show_title_and_feature_image'}],
            fatal: false,
            level: 'error'
        }]);

        await sidebar.goto('/ghost');

        await expect(sidebar.themeErrorBanner).toBeHidden();
    });
});
