import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {HomePage, PublicPage} from '@/public-pages';
import {MemberWelcomeEmailsSection} from '@/admin-pages';
import {SignUpPage, SignUpSuccessPage} from '@/portal-pages';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';
import {extractMagicLink} from '@/helpers/services/email/utils';
import {faker} from '@faker-js/faker';

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
    expect(messages.length).toBeGreaterThan(0);
    return await emailClient.getMessageDetailed(messages[0]);
}

test.describe('Ghost Admin - Welcome Email Customize Button', () => {
    test('customize button - opens modal', async ({page}) => {
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

    test('escape behavior - shows unsaved changes confirmation for welcome email customization', async ({page}) => {
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

    test('escape behavior - closes welcome email customization confirmation without closing the customize modal', async ({page}) => {
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

    test('escape behavior - closes welcome email color picker without bypassing unsaved changes confirmation', async ({page}) => {
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

    test('escape behavior - closes welcome email font select without bypassing unsaved changes confirmation', async ({page}) => {
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

    test('free member welcome email customization - is applied to delivered email', async ({page, browser, baseURL}) => {
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
            expect(welcomeMessages.length).toBeGreaterThan(0);
            const welcomeEmail = await emailClient.getMessageDetailed(welcomeMessages[0]);

            expect(welcomeEmail.Subject).toContain('Welcome to Test Blog');
            expect(welcomeEmail.HTML).toContain('Custom footer text for welcome members');
            expect(welcomeEmail.HTML).toContain('font-family: Georgia, serif;');
        });
    });
});
