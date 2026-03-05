import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class VerifiedEmailSection extends BasePage {
    // Newsletter list
    readonly newslettersSection: Locator;
    readonly firstNewsletterEditButton: Locator;

    // Newsletter detail modal
    readonly newsletterModal: Locator;
    readonly senderEmailCombobox: Locator;
    readonly replyToCombobox: Locator;

    // Support address section (under Membership)
    readonly supportAddressSection: Locator;
    readonly supportAddressSectionEditButton: Locator;
    readonly supportEmailCombobox: Locator;

    // Combobox popover content (rendered in a portal, scoped to page)
    readonly commandInput: Locator;
    readonly commandList: Locator;

    // Verified emails modal
    readonly verifiedEmailsModal: Locator;

    // Toasts
    readonly infoToast: Locator;
    readonly successToast: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.newslettersSection = page.getByTestId('newsletters');
        this.firstNewsletterEditButton = page.getByTestId('edit-newsletter-button').first();

        this.newsletterModal = page.getByTestId('newsletter-modal');

        // VerifiedEmailSelect uses data-testid based on context.property or context.key
        this.senderEmailCombobox = page.getByTestId('verified-email-select-sender_email').getByRole('combobox');
        this.replyToCombobox = page.getByTestId('verified-email-select-sender_reply_to').getByRole('combobox');

        this.supportAddressSection = page.getByTestId('support-address');
        this.supportAddressSectionEditButton = this.supportAddressSection.getByRole('button', {name: 'Edit'});
        this.supportEmailCombobox = page.getByTestId('verified-email-select-members_support_address').getByRole('combobox');

        // Popover content is portaled to document body
        this.commandInput = page.getByPlaceholder('Search or add email address...');
        this.commandList = page.locator('[data-slot="command-list"]');

        this.verifiedEmailsModal = page.getByTestId('verified-emails-modal');

        this.infoToast = page.getByTestId('toast-info');
        this.successToast = page.getByTestId('toast-success');
    }

    async openNewsletterModal(): Promise<void> {
        await this.newslettersSection.waitFor({state: 'visible'});
        await this.firstNewsletterEditButton.click();
        await this.newsletterModal.waitFor({state: 'visible'});
    }

    async openSupportAddressSection(): Promise<void> {
        await this.supportAddressSection.waitFor({state: 'visible'});
        await this.supportAddressSectionEditButton.click();
        await this.supportEmailCombobox.waitFor({state: 'visible'});
    }

    async openSupportEmailCombobox(): Promise<void> {
        await this.supportEmailCombobox.click();
        await this.commandInput.waitFor({state: 'visible'});
    }

    async openSenderEmailCombobox(): Promise<void> {
        await this.senderEmailCombobox.click();
        await this.commandInput.waitFor({state: 'visible'});
    }

    async openReplyToCombobox(): Promise<void> {
        await this.replyToCombobox.click();
        await this.commandInput.waitFor({state: 'visible'});
    }

    async addEmailViaCombobox(email: string): Promise<void> {
        await this.commandInput.fill(email);
        const addOption = this.page.locator('[data-slot="command-item"]').filter({hasText: `Add ${email}`});
        await addOption.waitFor({state: 'visible'});
        await addOption.click();
    }

    async selectVerifiedEmail(email: string): Promise<void> {
        const emailOption = this.page.locator('[data-slot="command-item"]').filter({hasText: email});
        await emailOption.click();
    }

    async openManageVerifiedEmailsModal(): Promise<void> {
        const manageOption = this.page.locator('[data-slot="command-item"]').filter({hasText: 'Manage verified emails...'});
        await manageOption.click();
        await this.verifiedEmailsModal.waitFor({state: 'visible'});
    }
}
