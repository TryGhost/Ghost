// Vendored from /e2e/tests/admin/settings/member-welcome-emails.test.ts.
// Adapted: the seeded site title is 'Testing Export Fixtures' (upstream
// fixtures use 'Test Blog'); email client reads phantom's mail sink.
import type {Browser, Page} from '@playwright/test';
import {MailPit, type EmailMessageDetailed, extractMagicLink} from '../../../helpers/mailpit';
import {MemberWelcomeEmailsSection} from '../../../helpers/welcome-email-pages';
import {PortalHomePage, SignUpPage, SignUpSuccessPage} from '../../../helpers/portal-pages';
import {expect, test} from '../../../helpers/fixture';

const unique = () => Math.random().toString(36).slice(2, 10);

let mailBaseUrl = '';
test.beforeEach(({baseURL}) => {
    mailBaseUrl = baseURL!;
});
const newEmailClient = () => new MailPit(mailBaseUrl);

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

async function withIsolatedPage(
    browser: Browser,
    options: {baseURL?: string},
    callback: (args: {page: Page}) => Promise<void>
): Promise<void> {
    const context = await browser.newContext({baseURL: options.baseURL ?? undefined, storageState: {cookies: [], origins: []}});
    try {
        await callback({page: await context.newPage()});
    } finally {
        await context.close();
    }
}
interface AutomatedEmail {
    id?: string;
    name?: string;
    slug: string;
    status: string;
    subject?: string;
    lexical?: string | null;
    sender_name?: string | null;
    sender_email?: string | null;
    sender_reply_to?: string | null;
    created_at?: string;
    updated_at?: string | null;
}

interface AutomatedEmailsResponse {
    automated_emails: AutomatedEmail[];
}

const DEFAULT_FREE_WELCOME_EMAIL_SUBJECT = 'Welcome to Testing Export Fixtures';

async function retrieveLatestEmailMessage(emailClient: MailPit, emailAddress: string, timeoutMs: number = 10000) {
    const messages = await emailClient.searchByRecipient(emailAddress, {timeoutMs});
    return await emailClient.getMessageDetailed(messages[0]);
}

async function completeSignupViaMagicLink(emailClient: MailPit, page: Page, emailAddress: string): Promise<EmailMessageDetailed> {
    const signupEmail = await retrieveLatestEmailMessage(emailClient, emailAddress);
    const magicLink = extractMagicLink(signupEmail.Text);
    const homePage = new PortalHomePage(page);

    await page.goto(magicLink);
    await homePage.waitUntilLoaded();

    return signupEmail;
}

async function expectWelcomeEmailCount(emailClient: MailPit, emailAddress: string, expectedCount: number) {
    await expect.poll(async () => {
        const welcomeMessages = await emailClient.search(
            {to: emailAddress, subject: 'Welcome to Testing Export Fixtures'},
            {timeoutMs: null}
        );

        return welcomeMessages.length;
    }, {timeout: 5000}).toBe(expectedCount);
}

async function getFreeWelcomeEmail(page: Page): Promise<AutomatedEmail> {
    const response = await page.request.get('/ghost/api/admin/automated_emails/');
    expect(response.ok()).toBe(true);

    const data = await response.json() as AutomatedEmailsResponse;
    const freeWelcomeEmail = data.automated_emails.find(email => email.slug === 'member-welcome-email-free');

    expect(freeWelcomeEmail).toBeDefined();

    return freeWelcomeEmail!;
}

async function restoreWelcomeEmail(page: Page, automatedEmail: AutomatedEmail): Promise<void> {
    expect(automatedEmail.id).toBeDefined();

    const response = await page.request.put(`/ghost/api/admin/automated_emails/${automatedEmail.id}/`, {
        data: {
            automated_emails: [automatedEmail]
        }
    });

    expect(response.ok()).toBe(true);
}

test.describe('Ghost Admin - Member Welcome Emails', () => {
    test('new sites do not send welcome emails by default', async ({page}) => {
        const emailClient = newEmailClient();
        const {emailAddress} = await signupViaPortal(page);

        const signupEmail = await completeSignupViaMagicLink(emailClient, page, emailAddress);
        expect(signupEmail.Subject.toLowerCase()).toContain('complete');

        await expectWelcomeEmailCount(emailClient, emailAddress, 0);
    });

    test('free signup sends welcome email after enabling it', async ({page, browser, baseURL}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);
        const emailClient = newEmailClient();

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.enableFreeWelcomeEmail();

        await expect(welcomeEmailsSection.freeWelcomeEmailToggle).toHaveAttribute('aria-checked', 'true');
        await expect(welcomeEmailsSection.freeWelcomeEmailEditButton).toBeVisible();

        await withIsolatedPage(browser, {baseURL}, async ({page: signupPage}) => {
            const {emailAddress} = await signupViaPortal(signupPage);
            await completeSignupViaMagicLink(emailClient, signupPage, emailAddress);

            const welcomeMessages = await emailClient.search(
                {to: emailAddress, subject: DEFAULT_FREE_WELCOME_EMAIL_SUBJECT},
                {timeoutMs: 10000}
            );
            const welcomeEmail = await emailClient.getMessageDetailed(welcomeMessages[0]);

            expect(welcomeEmail.From.Name).toContain('Testing Export Fixtures');
            expect(welcomeEmail.Subject).toBe(DEFAULT_FREE_WELCOME_EMAIL_SUBJECT);
            expect(welcomeEmail.Text).toContain('Thanks for subscribing');
            expect(welcomeEmail.HTML).toContain('Thanks for subscribing');
        });
    });

    test('free signup delivers edited subject and body', async ({page, browser, baseURL}) => {
        const emailClient = newEmailClient();
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);
        const customSubject = 'A custom welcome subject';
        const customBody = 'This welcome body was edited through the admin UI.';

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.enableFreeWelcomeEmail();
        await welcomeEmailsSection.openFreeWelcomeEmailModal();
        await welcomeEmailsSection.replaceWelcomeEmailContent(customBody);
        await welcomeEmailsSection.modalPreviewTab.click();
        await expect(welcomeEmailsSection.modalSubjectInput).toBeVisible();
        await welcomeEmailsSection.modalSubjectInput.clear();
        await welcomeEmailsSection.modalSubjectInput.fill(customSubject);
        await welcomeEmailsSection.saveWelcomeEmail();

        await withIsolatedPage(browser, {baseURL}, async ({page: signupPage}) => {
            const {emailAddress} = await signupViaPortal(signupPage);
            await completeSignupViaMagicLink(emailClient, signupPage, emailAddress);

            const welcomeMessages = await emailClient.search(
                {to: emailAddress, subject: customSubject},
                {timeoutMs: 10000}
            );
            const welcomeEmail = await emailClient.getMessageDetailed(welcomeMessages[0]);

            expect(welcomeEmail.Subject).toBe(customSubject);
            expect(welcomeEmail.Text).toContain(customBody);
            expect(welcomeEmail.HTML).toContain(customBody);
        });
    });

    test('free welcome email preview - renders edited subject and body', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);
        const customSubject = 'Preview subject from the browser test';
        const customBody = 'Preview body content rendered from an unsaved draft.';

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.openFreeWelcomeEmailModal();
        await welcomeEmailsSection.replaceWelcomeEmailContent(customBody);

        const previewResponse = page.waitForResponse(
            response => response.url().includes('/ghost/api/admin/automated_emails/') &&
                response.url().includes('/preview/') &&
                response.request().method() === 'POST'
        );

        await welcomeEmailsSection.modalPreviewTab.click();
        await previewResponse;

        await welcomeEmailsSection.modalSubjectInput.clear();
        await welcomeEmailsSection.modalSubjectInput.fill(customSubject);
        await expect(welcomeEmailsSection.modalPreviewSubjectInput).toHaveValue(customSubject);
        await expect(welcomeEmailsSection.modalPreviewIframe).toBeVisible();
        await expect(welcomeEmailsSection.modalPreviewFrame.getByText(customBody)).toBeVisible();
    });

    test('free welcome email preview - preserves subject tokens when edited and saved', async ({page, browser, baseURL}) => {
        const emailClient = newEmailClient();
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);
        const templatedSubject = 'Welcome {first_name}';
        const templatedSubjectWithSuffix = `${templatedSubject}!`;

        try {
            await welcomeEmailsSection.goto();
            await welcomeEmailsSection.enableFreeWelcomeEmail();
            await welcomeEmailsSection.openFreeWelcomeEmailModal();

            await welcomeEmailsSection.modalPreviewTab.click();
            await expect(welcomeEmailsSection.modalSubjectInput).toBeVisible();
            await welcomeEmailsSection.modalSubjectInput.clear();
            await welcomeEmailsSection.modalSubjectInput.fill(templatedSubject);

            await welcomeEmailsSection.modalEditTab.click();
            await welcomeEmailsSection.modalPreviewTab.click();

            await expect(welcomeEmailsSection.modalPreviewSubjectInput).toHaveValue(templatedSubject);

            await welcomeEmailsSection.modalSubjectInput.press('End');
            await welcomeEmailsSection.modalSubjectInput.type('!');
            await welcomeEmailsSection.saveWelcomeEmail();

            const freeWelcomeEmail = await getFreeWelcomeEmail(page);
            expect(freeWelcomeEmail.subject).toBe(templatedSubjectWithSuffix);

            await withIsolatedPage(browser, {baseURL}, async ({page: signupPage}) => {
                const {emailAddress, name} = await signupViaPortal(signupPage);
                await completeSignupViaMagicLink(emailClient, signupPage, emailAddress);

                const firstName = name.trim().split(/\s+/)[0];
                const personalizedSubject = `Welcome ${firstName}!`;

                const welcomeMessages = await emailClient.search(
                    {to: emailAddress, subject: personalizedSubject},
                    {timeoutMs: 10000}
                );
                const welcomeEmail = await emailClient.getMessageDetailed(welcomeMessages[0]);

                expect(welcomeEmail.Subject).toBe(personalizedSubject);
                expect(welcomeEmail.Subject).not.toContain('{first_name}');
            });
        } finally {
            const freeWelcomeEmail = await getFreeWelcomeEmail(page);
            await restoreWelcomeEmail(page, {
                ...freeWelcomeEmail,
                subject: DEFAULT_FREE_WELCOME_EMAIL_SUBJECT
            });
        }
    });

    test('disabling free welcome email stops delivery', async ({page, browser, baseURL}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);
        const emailClient = newEmailClient();

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.disableFreeWelcomeEmail();

        await expect(welcomeEmailsSection.freeWelcomeEmailToggle).toHaveAttribute('aria-checked', 'false');

        await withIsolatedPage(browser, {baseURL}, async ({page: signupPage}) => {
            const {emailAddress} = await signupViaPortal(signupPage);
            await completeSignupViaMagicLink(emailClient, signupPage, emailAddress);

            await expectWelcomeEmailCount(emailClient, emailAddress, 0);
        });
    });
});
