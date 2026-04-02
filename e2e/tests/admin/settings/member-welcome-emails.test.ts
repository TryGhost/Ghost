import {MemberWelcomeEmailsSection} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

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

test.describe('Ghost Admin - Member Welcome Emails', () => {
    test('can enable free welcome emails', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.enableFreeWelcomeEmail();

        await expect(welcomeEmailsSection.freeWelcomeEmailToggle).toHaveAttribute('aria-checked', 'true');
        await expect(welcomeEmailsSection.freeWelcomeEmailEditButton).toBeVisible();

        // TODO: Update test once full E2E functionality is added for welcome emails
        // We shouldn't assert via API directly, but for now this verifies the toggle works as expected
        const response = await page.request.get('/ghost/api/admin/automated_emails/');
        expect(response.ok()).toBe(true);

        const data = await response.json() as AutomatedEmailsResponse;
        const freeWelcomeEmail = data.automated_emails.find(email => email.slug === 'member-welcome-email-free');
        expect(freeWelcomeEmail).toBeDefined();
        expect(freeWelcomeEmail?.status).toBe('active');
    });

    test('can disable free welcome emails', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        await welcomeEmailsSection.goto();

        // First enable the welcome email
        await welcomeEmailsSection.enableFreeWelcomeEmail();
        await expect(welcomeEmailsSection.freeWelcomeEmailToggle).toHaveAttribute('aria-checked', 'true');
        await expect(welcomeEmailsSection.freeWelcomeEmailEditButton).toBeVisible();

        // Now disable it
        await welcomeEmailsSection.disableFreeWelcomeEmail();

        await expect(welcomeEmailsSection.freeWelcomeEmailToggle).toHaveAttribute('aria-checked', 'false');

        // TODO: Update test once full E2E functionality is added for welcome emails
        // We shouldn't assert via API directly, but for now this verifies the toggle works as expected
        const response = await page.request.get('/ghost/api/admin/automated_emails/');
        expect(response.ok()).toBe(true);

        const data = await response.json() as AutomatedEmailsResponse;
        const freeWelcomeEmail = data.automated_emails.find(email => email.slug === 'member-welcome-email-free');
        expect(freeWelcomeEmail).toBeDefined();
        expect(freeWelcomeEmail?.status).toBe('inactive');
    });

    test('can edit free welcome email subject', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        // Enable free welcome email first
        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.enableFreeWelcomeEmail();

        // Open the modal and edit the subject
        await welcomeEmailsSection.openFreeWelcomeEmailModal();
        await welcomeEmailsSection.modalSubjectInput.clear();
        await welcomeEmailsSection.modalSubjectInput.fill('Custom Welcome Subject');
        await welcomeEmailsSection.saveWelcomeEmail();

        // TODO: Update test once full E2E functionality is added for welcome emails
        // We shouldn't assert via API directly, but for now this verifies the toggle works as expected
        const response = await page.request.get('/ghost/api/admin/automated_emails/');
        expect(response.ok()).toBe(true);

        const data = await response.json() as AutomatedEmailsResponse;
        const freeWelcomeEmail = data.automated_emails.find(email => email.slug === 'member-welcome-email-free');
        expect(freeWelcomeEmail).toBeDefined();
        expect(freeWelcomeEmail?.subject).toBe('Custom Welcome Subject');
    });

    test('edited welcome email content persists after page reload', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);
        const updatedContent = 'Persisted editor content';

        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.enableFreeWelcomeEmail();
        await welcomeEmailsSection.openFreeWelcomeEmailModal();
        await welcomeEmailsSection.replaceWelcomeEmailContent(updatedContent);
        await welcomeEmailsSection.saveWelcomeEmail();

        await page.reload();
        await welcomeEmailsSection.section.waitFor({state: 'visible'});

        await welcomeEmailsSection.openFreeWelcomeEmailModal();
        await expect(welcomeEmailsSection.modalLexicalEditor).toContainText(updatedContent);
    });

    test('edited welcome email subject persists after page reload', async ({page}) => {
        const welcomeEmailsSection = new MemberWelcomeEmailsSection(page);

        // Enable and edit free welcome email
        await welcomeEmailsSection.goto();
        await welcomeEmailsSection.enableFreeWelcomeEmail();
        await welcomeEmailsSection.openFreeWelcomeEmailModal();
        await welcomeEmailsSection.modalSubjectInput.clear();
        await welcomeEmailsSection.modalSubjectInput.fill('Persisted Subject');
        await welcomeEmailsSection.saveWelcomeEmail();

        // Reload the page
        await page.reload();
        await welcomeEmailsSection.section.waitFor({state: 'visible'});

        // Re-open the modal and verify the subject persisted
        await welcomeEmailsSection.openFreeWelcomeEmailModal();
        await expect(welcomeEmailsSection.modalSubjectInput).toHaveValue('Persisted Subject');
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

    test('saving design settings persists to the API', async ({page}) => {
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

    test('saving general settings persists to the API', async ({page}) => {
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

    test('saved design settings load when modal is reopened', async ({page}) => {
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
