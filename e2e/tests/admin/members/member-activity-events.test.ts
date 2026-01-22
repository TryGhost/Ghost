import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {HomePage, PublicPage} from '@/public-pages';
import {MemberDetailsPage, MembersPage} from '@/admin-pages';
import {createAutomatedEmailFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {extractMagicLink} from '@/helpers/services/email/utils';
import {signupViaPortal} from '@/helpers/playwright/flows/signup';

test.describe('Ghost Admin - Member Activity Events', () => {
    let emailClient: EmailClient;

    test.use({
        config: {
            memberWelcomeEmailSendInstantly: 'true',
            memberWelcomeEmailTestInbox: 'test+welcome-email@ghost.org'
        },
        labs: {welcomeEmails: true}
    });

    test.beforeEach(async () => {
        emailClient = new MailPit();
    });

    test('welcome email event appears in member activity feed', async ({page}) => {
        const automatedEmailFactory = createAutomatedEmailFactory(page.request);
        await automatedEmailFactory.create();

        const homePage = new HomePage(page);
        await homePage.goto();
        const {emailAddress, name} = await signupViaPortal(page);

        const messages = await emailClient.searchByRecipient(emailAddress, {timeoutMs: 10000});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const magicLink = extractMagicLink(latestMessage.Text);

        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await homePage.waitUntilLoaded();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.getMemberByName(name).click();

        const memberDetailsPage = new MemberDetailsPage(page);
        const welcomeEmailEvent = memberDetailsPage.getActivityEventByText(/received welcome email \(Free\)/i);

        await expect(welcomeEmailEvent).toBeVisible();
    });
});
