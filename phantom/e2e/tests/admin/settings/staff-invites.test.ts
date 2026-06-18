// Vendored from /e2e/tests/admin/settings/staff-invites.test.ts; the email
// client reads phantom's in-memory mail sink.
import type {Browser, Page} from '@playwright/test';
import {MailPit, extractInviteLink} from '../../../helpers/mailpit';
import {SettingsPage} from '../../../helpers/settings-pages';
import {expect, test} from '../../../helpers/fixture';

class InviteSignupPage {
    constructor(private readonly page: Page) {}

    async acceptInvite(name: string, email: string, password: string): Promise<void> {
        await this.page.getByPlaceholder('Jamie Larson').waitFor({state: 'visible'});
        await this.page.getByPlaceholder('Jamie Larson').fill(name);
        await this.page.getByPlaceholder('jamie@example.com').fill(email);
        await this.page.getByPlaceholder('At least 10 characters').fill(password);
        await this.page.getByRole('button', {name: 'Create Account'}).click();
    }
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

test.describe('Ghost Admin - Staff Invites', () => {
    test('new staff member can sign up using an invite link', async ({page, browser, baseURL}) => {
        const emailClient = new MailPit(baseURL!);
        const testEmail = `test-invite-${Date.now()}@example.com`;

        const settingsPage = new SettingsPage(page);
        await settingsPage.staffSection.goto();
        await settingsPage.staffSection.inviteUser(testEmail);

        const messages = await emailClient.search({subject: 'has invited you to join', to: testEmail});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]!);
        const inviteUrl = extractInviteLink(latestMessage);

        await withIsolatedPage(browser, {baseURL}, async ({page: signupPage}) => {
            const inviteSignup = new InviteSignupPage(signupPage);
            await signupPage.goto(inviteUrl);
            await inviteSignup.acceptInvite('Test Invite User', testEmail, 'test123456');

            await expect(signupPage).toHaveURL(/\/ghost\/#\//, {timeout: 30000});

            await signupPage.getByRole('button', {name: 'Open user menu'}).click();
            await expect(signupPage.getByText(testEmail)).toBeVisible();
        });
    });
});
