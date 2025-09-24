import {test, expect} from '../../helpers/playwright';
import {HomePage} from '../../helpers/pages/public';
import {SignUpPage} from '../../helpers/pages/portal/SignUpPage';
import {SignUpSuccessPage} from '../../helpers/pages/portal/SignUpSuccessPage';
import {MailhogClient} from '../../helpers/email/MailhogClient';
import {generateTestEmail} from '../../helpers/email/test-emails';
import {faker} from '@faker-js/faker';

test.describe('Member Signup with Email Verification', () => {
    let mailhog: MailhogClient;

    test.beforeEach(async () => {
        mailhog = new MailhogClient();
    });

    test('completes full signup flow with magic link', async ({page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.openPortalViaSubscribeButton();

        // Sign up
        const signUpPage = new SignUpPage(page);
        const testEmail = generateTestEmail('member');
        const testName = faker.person.fullName();
        await signUpPage.fillAndSubmit(testEmail, testName);

        // Wait for success message
        const successPage = new SignUpSuccessPage(page);
        await successPage.waitForSignUpSuccess();
        await successPage.closePortal();

        // Complete email verification
        await mailhog.completeSignupVerification(page, testEmail);

        // Verify member is signed in
        const accountTrigger = page.locator('[data-portal="account"]').first();
        await expect(accountTrigger).toBeVisible({timeout: 10000});
    });

    test('receives welcome email with correct content', async ({page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.openPortalViaSubscribeButton();

        // Sign up
        const signUpPage = new SignUpPage(page);
        const testEmail = generateTestEmail('member');
        const testName = faker.person.fullName();
        await signUpPage.fillAndSubmit(testEmail, testName);

        // Wait for success
        const successPage = new SignUpSuccessPage(page);
        await successPage.waitForSignUpSuccess();
        await successPage.closePortal();

        // Verify email content
        const email = await mailhog.waitForEmail(testEmail);
        const subject = email.Content.Headers.Subject[0];
        expect(subject.toLowerCase()).toContain('complete');

        const emailBody = mailhog.getPlainTextContent(email);
        expect(emailBody).toContain('complete the signup process');

        // Verify magic link format
        const magicLink = await mailhog.waitForMagicLink(testEmail);
        expect(magicLink).toContain('token=');
        expect(magicLink).toContain('action=signup');
    });

    test.skip('can resend confirmation email', async () => {
        // This test would verify the resend functionality if Ghost Portal supports it
        // For now, we'll skip implementation as it depends on Portal's UI capabilities
    });
});