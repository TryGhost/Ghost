import {test, expect} from '../../helpers/playwright';
import {HomePage} from '../../helpers/pages/public';
import {SignUpPage} from '../../helpers/pages/portal/SignUpPage';
import {SignInPage} from '../../helpers/pages/portal/SignInPage';
import {openPortalViaSubscribeButton} from '../../helpers/utils/portal-helpers';

test.describe('Portal Loading', () => {
    test('can open Portal via Subscribe button', async ({page}) => {
        // Navigate to homepage
        const homePage = new HomePage(page);
        await homePage.goto();
        
        // Open Portal via Subscribe button
        await openPortalViaSubscribeButton(page);
        
        // Verify signup form elements are visible using page object
        const signUpPage = new SignUpPage(page);
        await expect(signUpPage.emailInput).toBeVisible();
        await expect(signUpPage.signupButton).toBeVisible();
    });
    
    test('can open Portal via Sign in link', async ({page}) => {
        // Navigate to homepage
        const homePage = new HomePage(page);
        await homePage.goto();
        
        // Click the Sign in link
        const signinLink = page.locator('a[href="#/portal/signin"]').first();
        await signinLink.click();
        
        // Wait for Portal iframe to appear
        await page.waitForSelector('iframe[title="portal-popup"]', {
            state: 'visible',
            timeout: 5000
        });
        
        // Verify signin form elements are visible using page object
        const signInPage = new SignInPage(page);
        await expect(signInPage.emailInput).toBeVisible();
        await expect(signInPage.continueButton).toBeVisible();
    });
    
    test('Portal can switch between signup and signin modes', async ({page}) => {
        // Navigate to homepage
        const homePage = new HomePage(page);
        await homePage.goto();
        
        // Open Portal in signup mode
        await openPortalViaSubscribeButton(page);
        
        // Verify signup form is visible
        const signUpPage = new SignUpPage(page);
        await expect(signUpPage.emailInput).toBeVisible();
        await expect(signUpPage.signupButton).toBeVisible();
        
        // Switch to signin mode
        await signUpPage.signinLink.click();
        
        // Verify signin form is visible
        const signInPage = new SignInPage(page);
        await expect(signInPage.emailInput).toBeVisible();
        await expect(signInPage.continueButton).toBeVisible();
    });
});