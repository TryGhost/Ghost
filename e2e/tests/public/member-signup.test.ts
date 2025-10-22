import {test, expect} from '../../helpers/playwright';
import {EmailClient, MailPit} from '../../helpers/services/email/MailPit';
import {signupViaPortal} from '../../helpers/playwright/flows/signup';
import {HomePage, PublicPage} from '../../helpers/pages/public';
import {extractMagicLink} from '../../helpers/services/email/utils';

test.describe('Ghost Public - Member Signup', () => {
    let emailClient: EmailClient;

    test.beforeEach(async () => {
        emailClient = new MailPit();
    });

    test('signed up with magic link in email', async ({page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();
        const {emailAddress} = await signupViaPortal(page);

        const messages = await emailClient.searchByRecipient(emailAddress);
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const emailTextBody = latestMessage.Text;

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await homePage.waitUntilLoaded();

        await expect(homePage.accountButton).toBeVisible();
    });

    test('received welcome email', async ({page}) => {
        await new HomePage(page).goto();
        const {emailAddress} = await signupViaPortal(page);

        const messages = await emailClient.searchByRecipient(emailAddress);
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        expect(latestMessage.Subject.toLowerCase()).toContain('complete');

        const emailTextBody = latestMessage.Text;
        expect(emailTextBody).toContain('complete the signup process');
    });
});
