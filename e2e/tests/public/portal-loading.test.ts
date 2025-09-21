import {test, expect} from '../../helpers/playwright';
import {HomePage} from '../../helpers/pages/public';
import {SignUpPage} from '../../helpers/pages/portal/SignUpPage';
import {SignInPage} from '../../helpers/pages/portal/SignInPage';
import {openPortalViaSubscribeButton} from '../../helpers/utils/portal-helpers';

test.describe('Portal Loading', () => {
    test('can open Portal via Subscribe button', async ({page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();

        await openPortalViaSubscribeButton(page);

        const signUpPage = new SignUpPage(page);
        await expect(signUpPage.emailInput).toBeVisible();
        await expect(signUpPage.signupButton).toBeVisible();
    });
    
    test('can open Portal via Sign in link', async ({page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();

        const signinLink = page.locator('a[href="#/portal/signin"]').first();
        await signinLink.click();

        await page.waitForSelector('iframe[title="portal-popup"]', {
            state: 'visible',
            timeout: 5000
        });

        const signInPage = new SignInPage(page);
        await expect(signInPage.emailInput).toBeVisible();
        await expect(signInPage.continueButton).toBeVisible();
    });
    
    test('Portal can switch between signup and signin modes', async ({page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();

        await openPortalViaSubscribeButton(page);

        const signUpPage = new SignUpPage(page);
        await expect(signUpPage.emailInput).toBeVisible();
        await expect(signUpPage.signupButton).toBeVisible();

        await signUpPage.signinLink.click();

        const signInPage = new SignInPage(page);
        await expect(signInPage.emailInput).toBeVisible();
        await expect(signInPage.continueButton).toBeVisible();
    });
});