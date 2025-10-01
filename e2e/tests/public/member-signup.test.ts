import {test, expect} from '../../helpers/playwright';
import {EmailAdapter} from '../../helpers/email/adapter';
import {MailhogAdapter} from '../../helpers/email/adapters/mailhog';
import {EmailMessageBodyParts} from '../../helpers/email/EmailMessageBodyParts';
import {signupViaPortal} from '../../helpers/playwright/flows/signup';
import {HomePage, PublicPage} from '../../helpers/pages/public';
import {extractMagicLink} from '../../helpers/email/utils';

test.describe('Member Signup with Email Verification', () => {
    let emailClient: EmailAdapter;

    test.beforeEach(async () => {
        emailClient = new MailhogAdapter();
    });

    test('completes full signup flow with magic link', async ({page}) => {
        const {email} = await signupViaPortal(page);

        const message = await emailClient.waitForEmail(email);
        const emailMessageBodyParts = new EmailMessageBodyParts(message);
        const emailTextBody = emailMessageBodyParts.getPlainTextContent();

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await publicPage.waitForPageToFullyLoad();

        const homePage = new HomePage(page);
        await homePage.waitForSignedIn();
        await expect(homePage.accountButton).toBeVisible();
    });

    test('receives welcome email with correct content', async ({page}) => {
        const {email} = await signupViaPortal(page);

        const message = await emailClient.waitForEmail(email);
        expect(message.subject.toLowerCase()).toContain('complete');

        const emailMessageBodyParts = new EmailMessageBodyParts(message);
        const emailTextBody = emailMessageBodyParts.getPlainTextContent();
        expect(emailTextBody).toContain('complete the signup process');
    });
});
