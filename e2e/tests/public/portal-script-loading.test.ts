import {HomePage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

const portalScriptSelector = 'script[data-ghost][data-key][data-api]';

test.describe('Portal Script Loading', () => {
    test('memberships enabled - loads portal script', async ({page}) => {
        const settingsService = new SettingsService(page.request);
        await settingsService.setMembersSignupAccess('all');

        const homePage = new HomePage(page);
        await homePage.goto('/#/portal/signup');

        await expect(page.locator(portalScriptSelector)).toHaveAttribute('src', /\/portal\.min\.js$/);
        await expect(page.locator('#ghost-portal-root div iframe')).toHaveCount(1);
    });

    test.describe('with stripe connected', () => {
        test.use({stripeEnabled: true});

        test('memberships disabled - loads portal script', async ({page}) => {
            const settingsService = new SettingsService(page.request);
            await settingsService.setMembersSignupAccess('none');

            const homePage = new HomePage(page);
            await homePage.goto('/#/portal/signup');

            await expect(page.locator(portalScriptSelector)).toHaveAttribute('src', /\/portal\.min\.js$/);
            await expect(page.locator('#ghost-portal-root div iframe')).toHaveCount(1);
        });
    });

    test('memberships and donations disabled - does not load portal script', async ({page}) => {
        const settingsService = new SettingsService(page.request);
        await settingsService.setMembersSignupAccess('none');

        const homePage = new HomePage(page);
        await homePage.goto('/#/portal/signup');

        await expect(page.locator(portalScriptSelector)).toHaveCount(0);
        await expect(page.locator('#ghost-portal-root div iframe')).toHaveCount(0);
    });
});
