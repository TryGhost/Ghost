import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {HomePage, PublicPage} from '@/public-pages';
import {Page} from '@playwright/test';
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

    async function completeSignupViaMagicLink(page: Page, emailAddress: string) {
        const signupEmail = await retrieveLatestEmailMessage(emailAddress);
        const magicLink = extractMagicLink(signupEmail.Text);
        const publicPage = new PublicPage(page);
        const homePage = new HomePage(page);

        await publicPage.goto(magicLink);
        await homePage.waitUntilLoaded();

        return signupEmail;
    }

    async function expectWelcomeEmailCount(emailAddress: string, expectedCount: number) {
        await expect.poll(async () => {
            const welcomeMessages = await emailClient.search(
                {to: emailAddress, subject: 'Welcome to Test Blog!'},
                {timeoutMs: null}
            );

            return welcomeMessages.length;
        }, {timeout: 5000}).toBe(expectedCount);
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

    test('free signup sends welcome email after signup completion', async ({page}) => {
        const automatedEmailFactory = createAutomatedEmailFactory(page.request);
        await automatedEmailFactory.create();

        const homePage = new HomePage(page);
        await homePage.goto();
        const {emailAddress} = await signupViaPortal(page);

        const signupEmail = await completeSignupViaMagicLink(page, emailAddress);
        expect(signupEmail.Subject.toLowerCase()).toContain('complete');

        const welcomeMessages = await emailClient.search(
            {to: emailAddress, subject: 'Welcome to Test Blog!'},
            {timeoutMs: 10000}
        );
        const welcomeEmail = await emailClient.getMessageDetailed(welcomeMessages[0]);

        expect(welcomeEmail.From.Name).toContain('Test Blog');
        expect(welcomeEmail.From.Address).toContain('@');
        expect(welcomeEmail.Subject).toBe('Welcome to Test Blog!');
        expect(welcomeEmail.Text).toContain('Welcome to Test Blog!');
        expect(welcomeEmail.HTML).toContain('Welcome to Test Blog!');
    });

    test('free signup does not send welcome email when free automation is disabled', async ({page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();
        const {emailAddress} = await signupViaPortal(page);

        const signupEmail = await completeSignupViaMagicLink(page, emailAddress);
        expect(signupEmail.Subject.toLowerCase()).toContain('complete');

        await expectWelcomeEmailCount(emailAddress, 0);
    });
});
