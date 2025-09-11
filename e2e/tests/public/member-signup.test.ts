import {test, expect} from '../../helpers/playwright';
import {HomePage} from '../../helpers/pages/public';
import {SignUpPage} from '../../helpers/pages/portal/SignUpPage';
import {SignUpSuccessPage} from '../../helpers/pages/portal/SignUpSuccessPage';
import {openPortalViaSubscribeButton} from '../../helpers/utils/portal-helpers';
import {faker} from '@faker-js/faker';

test.describe('Member Signup', () => {
    test('completes basic signup flow', async ({page}) => {
        // Navigate to homepage
        const homePage = new HomePage(page);
        await homePage.goto();
        
        // Open Portal via Subscribe button
        await openPortalViaSubscribeButton(page);
        
        // Fill in signup form
        const signUpPage = new SignUpPage(page);
        const testEmail = faker.internet.email();
        const testName = faker.person.fullName();
        
        await signUpPage.fillAndSubmit(testEmail, testName);
        
        // Verify success page appears
        const successPage = new SignUpSuccessPage(page);
        await successPage.waitForSuccess();
        
        // Validate success message content
        await expect(successPage.successTitle).toBeVisible();
        await expect(successPage.successTitle).toHaveText('Now check your email!');
        await expect(successPage.successMessage).toContainText('To complete signup, click the confirmation link');
        await expect(successPage.closeButton).toBeVisible();
    });
    
    test('shows email input and continue button', async ({page}) => {
        // Navigate to homepage
        const homePage = new HomePage(page);
        await homePage.goto();
        
        // Open Portal
        await openPortalViaSubscribeButton(page);
        
        // Verify signup form elements are visible
        const signUpPage = new SignUpPage(page);
        await expect(signUpPage.emailInput).toBeVisible();
        await expect(signUpPage.signupButton).toBeVisible();
    });
    
    test('can switch to signin mode', async ({page}) => {
        // Navigate to homepage
        const homePage = new HomePage(page);
        await homePage.goto();
        
        // Open Portal
        await openPortalViaSubscribeButton(page);
        
        // Click sign in link
        const signUpPage = new SignUpPage(page);
        await signUpPage.signinLink.click();
        
        // Verify we're now in signin mode (look for "Sign in" button instead of "Continue")
        const signinButton = page.frameLocator('[data-testid="portal-popup-frame"]')
            .locator('button[data-testid="button-signin"]');
        await expect(signinButton).toBeVisible();
    });
    
    test('can close portal after successful signup', async ({page}) => {
        // Navigate to homepage
        const homePage = new HomePage(page);
        await homePage.goto();
        
        // Open Portal and complete signup
        await openPortalViaSubscribeButton(page);
        const signUpPage = new SignUpPage(page);
        const testEmail = faker.internet.email();
        await signUpPage.fillAndSubmit(testEmail);
        
        // Wait for success and close
        const successPage = new SignUpSuccessPage(page);
        await successPage.waitForSuccess();
        await successPage.close();
        
        // Verify Portal is closed
        const isClosed = await successPage.isPortalClosed();
        expect(isClosed).toBe(true);
    });
});