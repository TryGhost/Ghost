import {HomePage, PortalAccountPage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {TiersService} from '@/helpers/services/tiers/tiers-service';
import {completePaidSignupViaPortal, expect, test} from '@/helpers/playwright';

test.describe('Ghost Public - Portal Tiers', () => {
    test.use({stripeEnabled: true});

    test('single paid tier signup via portal completes checkout - portal shows billing info', async ({page, stripe}) => {
        const tiersService = new TiersService(page.request);
        const settingsService = new SettingsService(page.request);
        await tiersService.createTier({
            name: `Portal Tier ${Date.now()}`,
            visibility: 'public',
            currency: 'usd',
            monthly_price: 500,
            yearly_price: 5000
        });
        await settingsService.setPortalPlans(['free', 'monthly', 'yearly']);

        const name = 'Testy McTesterson';
        const {emailAddress} = await completePaidSignupViaPortal(page, stripe!, {name});

        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.openAccountPortal();

        const portalAccountPage = new PortalAccountPage(page);
        await portalAccountPage.waitForPortalToOpen();
        await expect(portalAccountPage.emailText(emailAddress)).toBeVisible();
        await expect(portalAccountPage.billingInfoHeading).toBeVisible();
        await expect(portalAccountPage.cardLast4('4242')).toBeVisible();
    });
});
