import {test, expect} from '../../helpers/playwright';
import {HomePage} from '../../helpers/pages/public';
import {SignUpPage} from '../../helpers/pages/portal/SignUpPage';
import {SignUpSuccessPage} from '../../helpers/pages/portal/SignUpSuccessPage';
import {openPortalViaSubscribeButton} from '../../helpers/utils/portal-helpers';
import {MailhogClient} from '../../helpers/email/MailhogClient';
import {faker} from '@faker-js/faker';

test.describe('Member Signup with Email Verification', () => {
    let mailhog: MailhogClient;

    test.beforeEach(async () => {
        mailhog = new MailhogClient();
        // Clear any existing emails before each test
        await mailhog.deleteAllMessages();
    });

    test('completes full signup flow with magic link', async ({page}) => {
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
        
        // Close Portal
        await successPage.close();
        
        // Wait for and retrieve the signup email
        const email = await mailhog.waitForEmail(testEmail, 10000);
        expect(email).toBeTruthy();
        
        // Extract the magic link from the email
        const magicLink = mailhog.extractMagicLink(email);
        expect(magicLink).toBeTruthy();
        
        // Navigate to the magic link to complete signup
        await page.goto(magicLink!);
        
        // Wait for page to load after authentication
        await page.waitForLoadState('networkidle');
        
        // Verify member is now signed in
        // When signed in, Portal should show account options instead of signin/signup
        // Try clicking the account trigger (which appears for logged in users)
        const accountTrigger = page.locator('[data-portal="account"]').first();
        
        // Wait for either the account trigger or check if we're redirected to homepage
        await expect(accountTrigger).toBeVisible({timeout: 10000});
    });

    test('receives welcome email with correct content', async ({page}) => {
        // Navigate to homepage
        const homePage = new HomePage(page);
        await homePage.goto();
        
        // Open Portal and sign up
        await openPortalViaSubscribeButton(page);
        const signUpPage = new SignUpPage(page);
        const testEmail = faker.internet.email();
        const testName = faker.person.fullName();
        
        await signUpPage.fillAndSubmit(testEmail, testName);
        
        // Wait for success
        const successPage = new SignUpSuccessPage(page);
        await successPage.waitForSuccess();
        
        // Get the signup email
        const email = await mailhog.waitForEmail(testEmail, 10000);
        
        // Verify email content (subject might be MIME encoded)
        const subject = email.Content.Headers.Subject[0];
        expect(subject.toLowerCase()).toContain('complete');
        
        // Check that the email contains signup instructions
        const emailBody = mailhog.getPlainTextContent(email);
        expect(emailBody).toContain('complete the signup process');
        
        // Verify magic link is present
        const magicLink = mailhog.extractMagicLink(email);
        expect(magicLink).toBeTruthy();
        expect(magicLink).toContain('token=');
        expect(magicLink).toContain('action=signup');
    });

    test.skip('can resend confirmation email', async () => {
        // This test would verify the resend functionality if Ghost Portal supports it
        // For now, we'll skip implementation as it depends on Portal's UI capabilities
    });
});