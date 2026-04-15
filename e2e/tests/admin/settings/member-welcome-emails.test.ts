import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {HomePage, PublicPage} from '@/public-pages';
import {MemberWelcomeEmailsSection} from '@/admin-pages';
import {Page} from '@playwright/test';
import {SignUpPage, SignUpSuccessPage} from '@/portal-pages';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';
import {extractMagicLink} from '@/helpers/services/email/utils';
import {faker} from '@faker-js/faker';
import {signupViaPortal} from '@/helpers/playwright/flows/signup';

interface AutomatedEmail {
    slug: string;
    status: string;
    subject?: string;
    sender_name?: string | null;
    sender_email?: string | null;
    sender_reply_to?: string | null;
}

interface AutomatedEmailsResponse {
    automated_emails: AutomatedEmail[];
}

interface AutomatedEmailDesign {
    id: string;
    slug: string;
    background_color: string;
    header_background_color: string;
    header_image: string | null;
    show_header_title: boolean;
    footer_content: string | null;
    button_color: string | null;
    button_corners: string;
    button_style: string;
    link_color: string | null;
    link_style: string;
    body_font_category: string;
    title_font_category: string;
    title_font_weight: string;
    image_corners: string;
    divider_color: string | null;
    section_title_color: string | null;
    show_badge: boolean;
}

interface AutomatedEmailDesignResponse {
    automated_email_design: AutomatedEmailDesign[];
}

async function retrieveLatestEmailMessage(emailClient: EmailClient, emailAddress: string, timeoutMs: number = 10000) {
    const messages = await emailClient.searchByRecipient(emailAddress, {timeoutMs});
    return await emailClient.getMessageDetailed(messages[0]);
}

async function completeSignupViaMagicLink(emailClient: EmailClient, page: Page, emailAddress: string) {
    const signupEmail = await retrieveLatestEmailMessage(emailClient, emailAddress);
    const magicLink = extractMagicLink(signupEmail.Text);
    const publicPage = new PublicPage(page);
    const homePage = new HomePage(page);

    await publicPage.goto(magicLink);
    await homePage.waitUntilLoaded();

    return signupEmail;
}

async function expectWelcomeEmailCount(emailClient: EmailClient, emailAddress: string, expectedCount: number) {
    await expect.poll(async () => {
        const welcomeMessages = await emailClient.search(
            {to: emailAddress, subject: 'Welcome to Test Blog'},
            {timeoutMs: null}
        );

        return welcomeMessages.length;
    }, {timeout: 5000}).toBe(expectedCount);
}

test.describe('Ghost Admin - Member Welcome Emails', () => {
    test('new sites do not send welcome emails by default', async ({page}) => {
        const emailClient = new MailPit();
        const {emailAddress} = await signupViaPortal(page);

        const signupEmail = await completeSignupViaMagicLink(emailClient, page, emailAddress);
        expect(signupEmail.Subject.toLowerCase()).toContain('complete');

        await expectWelcomeEmailCount(emailClient, emailAddress, 0);
    });

    test('free signup sends welcome email after enabling it', async ({page, browser, baseURL}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);
        const emailClient = new MailPit();

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.enableFreeWelcomeEmail();

        await expect(welcomeEmailsSection.freeWelcomeEmailToggle).toHaveAttribute('aria-checked', 'true');
        await expect(welcomeEmailsSection.freeWelcomeEmailEditButton).toBeVisible();

        await withIsolatedPage(browser, {baseURL}, async ({page: signupPage}) => {
            const {emailAddress} = await signupViaPortal(signupPage);
            await completeSignupViaMagicLink(emailClient, signupPage, emailAddress);

            const welcomeMessages = await emailClient.search(
                {to: emailAddress, subject: 'Welcome to Test Blog'},
                {timeoutMs: 10000}
            );
            const welcomeEmail = await emailClient.getMessageDetailed(welcomeMessages[0]);

            expect(welcomeEmail.From.Name).toContain('Test Blog');
            expect(welcomeEmail.Subject).toBe('Welcome to Test Blog');
            expect(welcomeEmail.Text).toContain('Thanks for subscribing');
            expect(welcomeEmail.HTML).toContain('Thanks for subscribing');
        });
    });

    test('free signup delivers edited subject and body', async ({page, browser, baseURL}) => {
        const emailClient = new MailPit();
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);
        const customSubject = 'A custom welcome subject';
        const customBody = 'This welcome body was edited through the admin UI.';

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.openFreeWelcomeEmailModal();
        await welcomeEmailsSection.modalSubjectInput.clear();
        await welcomeEmailsSection.modalSubjectInput.fill(customSubject);
        await welcomeEmailsSection.replaceWelcomeEmailContent(customBody);
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

    test('disabling free welcome email stops delivery', async ({page, browser, baseURL}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);
        const emailClient = new MailPit();

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

test.describe('Ghost Admin - Welcome Email Customize Button - flag enabled', () => {
    test.use({labs: {welcomeEmailsDesignCustomization: true}});

    test('customize button opens modal when labs flag is enabled', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();

        await expect(welcomeEmailsSection.customizeButton).toBeVisible();
        await welcomeEmailsSection.customizeButton.click();

        await expect(welcomeEmailsSection.customizeModal).toBeVisible();

        await welcomeEmailsSection.customizeModal.getByRole('button', {name: 'Close'}).click();

        await expect(welcomeEmailsSection.customizeModal).toBeHidden();
    });

    test('save design settings - persists to api', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.openCustomizeModal();

        await welcomeEmailsSection.switchToDesignTab();
        await welcomeEmailsSection.customizeModalButtonStyleOutline.click();

        await welcomeEmailsSection.saveCustomizeModal();
        await expect(welcomeEmailsSection.customizeModal).toBeVisible();

        const response = await page.request.get('/ghost/api/admin/automated_emails/design/');
        expect(response.ok()).toBe(true);

        const data = await response.json() as AutomatedEmailDesignResponse;
        const design = data.automated_email_design[0];
        expect(design.button_style).toBe('outline');
    });

    test('save general settings - persists to api', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.openCustomizeModal();

        await welcomeEmailsSection.customizeModalPublicationTitleToggle.click();
        await welcomeEmailsSection.customizeModalFooterTextarea.fill('Custom footer text');

        await welcomeEmailsSection.saveCustomizeModal();
        await expect(welcomeEmailsSection.customizeModal).toBeVisible();

        const response = await page.request.get('/ghost/api/admin/automated_emails/design/');
        expect(response.ok()).toBe(true);

        const data = await response.json() as AutomatedEmailDesignResponse;
        const design = data.automated_email_design[0];
        expect(design.show_header_title).toBe(false);
        expect(design.footer_content).toBe('Custom footer text');
    });

    test('saved design settings - loads when modal is reopened', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.openCustomizeModal();
        await welcomeEmailsSection.customizeModalFooterTextarea.fill('Persisted footer');
        await welcomeEmailsSection.saveCustomizeModal();
        await expect(welcomeEmailsSection.customizeModal).toBeVisible();
        await welcomeEmailsSection.closeCustomizeModal();

        await page.reload();
        await welcomeEmailsSection.section.waitFor({state: 'visible'});

        await welcomeEmailsSection.openCustomizeModal();

        await expect(welcomeEmailsSection.customizeModalFooterTextarea).toHaveValue('Persisted footer');
    });

    test('Escape shows unsaved changes confirmation for welcome email customization', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.openCustomizeModal();

        await welcomeEmailsSection.customizeModalFooterTextarea.fill('Unsaved footer change');
        await expect(welcomeEmailsSection.customizeModalFooterTextarea).toHaveValue('Unsaved footer change');

        await page.keyboard.press('Escape');

        await expect(welcomeEmailsSection.customizeModal).toBeVisible();
        await expect(welcomeEmailsSection.customizeModalUnsavedChangesDialog).toBeVisible();
        await expect(page).toHaveURL(/\/ghost\/#\/settings\/memberemails$/);
    });

    test('Escape closes welcome email customization confirmation without closing the customize modal', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.openCustomizeModal();

        await welcomeEmailsSection.customizeModalFooterTextarea.fill('Unsaved footer change');
        await page.keyboard.press('Escape');

        await expect(welcomeEmailsSection.customizeModalUnsavedChangesDialog).toBeVisible();

        await page.keyboard.press('Escape');

        await expect(welcomeEmailsSection.customizeModalUnsavedChangesDialog).toBeHidden();
        await expect(welcomeEmailsSection.customizeModal).toBeVisible();
        await expect(page).toHaveURL(/\/ghost\/#\/settings\/memberemails$/);
    });

    test('Escape closes welcome email color picker without bypassing unsaved changes confirmation', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.openCustomizeModal();
        await welcomeEmailsSection.switchToDesignTab();

        await welcomeEmailsSection.customizeModalButtonColorPickerTrigger.click();
        await expect(welcomeEmailsSection.customizeModalButtonColorAccentSwatch).toBeVisible();
        await welcomeEmailsSection.customizeModalButtonColorAccentSwatch.click();
        await welcomeEmailsSection.customizeModalButtonColorPickerTrigger.click();
        await welcomeEmailsSection.customizeModalButtonColorAutoSwatch.click();

        await welcomeEmailsSection.customizeModalButtonColorPickerTrigger.click();
        await expect(welcomeEmailsSection.customizeModalButtonColorAccentSwatch).toBeVisible();

        await page.keyboard.press('Escape');

        await expect(welcomeEmailsSection.customizeModalButtonColorAccentSwatch).toBeHidden();
        await expect(welcomeEmailsSection.customizeModalUnsavedChangesDialog).toBeHidden();
        await expect(welcomeEmailsSection.customizeModal).toBeVisible();
        await expect(page).toHaveURL(/\/ghost\/#\/settings\/memberemails$/);

        await page.keyboard.press('Escape');

        await expect(welcomeEmailsSection.customizeModalUnsavedChangesDialog).toBeVisible();
        await expect(welcomeEmailsSection.customizeModal).toBeVisible();
        await expect(page).toHaveURL(/\/ghost\/#\/settings\/memberemails$/);
    });

    test('Escape closes welcome email font select without bypassing unsaved changes confirmation', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.openCustomizeModal();
        await welcomeEmailsSection.customizeModalFooterTextarea.fill('Unsaved footer change');
        await welcomeEmailsSection.switchToDesignTab();

        await welcomeEmailsSection.customizeModalBodyFontSelect.click();
        await expect(welcomeEmailsSection.customizeModalBodyFontSerifOption).toBeVisible();

        await page.keyboard.press('Escape');

        await expect(welcomeEmailsSection.customizeModalBodyFontSerifOption).toBeHidden();
        await expect(welcomeEmailsSection.customizeModalUnsavedChangesDialog).toBeHidden();
        await expect(welcomeEmailsSection.customizeModal).toBeVisible();
        await expect(page).toHaveURL(/\/ghost\/#\/settings\/memberemails$/);

        await page.keyboard.press('Escape');

        await expect(welcomeEmailsSection.customizeModalUnsavedChangesDialog).toBeVisible();
        await expect(welcomeEmailsSection.customizeModal).toBeVisible();
        await expect(page).toHaveURL(/\/ghost\/#\/settings\/memberemails$/);
    });

    test('customized design is applied to the free member welcome email', async ({page, browser, baseURL}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);
        const emailClient = new MailPit();

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.enableFreeWelcomeEmail();
        await welcomeEmailsSection.openCustomizeModal();

        await welcomeEmailsSection.customizeModalFooterTextarea.fill('Custom footer text for welcome members');

        await welcomeEmailsSection.switchToDesignTab();
        await welcomeEmailsSection.chooseBodyFont('Elegant serif');
        await welcomeEmailsSection.saveCustomizeModal();
        await welcomeEmailsSection.closeCustomizeModal();

        await withIsolatedPage(browser, {baseURL}, async ({page: signupPage}) => {
            const homePage = new HomePage(signupPage);
            await homePage.gotoPortalSignup();

            const signUpPage = new SignUpPage(signupPage);
            const emailAddress = `test${faker.string.uuid()}@ghost.org`;
            const name = faker.person.fullName();
            await signUpPage.waitForPortalToOpen();
            await signUpPage.fillAndSubmit(emailAddress, name);

            const successPage = new SignUpSuccessPage(signupPage);
            await successPage.waitForSignUpSuccess();
            await successPage.closePortal();

            const signupEmail = await retrieveLatestEmailMessage(emailClient, emailAddress);
            const magicLink = extractMagicLink(signupEmail.Text);

            const publicPage = new PublicPage(signupPage);
            await publicPage.goto(magicLink);
            await homePage.waitUntilLoaded();

            const welcomeMessages = await emailClient.search(
                {to: emailAddress, subject: 'Welcome'},
                {timeoutMs: 10000}
            );
            const welcomeEmail = await emailClient.getMessageDetailed(welcomeMessages[0]);

            expect(welcomeEmail.Subject).toContain('Welcome to Test Blog');
            expect(welcomeEmail.HTML).toContain('Custom footer text for welcome members');
            expect(welcomeEmail.HTML).toContain('font-family: Georgia, serif;');
        });
    });
});

test.describe('Ghost Admin - Welcome Email Customize Button - flag disabled', () => {
    test('customize button is hidden when labs flag is disabled', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();

        await expect(welcomeEmailsSection.customizeButton).toBeHidden();
    });
});

test.describe('Ghost Admin - Paid Member Welcome Emails', () => {
    test.use({stripeEnabled: true});

    test('can enable paid welcome emails', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.enablePaidWelcomeEmail();

        await expect(welcomeEmailsSection.paidWelcomeEmailToggle).toHaveAttribute('aria-checked', 'true');
        await expect(welcomeEmailsSection.paidWelcomeEmailEditButton).toBeVisible();

        // TODO: Update test once full E2E functionality is added for welcome emails
        // We shouldn't assert via API directly, but for now this verifies the toggle works as expected
        const response = await page.request.get('/ghost/api/admin/automated_emails/');
        expect(response.ok()).toBe(true);

        const data = await response.json() as AutomatedEmailsResponse;
        const paidWelcomeEmail = data.automated_emails.find(email => email.slug === 'member-welcome-email-paid');
        expect(paidWelcomeEmail).toBeDefined();
        expect(paidWelcomeEmail?.status).toBe('active');
    });
});
