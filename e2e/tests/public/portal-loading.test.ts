import {HomePage,SignInPage, SignUpPage} from '@/helpers/pages';
import {expect, test} from '@/helpers/playwright';

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
});
