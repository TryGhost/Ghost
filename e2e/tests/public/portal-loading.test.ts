import {HomePage, SignInPage, SignUpPage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {createPaidPortalTier, expect, test} from '@/helpers/playwright';

test.describe('Portal Loading', () => {
    test.describe('opened Portal', function () {
        test('via Subscribe button', async ({page}) => {
            const homePage = new HomePage(page);
            await homePage.goto();

            await homePage.openPortalViaSubscribeButton();

            const signUpPage = new SignUpPage(page);
            await expect(signUpPage.emailInput).toBeVisible();
            await expect(signUpPage.signupButton).toBeVisible();
        });

        test('via Sign in link', async ({page}) => {
            const homePage = new HomePage(page);
            await homePage.goto();

            await homePage.openPortalViaSignInLink();

            const signInPage = new SignInPage(page);
            await expect(signInPage.emailInput).toBeVisible();
            await expect(signInPage.continueButton).toBeVisible();
        });
    });

    test('switch between signup and sign in modes', async ({page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();

        await homePage.openPortalViaSubscribeButton();

        const signUpPage = new SignUpPage(page);
        await expect(signUpPage.emailInput).toBeVisible();
        await expect(signUpPage.signupButton).toBeVisible();

        await signUpPage.signinLink.click();

        const signInPage = new SignInPage(page);
        await expect(signInPage.emailInput).toBeVisible();
        await expect(signInPage.continueButton).toBeVisible();
    });

    test.describe('signup access', () => {
        test.use({stripeEnabled: true});

        test('invite-only access with paid trial tier - hides free trial message', async ({page}) => {
            const settingsService = new SettingsService(page.request);
            await createPaidPortalTier(page.request, {
                name: `Invite Only Trial Tier ${Date.now()}`,
                currency: 'usd',
                monthly_price: 100,
                yearly_price: 1000,
                trial_days: 5
            });
            await settingsService.setMembersSignupAccess('invite');

            const homePage = new HomePage(page);
            await homePage.gotoPortalSignup();

            const signUpPage = new SignUpPage(page);
            await signUpPage.waitForPortalToOpen();
            await expect(signUpPage.inviteOnlyNotification).toHaveText(/contact the owner for access/i);
            await expect(signUpPage.freeTrialNotification).toBeHidden();
        });
    });
});
