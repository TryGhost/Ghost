import {MemberWelcomeEmailsSection} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

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
