import {HomePage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

test.describe('Portal Script Loading', () => {
    test('memberships enabled - loads portal script', async ({page}) => {
        const settingsService = new SettingsService(page.request);
        await settingsService.setMembersSignupAccess('all');

        const homePage = new HomePage(page);
        await homePage.gotoPortalSignup();

        await expect(homePage.portalScript).toHaveAttribute('src', /\/portal\.min\.js$/);
        await expect(homePage.portalIframe).toHaveCount(1);
    });

    test.describe('with stripe connected', () => {
        test.use({stripeEnabled: true});

        test('memberships disabled - loads portal script', async ({page}) => {
            const settingsService = new SettingsService(page.request);
            await settingsService.setMembersSignupAccess('none');

            const homePage = new HomePage(page);
            await homePage.gotoPortalSignup();

            await expect(homePage.portalScript).toHaveAttribute('src', /\/portal\.min\.js$/);
            await expect(homePage.portalIframe).toHaveCount(1);
        });
    });

    test('memberships and donations disabled - does not load portal script', async ({page}) => {
        const settingsService = new SettingsService(page.request);
        await settingsService.setMembersSignupAccess('none');

        const homePage = new HomePage(page);
        await homePage.gotoPortalSignup();

        await expect(homePage.portalScript).toHaveCount(0);
        await expect(homePage.portalIframe).toHaveCount(0);
    });
});
