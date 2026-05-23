import {MemberWelcomeEmailsSection} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

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

test.describe('Ghost Admin - Paid Member Welcome Emails', () => {
    test.use({stripeEnabled: true});

    test('paid welcome emails toggle - enables paid welcome emails', async ({page}) => {
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
