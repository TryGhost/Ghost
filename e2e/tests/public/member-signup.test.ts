import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {HomePage, PublicPage} from '@/public-pages';
import {createAutomatedEmailFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {extractMagicLink} from '@/helpers/services/email/utils';
import {signupViaPortal} from '@/helpers/playwright/flows/signup';

test.describe('Ghost Public - Member Signup', () => {
    let emailClient: EmailClient;

    test.use({config: {
        memberWelcomeEmailSendInstantly: 'true',
        memberWelcomeEmailTestInbox: `test+welcome-email@ghost.org`
    }});

    test.beforeEach(async () => {
        emailClient = new MailPit();
    });

    async function retrieveLatestEmailMessage(emailAddress: string, timeoutMs: number = 10000) {
        const messages = await emailClient.searchByRecipient(emailAddress, {timeoutMs: timeoutMs});
        return await emailClient.getMessageDetailed(messages[0]);
    }

    test('signed up with magic link in email', async ({page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();
        const {emailAddress} = await signupViaPortal(page);

        const latestMessage = await retrieveLatestEmailMessage(emailAddress);
        const emailTextBody = latestMessage.Text;

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await homePage.waitUntilLoaded();

        await expect(homePage.accountButton).toBeVisible();
    });

    test('received complete the signup email', async ({page}) => {
        await new HomePage(page).goto();
        const {emailAddress} = await signupViaPortal(page);
        const latestMessage = await retrieveLatestEmailMessage(emailAddress);
        expect(latestMessage.Subject.toLowerCase()).toContain('complete');

        const emailTextBody = latestMessage.Text;
        expect(emailTextBody).toContain('complete the signup process');
    });

    test('received welcome email', async ({page, config}) => {
        const automatedEmailFactory = createAutomatedEmailFactory(page.request);
        await automatedEmailFactory.create();

        const emailInbox = config!.memberWelcomeEmailTestInbox!;
        const homePage = new HomePage(page);
        await homePage.goto();
        const {emailAddress} = await signupViaPortal(page);

        let latestMessage = await retrieveLatestEmailMessage(emailAddress);
        const emailTextBody = latestMessage.Text;

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await homePage.waitUntilLoaded();

        latestMessage = await retrieveLatestEmailMessage(emailInbox);

        // From.Name should be the site title (set during Ghost setup via UserFactory)
        expect(latestMessage.From.Name).toContain('Test Blog');
        // From.Address should be the noreply address derived from the site URL
        expect(latestMessage.From.Address).toContain('noreply@');
        expect(latestMessage.Subject).toContain('Welcome to Test Blog!');
        expect(latestMessage.Text).toContain('Welcome to Test Blog!');
        expect(latestMessage.HTML).toContain('Welcome to Test Blog!');
    });
});
