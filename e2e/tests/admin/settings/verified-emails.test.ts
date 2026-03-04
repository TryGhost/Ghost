import {MailPit} from '@/helpers/services/email/mail-pit';
import {VerifiedEmailSection} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {extractVerifiedEmailLink} from '@/helpers/services/email/utils';

interface VerifiedEmail {
    id: string;
    email: string;
    status: 'pending' | 'verified';
}

interface VerifiedEmailsResponse {
    verified_emails: VerifiedEmail[];
}

test.describe('Ghost Admin - Verified Emails', () => {
    test.use({
        config: {
            hostSettings__managedEmail__enabled: 'true',
            hostSettings__managedEmail__sendingDomain: 'example.com'
        }
    });

    test('can add, verify, and select an email address', async ({page}) => {
        const verifiedEmailSection = new VerifiedEmailSection(page);
        const emailClient = new MailPit();
        const testEmail = 'verified-test@example.com';

        // Navigate to settings and open the first newsletter
        await verifiedEmailSection.goto();
        await verifiedEmailSection.openNewsletterModal();

        // Open the sender email combobox and add a new email
        await verifiedEmailSection.openSenderEmailCombobox();
        await verifiedEmailSection.addEmailViaCombobox(testEmail);

        // Verify toast appears for verification email sent
        await expect(verifiedEmailSection.infoToast).toBeVisible();

        // Find the verification email in MailPit
        const messages = await emailClient.searchByRecipient(testEmail, {timeoutMs: 15000});
        expect(messages.length).toBeGreaterThan(0);
        expect(messages[0].Subject).toBe('Verify email address');

        // Extract the verification link from the email
        const detailedMessage = await emailClient.getMessageDetailed(messages[0]);
        const verificationLink = extractVerifiedEmailLink(detailedMessage);

        // Navigate to the verification link and wait for the verification API call to complete
        const verifyResponsePromise = page.waitForResponse(
            resp => resp.url().includes('/verified-emails/verify') && resp.status() === 200
        );
        await page.goto(verificationLink);
        await verifyResponsePromise;

        // Verify success - the toast or confirmation modal should appear
        const successToast = page.getByText('has been verified');
        const confirmationModal = page.getByText('Email address verified');
        await expect(successToast.or(confirmationModal).first()).toBeVisible({timeout: 10000});

        // Verify API shows email as verified
        const response = await page.request.get('/ghost/api/admin/verified-emails/');
        expect(response.ok()).toBe(true);
        const data = await response.json() as VerifiedEmailsResponse;
        const verifiedEmail = data.verified_emails.find(e => e.email === testEmail);
        expect(verifiedEmail).toBeDefined();
        expect(verifiedEmail?.status).toBe('verified');

        // After verification, the routing navigates to the newsletter detail modal.
        // Reload to start fresh, then reopen the newsletter to test selection.
        await page.reload();
        await verifiedEmailSection.goto();
        await verifiedEmailSection.openNewsletterModal();

        // Open the sender email combobox and verify the email appears as verified
        await verifiedEmailSection.openSenderEmailCombobox();
        const verifiedAddressItem = page.locator('[data-slot="command-item"]').filter({hasText: testEmail});
        await expect(verifiedAddressItem).toBeVisible();

        // Select the verified email
        await verifiedEmailSection.selectVerifiedEmail(testEmail);

        // Verify the combobox shows the selected email
        await expect(verifiedEmailSection.senderEmailCombobox).toContainText(testEmail);
    });

    test('can open manage verified emails modal from combobox', async ({page}) => {
        const verifiedEmailSection = new VerifiedEmailSection(page);

        await verifiedEmailSection.goto();
        await verifiedEmailSection.openNewsletterModal();

        await verifiedEmailSection.openSenderEmailCombobox();
        await verifiedEmailSection.openManageVerifiedEmailsModal();

        await expect(verifiedEmailSection.verifiedEmailsModal).toBeVisible();
    });

    test('verifying an email shows exactly one success toast', async ({page}) => {
        const verifiedEmailSection = new VerifiedEmailSection(page);
        const emailClient = new MailPit();
        const testEmail = 'single-verify-toast@example.com';

        // Add the email first
        await verifiedEmailSection.goto();
        await verifiedEmailSection.openNewsletterModal();
        await verifiedEmailSection.openSenderEmailCombobox();
        await verifiedEmailSection.addEmailViaCombobox(testEmail);
        await expect(verifiedEmailSection.infoToast).toBeVisible();

        // Get the verification link from MailPit
        const messages = await emailClient.searchByRecipient(testEmail, {timeoutMs: 15000});
        const detailedMessage = await emailClient.getMessageDetailed(messages[0]);
        const verificationLink = extractVerifiedEmailLink(detailedMessage);

        // Navigate to the verification link
        const verifyResponsePromise = page.waitForResponse(
            resp => resp.url().includes('/verified-emails/verify') && resp.status() === 200
        );
        await page.goto(verificationLink);
        await verifyResponsePromise;

        // Wait for the success toast to appear
        await expect(verifiedEmailSection.successToast.first()).toBeVisible({timeout: 10000});

        // Assert exactly one success toast (no duplicates)
        await expect(verifiedEmailSection.successToast).toHaveCount(1);
    });

    test('can add, verify, and select a support email in email settings', async ({page}) => {
        const verifiedEmailSection = new VerifiedEmailSection(page);
        const emailClient = new MailPit();
        const testEmail = 'support-email@example.com';

        // Navigate to settings and open the Emails section
        await verifiedEmailSection.goto();
        await verifiedEmailSection.openSupportAddressSection();

        // Verify the "No reply" special option is visible in the combobox
        await verifiedEmailSection.openSupportEmailCombobox();
        const noReplyOption = page.locator('[data-slot="command-item"]').filter({hasText: 'No reply'});
        await expect(noReplyOption).toBeVisible();

        // Add a new email address via the combobox
        await verifiedEmailSection.addEmailViaCombobox(testEmail);

        // Verify toast appears for verification email sent
        await expect(verifiedEmailSection.infoToast).toBeVisible();

        // Find the verification email in MailPit
        const messages = await emailClient.searchByRecipient(testEmail, {timeoutMs: 15000});
        expect(messages.length).toBeGreaterThan(0);

        // Extract the verification link and verify
        const detailedMessage = await emailClient.getMessageDetailed(messages[0]);
        const verificationLink = extractVerifiedEmailLink(detailedMessage);

        const verifyResponsePromise = page.waitForResponse(
            resp => resp.url().includes('/verified-emails/verify') && resp.status() === 200
        );
        await page.goto(verificationLink);
        await verifyResponsePromise;

        // Verification with setting context shows confirmation modal
        const confirmationModal = page.getByText('Email address verified');
        await expect(confirmationModal).toBeVisible({timeout: 10000});

        // Reload and navigate back to email settings to verify the email is selectable
        await page.reload();
        await verifiedEmailSection.goto();
        await verifiedEmailSection.openSupportAddressSection();

        // Open the support email combobox and select the verified email
        await verifiedEmailSection.openSupportEmailCombobox();
        const verifiedAddressItem = page.locator('[data-slot="command-item"]').filter({hasText: testEmail});
        await expect(verifiedAddressItem).toBeVisible();
        await verifiedEmailSection.selectVerifiedEmail(testEmail);

        // Verify the combobox shows the selected email
        await expect(verifiedEmailSection.supportEmailCombobox).toContainText(testEmail);
    });

    test('adding an email shows exactly one toast', async ({page}) => {
        const verifiedEmailSection = new VerifiedEmailSection(page);
        const testEmail = 'single-toast-test@example.com';

        await verifiedEmailSection.goto();
        await verifiedEmailSection.openNewsletterModal();

        await verifiedEmailSection.openSenderEmailCombobox();
        await verifiedEmailSection.addEmailViaCombobox(testEmail);

        // Wait for the toast to appear
        await expect(verifiedEmailSection.infoToast.first()).toBeVisible();

        // Assert exactly one toast is visible (no duplicates)
        await expect(verifiedEmailSection.infoToast).toHaveCount(1);
        await expect(verifiedEmailSection.successToast).toHaveCount(0);
    });
});
