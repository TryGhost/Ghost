import {PortalPage, SignInPage, SignUpPage} from '@/helpers/pages';
import {SettingsPage} from '@/admin-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {createPaidPortalTier, expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Portal Settings', () => {
    test('default link opens portal - navigates to portal', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();
        await settingsPage.portalSection.openCustomizeModal();

        const portalUrl = await settingsPage.portalSection.getLinkValue('Default:');
        await page.goto(portalUrl);

        const portalPage = new PortalPage(page);
        await portalPage.waitForPortalToOpen();
        await expect(portalPage.portalFrameBody).toBeVisible();
    });

    test('sign in link opens portal - navigates to sign in page', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();
        await settingsPage.portalSection.openCustomizeModal();

        const portalUrl = await settingsPage.portalSection.getLinkValue('Sign in');
        await page.goto(portalUrl);

        const signInPage = new SignInPage(page);
        await signInPage.waitForPortalToOpen();
        await expect(signInPage.emailInput).toBeVisible();
        await expect(signInPage.continueButton).toBeVisible();
    });

    test('sign up link opens portal - navigates to sign up page', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();
        await settingsPage.portalSection.openCustomizeModal();

        const portalUrl = await settingsPage.portalSection.getLinkValue('Sign up');
        await page.goto(portalUrl);

        const signUpPage = new SignUpPage(page);
        await signUpPage.waitForPortalToOpen();
        await expect(signUpPage.emailInput).toBeVisible();
        await expect(signUpPage.signupButton).toBeVisible();
    });

    test('shows free tier toggle in the Portal settings modal when Stripe is disconnected', async ({page}) => {
        const settingsService = new SettingsService(page.request);
        await settingsService.setStripeDisconnected();

        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();
        await settingsPage.portalSection.openCustomizeModal();

        await expect(settingsPage.portalSection.freeTierToggleLabel).toBeVisible();
    });

    test.describe('paid signup links', () => {
        test.use({stripeEnabled: true});

        test('monthly signup link opens fake stripe checkout - navigates to checkout', async ({page}) => {
            const tier = await createPaidPortalTier(page.request, {
                name: `Monthly Portal Tier ${Date.now()}`,
                visibility: 'public',
                currency: 'usd',
                monthly_price: 500,
                yearly_price: 5000
            });

            const settingsPage = new SettingsPage(page);
            await settingsPage.goto();
            await settingsPage.portalSection.openCustomizeModal();
            const portalUrl = await settingsPage.portalSection.getPaidSignupLinkForTier(tier.name, tier.id, 'monthly');
            await page.goto(portalUrl);

            await expect(page.getByRole('heading', {name: 'Fake Stripe Checkout'})).toBeVisible();
        });

        test('yearly signup link opens fake stripe checkout - navigates to checkout', async ({page}) => {
            const tier = await createPaidPortalTier(page.request, {
                name: `Yearly Portal Tier ${Date.now()}`,
                visibility: 'public',
                currency: 'usd',
                monthly_price: 500,
                yearly_price: 5000
            });

            const settingsPage = new SettingsPage(page);
            await settingsPage.goto();
            await settingsPage.portalSection.openCustomizeModal();
            const portalUrl = await settingsPage.portalSection.getPaidSignupLinkForTier(tier.name, tier.id, 'yearly');
            await page.goto(portalUrl);

            await expect(page.getByRole('heading', {name: 'Fake Stripe Checkout'})).toBeVisible();
        });
    });
});
