import {HomePage, PortalAccountPage} from '@/helpers/pages';
import {
    completePaidSignupViaPortal,
    completePaidUpgradeViaPortal,
    createPaidPortalTier,
    expect,
    switchPlanViaPortal,
    test
} from '@/helpers/playwright';
import {createMemberFactory} from '@/data-factory';

test.describe('Ghost Public - Portal Upgrade', () => {
    test.use({stripeEnabled: true});

    test('free member upgrades to paid via portal - portal shows billing info', async ({page, stripe}) => {
        const memberFactory = createMemberFactory(page.request);
        const tier = await createPaidPortalTier(page.request, {
            name: `Free Upgrade Tier ${Date.now()}`,
            currency: 'usd',
            monthly_price: 500,
            yearly_price: 5000
        });
        const member = await memberFactory.create({
            email: `free-upgrade-${Date.now()}@example.com`,
            name: 'Free Upgrade Member',
            status: 'free'
        });

        await completePaidUpgradeViaPortal(page, stripe!, member, {
            cadence: 'yearly',
            tierName: tier.name
        });

        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.openAccountPortal();

        const portalAccountPage = new PortalAccountPage(page);
        await portalAccountPage.waitForPortalToOpen();
        await expect(portalAccountPage.emailText(member.email)).toBeVisible();
        await expect(portalAccountPage.planPrice('$50.00/year')).toBeVisible();
        await expect(portalAccountPage.billingInfoHeading).toBeVisible();
        await expect(portalAccountPage.cardLast4('4242')).toBeVisible();
    });

    test('comped member upgrades to paid via portal - portal shows billing info', async ({page, stripe}) => {
        const memberFactory = createMemberFactory(page.request);
        const tier = await createPaidPortalTier(page.request, {
            name: `Comped Upgrade Tier ${Date.now()}`,
            currency: 'usd',
            monthly_price: 500,
            yearly_price: 5000
        });
        const member = await memberFactory.create({
            email: `comped-upgrade-${Date.now()}@example.com`,
            name: 'Comped Upgrade Member',
            status: 'comped',
            tiers: [{id: tier.id}]
        });

        await completePaidUpgradeViaPortal(page, stripe!, member, {
            cadence: 'yearly',
            tierName: tier.name
        });

        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.openAccountPortal();

        const portalAccountPage = new PortalAccountPage(page);
        await portalAccountPage.waitForPortalToOpen();
        await expect(portalAccountPage.emailText(member.email)).toBeVisible();
        await expect(portalAccountPage.planPrice('$50.00/year')).toBeVisible();
        await expect(portalAccountPage.billingInfoHeading).toBeVisible();
        await expect(portalAccountPage.cardLast4('4242')).toBeVisible();
    });

    test('paid member changes plan in portal - subscription switches between monthly and yearly', async ({page, stripe}) => {
        const tier = await createPaidPortalTier(page.request, {
            name: `Upgrade Tier ${Date.now()}`,
            currency: 'usd',
            monthly_price: 500,
            yearly_price: 5000
        });
        const name = 'Portal Plan Switch Member';
        const {emailAddress} = await completePaidSignupViaPortal(page, stripe!, {
            cadence: 'yearly',
            name,
            tierName: tier.name
        });

        await switchPlanViaPortal(page, {
            cadence: 'monthly',
            tierName: tier.name
        });

        const portalAccountPage = new PortalAccountPage(page);
        await expect(portalAccountPage.emailText(emailAddress)).toBeVisible();
        await expect(portalAccountPage.planPrice('$5.00/month')).toBeVisible();

        await switchPlanViaPortal(page, {
            cadence: 'yearly',
            tierName: tier.name
        });

        await expect(portalAccountPage.planPrice('$50.00/year')).toBeVisible();
    });
});
