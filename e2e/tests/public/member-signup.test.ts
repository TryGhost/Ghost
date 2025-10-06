import {test, expect} from '../../helpers/playwright';
import {EmailClient, MailhogClient} from '../../helpers/services/email/MailhogClient';
import {EmailMessageBody} from '../../helpers/services/email/EmailMessageBody';
import {signupViaPortal} from '../../helpers/playwright/flows/signup';
import {HomePage, PublicPage} from '../../helpers/pages/public';
import {extractMagicLink} from '../../helpers/services/email/utils';

test.describe('Ghost Public - Member Signup', () => {
    let emailClient: EmailClient;

    test.beforeEach(async () => {
        emailClient = new MailhogClient();
    });

    test('signed up with magic link in email', async ({page}) => {
        const {emailAddress} = await signupViaPortal(page);

        const message = await emailClient.waitForEmail(emailAddress);
        const emailMessageBodyParts = new EmailMessageBody(message);
        const emailTextBody = emailMessageBodyParts.getTextContent();

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await publicPage.waitForPageToFullyLoad();

        const homePage = new HomePage(page);
        await homePage.waitForSignedIn();
        await expect(homePage.accountButton).toBeVisible();
    });

    test('received welcome email', async ({page}) => {
        const {emailAddress} = await signupViaPortal(page);

        const message = await emailClient.waitForEmail(emailAddress);
        expect(message.Content.Headers.Subject[0].toLowerCase()).toContain('complete');

        const emailMessageBodyParts = new EmailMessageBody(message);
        const emailTextBody = emailMessageBodyParts.getTextContent();
        expect(emailTextBody).toContain('complete the signup process');
    });
});
