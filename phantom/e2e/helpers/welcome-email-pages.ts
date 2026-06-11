// Trimmed vendoring of /e2e/helpers/pages/admin/settings/sections/
// member-welcome-emails-section.ts — only the pieces the vendored suite uses.
import type {FrameLocator, Locator, Page} from '@playwright/test';
import {BasePage} from './pages';

export class MemberWelcomeEmailsSection extends BasePage {
    readonly section: Locator;
    readonly freeWelcomeEmailToggle: Locator;
    readonly freeWelcomeEmailEditButton: Locator;

    readonly welcomeEmailModal: Locator;
    readonly modalEditor: Locator;
    readonly modalSubjectInput: Locator;
    readonly modalSaveButton: Locator;
    readonly modalSavedButton: Locator;
    readonly modalLexicalEditor: Locator;
    readonly modalEditTab: Locator;
    readonly modalPreviewTab: Locator;
    readonly modalPreviewSubjectInput: Locator;
    readonly modalPreviewIframe: Locator;
    readonly modalPreviewFrame: FrameLocator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/memberemails');
        this.section = page.getByTestId('memberemails');
        this.freeWelcomeEmailToggle = this.section.getByTestId('free-welcome-email-row').getByRole('switch');
        this.freeWelcomeEmailEditButton = this.section.getByTestId('free-welcome-email-row').getByRole('button', {name: 'Edit'});

        this.welcomeEmailModal = page.getByTestId('welcome-email-modal');
        this.modalEditor = this.welcomeEmailModal.getByTestId('welcome-email-editor');
        this.modalEditTab = this.welcomeEmailModal.getByTestId('welcome-email-mode-edit');
        this.modalPreviewTab = this.welcomeEmailModal.getByTestId('welcome-email-mode-preview');
        this.modalPreviewSubjectInput = this.welcomeEmailModal.getByTestId('welcome-email-preview-subject');
        this.modalSubjectInput = this.modalPreviewSubjectInput;
        this.modalSaveButton = this.welcomeEmailModal.getByRole('button', {name: 'Save'});
        this.modalSavedButton = this.welcomeEmailModal.getByRole('button', {name: 'Saved'});
        this.modalLexicalEditor = this.modalEditor.getByRole('textbox').first();
        this.modalPreviewIframe = this.welcomeEmailModal.getByTestId('welcome-email-preview-iframe');
        this.modalPreviewFrame = page.frameLocator('iframe[title="Welcome email preview"]');
    }

    async enableFreeWelcomeEmail(): Promise<void> {
        if (!await this.isFreeWelcomeEmailEnabled()) {
            await this.freeWelcomeEmailToggle.click();
            await this.waitForFreeToggle(true);
        }
    }

    async disableFreeWelcomeEmail(): Promise<void> {
        if (await this.isFreeWelcomeEmailEnabled()) {
            await this.freeWelcomeEmailToggle.click();
            await this.waitForFreeToggle(false);
        }
    }

    async isFreeWelcomeEmailEnabled(): Promise<boolean> {
        await this.freeWelcomeEmailToggle.waitFor({state: 'visible'});
        const ariaChecked = await this.freeWelcomeEmailToggle.getAttribute('aria-checked');
        return ariaChecked === 'true';
    }

    private async waitForFreeToggle(checked: boolean): Promise<void> {
        const toggle = this.section.getByTestId('free-welcome-email-row').getByRole('switch', {checked});
        await toggle.waitFor({state: 'visible'});
    }

    async openFreeWelcomeEmailModal(): Promise<void> {
        await this.freeWelcomeEmailToggle.waitFor({state: 'visible'});
        await this.freeWelcomeEmailEditButton.waitFor({state: 'visible'});
        await this.freeWelcomeEmailEditButton.click();
        await this.welcomeEmailModal.waitFor({state: 'visible'});
        await this.modalEditor.waitFor({state: 'visible'});
        await this.modalLexicalEditor.waitFor({state: 'visible'});
    }

    async saveWelcomeEmail(): Promise<void> {
        await this.modalSaveButton.click();
        await this.modalSavedButton.waitFor({state: 'visible'});
    }

    async replaceWelcomeEmailContent(content: string): Promise<void> {
        await this.modalLexicalEditor.click();
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.keyboard.press('Backspace');
        await this.modalLexicalEditor.type(content);
    }
}
