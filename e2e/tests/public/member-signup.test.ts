import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {HomePage, PublicPage} from '@/public-pages';
import {createAutomatedEmailFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {extractMagicLink} from '@/helpers/services/email/utils';
import {signupViaPortal} from '@/helpers/playwright/flows/signup';

test.describe('Ghost Public - Member Signup', () => {
    let emailClient: EmailClient;

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

    test('received welcome email', async ({page}) => {
        const automatedEmailFactory = createAutomatedEmailFactory(page.request);
        await automatedEmailFactory.create();

        const homePage = new HomePage(page);
        await homePage.goto();
        const {emailAddress} = await signupViaPortal(page);

        let latestMessage = await retrieveLatestEmailMessage(emailAddress);
        const emailTextBody = latestMessage.Text;

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await homePage.waitUntilLoaded();

        const welcomeMessages = await emailClient.search(
            {to: emailAddress, subject: 'Welcome'},
            {timeoutMs: 10000}
        );
        latestMessage = await emailClient.getMessageDetailed(welcomeMessages[0]);

        expect(latestMessage.From.Name).toContain('Test Blog');
        expect(latestMessage.From.Address).toContain('test@example.com');
        expect(latestMessage.Subject).toContain('Welcome to Test Blog!');
        expect(latestMessage.Text).toContain('Welcome to Test Blog!');
        expect(latestMessage.HTML).toContain('Welcome to Test Blog!');
    });
});
