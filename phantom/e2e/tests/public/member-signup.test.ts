// Vendored from /e2e/tests/public/member-signup.test.ts; the email client
// reads phantom's in-memory mail sink instead of Mailpit.
import {MailPit, extractMagicLink} from '../../helpers/mailpit';
import {PortalHomePage, SignUpPage, SignUpSuccessPage} from '../../helpers/portal-pages';
import {expect, test} from '../../helpers/fixture';
import type {Page} from '@playwright/test';

const unique = () => Math.random().toString(36).slice(2, 10);

async function signupViaPortal(page: Page): Promise<{emailAddress: string; name: string}> {
    const homePage = new PortalHomePage(page);
    await homePage.goto();
    await homePage.openPortal();

    const signUpPage = new SignUpPage(page);
    const emailAddress = `test-${unique()}@ghost.org`;
    const name = `Member ${unique()}`;
    await signUpPage.fillAndSubmit(emailAddress, name);

    const successPage = new SignUpSuccessPage(page);
    await successPage.waitForSignUpSuccess();
    await successPage.closePortal();

    return {emailAddress, name};
}

test.describe('Ghost Public - Member Signup', () => {
    let emailClient: MailPit;

    test.beforeEach(async ({baseURL}) => {
        emailClient = new MailPit(baseURL!);
    });

    async function retrieveLatestEmailMessage(emailAddress: string, timeoutMs: number = 10000) {
        const messages = await emailClient.searchByRecipient(emailAddress, {timeoutMs});
        return await emailClient.getMessageDetailed(messages[0]!);
    }

    test('signed up with magic link in email', async ({page}) => {
        const homePage = new PortalHomePage(page);
        await homePage.goto();
        const {emailAddress} = await signupViaPortal(page);

        const latestMessage = await retrieveLatestEmailMessage(emailAddress);
        const emailTextBody = latestMessage.Text;

        const magicLink = extractMagicLink(emailTextBody);
        await page.goto(magicLink);
        await homePage.waitUntilLoaded();

        await expect(homePage.accountButton).toBeVisible();
    });

    test('received complete the signup email', async ({page}) => {
        await new PortalHomePage(page).goto();
        const {emailAddress} = await signupViaPortal(page);
        const latestMessage = await retrieveLatestEmailMessage(emailAddress);
        expect(latestMessage.Subject.toLowerCase()).toContain('complete');

        const emailTextBody = latestMessage.Text;
        expect(emailTextBody).toContain('complete the signup process');
    });
});
