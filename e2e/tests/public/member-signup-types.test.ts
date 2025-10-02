import {test, expect} from '../../helpers/playwright';
import {EmailClient, MailhogClient} from '../../helpers/email/MailhogClient';
import {EmailMessageBody} from '../../helpers/email/EmailMessageBody';
import {HomePage, PublicPage} from '../../helpers/pages/public';
import {MembersPage, MemberDetailsPage} from '../../helpers/pages/admin';
import {signupViaPortal} from '../../helpers/playwright/flows/signup';
import {extractMagicLink} from '../../helpers/email/utils';

test.describe('Member Signup with Email Verification', () => {
    let emailClient: EmailClient;

    test.beforeEach(async () => {
        emailClient = new MailhogClient();
    });

    test('signed up with magic link - direct', async ({page}) => {
        const {emailAddress, name} = await signupViaPortal(page);

        const message = await emailClient.waitForEmail(emailAddress);
        const emailMessageBodyParts = new EmailMessageBody(message);
        const emailTextBody = emailMessageBodyParts.getTextContent();

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await publicPage.waitForPageToFullyLoad();

        const homePage = new HomePage(page);
        await homePage.waitForSignedIn();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.clickMemberByEmail(emailAddress);

        const membersDetailsPage = new MemberDetailsPage(page);

        await expect(membersDetailsPage.body).toContainText(/Source.*—.*Direct/);
        await expect(membersDetailsPage.nameInput).toHaveValue(name);
    });
});
