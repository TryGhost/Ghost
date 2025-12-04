import {MemberWelcomeEmailsSection} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

interface AutomatedEmail {
    slug: string;
    status: string;
}

interface AutomatedEmailsResponse {
    automated_emails: AutomatedEmail[];
}

test.describe('Ghost Admin - Member Welcome Emails', () => {
    test.use({labs: {welcomeEmails: true}});

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
