import {test, expect} from '../../helpers/playwright';
import {MailhogClient} from '../../helpers/email/MailhogClient';
import {signupViaPortal} from '../../helpers/flows/signup';
import {HomePage} from '../../helpers/pages/public';

test.describe('Member Signup with Email Verification', () => {
    let mailhog: MailhogClient;

    test.beforeEach(async () => {
        mailhog = new MailhogClient();
    });

    test('completes full signup flow with magic link', async ({page}) => {
        const {email} = await signupViaPortal(page);

        const magicLink = await mailhog.waitForMagicLink(email);
        await page.goto(magicLink);
        await page.waitForLoadState('networkidle');

        const homePage = new HomePage(page);
        await homePage.waitForSignedIn();
        await expect(homePage.accountButton).toBeVisible();
    });

    test('receives welcome email with correct content', async ({page}) => {
        const {email} = await signupViaPortal(page);

        const message = await mailhog.waitForEmail(email);
        expect(message.Content.Headers.Subject[0].toLowerCase()).toContain('complete');

        const emailBody = mailhog.getPlainTextContent(message);
        expect(emailBody).toContain('complete the signup process');

        const magicLink = mailhog.extractMagicLink(message);
        expect(magicLink).toBeTruthy();
    });
});