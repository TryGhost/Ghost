import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class MemberWelcomeEmailsSection extends BasePage {
    readonly section: Locator;
    readonly freeWelcomeEmailToggle: Locator;
    readonly paidWelcomeEmailToggle: Locator;
    readonly freeWelcomeEmailEditButton: Locator;
    readonly paidWelcomeEmailEditButton: Locator;

    // Customize button and modal
    readonly customizeButton: Locator;
    readonly customizeModal: Locator;
    readonly customizeModalSaveButton: Locator;
    readonly customizeModalCloseButton: Locator;
    readonly customizeModalUnsavedChangesDialog: Locator;
    readonly customizeModalGeneralTab: Locator;
    readonly customizeModalDesignTab: Locator;

    // Customize modal — General tab locators
    readonly customizeModalHeaderImageUpload: Locator;
    readonly customizeModalPublicationTitleToggle: Locator;
    readonly customizeModalFooterTextarea: Locator;
    readonly customizeModalBadgeToggle: Locator;

    // Customize modal — Design tab locators
    readonly customizeModalButtonStyleFill: Locator;
    readonly customizeModalButtonStyleOutline: Locator;
    readonly customizeModalBodyFontSelect: Locator;
    readonly customizeModalBodyFontSerifOption: Locator;
    readonly customizeModalButtonColorField: Locator;
    readonly customizeModalButtonColorPickerTrigger: Locator;
    readonly customizeModalButtonColorAccentSwatch: Locator;
    readonly customizeModalButtonColorAutoSwatch: Locator;
    readonly customizeModalColorPickerPopover: Locator;

    // Modal locators
    readonly welcomeEmailModal: Locator;
    readonly modalEditor: Locator;
    readonly modalSubjectInput: Locator;
    readonly modalSaveButton: Locator;
    readonly modalSavedButton: Locator;
    readonly modalLexicalEditor: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/memberemails');
        this.section = page.getByTestId('memberemails');
        this.freeWelcomeEmailToggle = this.section.getByTestId('free-welcome-email-row').getByRole('switch');
        this.paidWelcomeEmailToggle = this.section.getByTestId('paid-welcome-email-row').getByRole('switch');
        this.freeWelcomeEmailEditButton = this.section.getByTestId('free-welcome-email-row').getByRole('button', {name: 'Edit'});
        this.paidWelcomeEmailEditButton = this.section.getByTestId('paid-welcome-email-row').getByRole('button', {name: 'Edit'});

        // Customize button and modal
        this.customizeButton = this.section.getByRole('button', {name: 'Customize'});
        this.customizeModal = page.getByTestId('welcome-email-customize-modal');
        this.customizeModalSaveButton = this.customizeModal.getByRole('button', {name: 'Save'});
        this.customizeModalCloseButton = this.customizeModal.getByRole('button', {name: 'Close'});
        this.customizeModalUnsavedChangesDialog = page.getByRole('alertdialog', {name: 'Are you sure you want to leave this page?'});
        this.customizeModalGeneralTab = this.customizeModal.getByRole('tab', {name: 'General'});
        this.customizeModalDesignTab = this.customizeModal.getByRole('tab', {name: 'Design'});

        // Customize modal — General tab
        this.customizeModalPublicationTitleToggle = this.customizeModal.getByText('Publication title').locator('..').getByRole('switch');
        this.customizeModalFooterTextarea = this.customizeModal.getByLabel('Email footer');
        this.customizeModalHeaderImageUpload = this.customizeModal.getByTestId('header-image-field');
        this.customizeModalBadgeToggle = this.customizeModal.getByText('Promote independent publishing').locator('../..').getByRole('switch');

        // Customize modal — Design tab
        this.customizeModalButtonStyleFill = this.customizeModal.getByLabel('Fill');
        this.customizeModalButtonStyleOutline = this.customizeModal.getByLabel('Outline');
        this.customizeModalBodyFontSelect = this.customizeModal.getByText('Body font').locator('..').getByRole('combobox');
        this.customizeModalBodyFontSerifOption = page.getByRole('option', {name: 'Elegant serif', exact: true});
        this.customizeModalButtonColorField = this.customizeModal.getByText('Button color').locator('..');
        this.customizeModalButtonColorPickerTrigger = this.customizeModalButtonColorField.getByRole('button', {name: 'Pick color'});
        this.customizeModalButtonColorAccentSwatch = this.customizeModal.getByRole('button', {name: 'Accent'});
        this.customizeModalButtonColorAutoSwatch = this.customizeModal.getByRole('button', {name: 'Auto'});
        this.customizeModalColorPickerPopover = page.locator('[data-radix-popper-content-wrapper]');

        // Modal locators
        this.welcomeEmailModal = page.getByTestId('welcome-email-modal');
        this.modalEditor = this.welcomeEmailModal.getByTestId('welcome-email-editor');
        this.modalSubjectInput = this.welcomeEmailModal.locator('input').first();
        this.modalSaveButton = this.welcomeEmailModal.getByRole('button', {name: 'Save'});
        this.modalSavedButton = this.welcomeEmailModal.getByRole('button', {name: 'Saved'});
        this.modalLexicalEditor = this.modalEditor.getByRole('textbox').first();
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

    async enablePaidWelcomeEmail(): Promise<void> {
        if (!await this.isPaidWelcomeEmailEnabled()) {
            await this.paidWelcomeEmailToggle.click();
            await this.waitForPaidToggle(true);
        }
    }

    async disablePaidWelcomeEmail(): Promise<void> {
        if (await this.isPaidWelcomeEmailEnabled()) {
            await this.paidWelcomeEmailToggle.click();
            await this.waitForPaidToggle(false);
        }
    }

    async isFreeWelcomeEmailEnabled(): Promise<boolean> {
        const ariaChecked = await this.freeWelcomeEmailToggle.getAttribute('aria-checked');
        return ariaChecked === 'true';
    }

    async isPaidWelcomeEmailEnabled(): Promise<boolean> {
        const ariaChecked = await this.paidWelcomeEmailToggle.getAttribute('aria-checked');
        return ariaChecked === 'true';
    }

    private async waitForFreeToggle(checked: boolean): Promise<void> {
        const toggle = this.section.getByTestId('free-welcome-email-row').getByRole('switch', {checked});
        await toggle.waitFor({state: 'visible'});
    }

    private async waitForPaidToggle(checked: boolean): Promise<void> {
        const toggle = this.section.getByTestId('paid-welcome-email-row').getByRole('switch', {checked});
        await toggle.waitFor({state: 'visible'});
    }

    async openFreeWelcomeEmailModal(): Promise<void> {
        await this.openWelcomeEmailModal(this.freeWelcomeEmailEditButton);
    }

    async openPaidWelcomeEmailModal(): Promise<void> {
        await this.openWelcomeEmailModal(this.paidWelcomeEmailEditButton);
    }

    async saveWelcomeEmail(): Promise<void> {
        await this.modalSaveButton.click();
        await this.modalSavedButton.waitFor({state: 'visible'});
    }

    private async waitForWelcomeEmailEditor(): Promise<void> {
        await this.modalEditor.waitFor({state: 'visible'});
        await this.modalLexicalEditor.waitFor({state: 'visible'});
    }

    async replaceWelcomeEmailContent(content: string): Promise<void> {
        await this.modalLexicalEditor.click();
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.keyboard.press('Backspace');
        await this.modalLexicalEditor.type(content);
    }

    private async openWelcomeEmailModal(editButton: Locator): Promise<void> {
        await this.freeWelcomeEmailToggle.waitFor({state: 'visible'});
        await editButton.waitFor({state: 'visible'});
        await editButton.click();
        await this.welcomeEmailModal.waitFor({state: 'visible'});
        await this.waitForWelcomeEmailEditor();
    }

    async openCustomizeModal(): Promise<void> {
        await this.customizeButton.waitFor({state: 'visible'});
        await this.customizeButton.click();
        await this.customizeModal.waitFor({state: 'visible'});
        await this.waitForCustomizeModalLoaded();
    }

    private async waitForCustomizeModalLoaded(): Promise<void> {
        await this.customizeModalPublicationTitleToggle.waitFor({state: 'visible'});
    }

    async saveCustomizeModal(): Promise<void> {
        const saveResponse = this.page.waitForResponse(
            resp => resp.url().includes('/automated_emails/design') && resp.request().method() === 'PUT'
        );
        await this.customizeModalSaveButton.click();
        await saveResponse;
        await this.customizeModal.waitFor({state: 'visible'});
        await this.customizeModalSaveButton.waitFor({state: 'visible'});
    }

    async closeCustomizeModal(): Promise<void> {
        await this.customizeModalCloseButton.click();
        await this.customizeModal.waitFor({state: 'hidden'});
    }

    async switchToDesignTab(): Promise<void> {
        await this.customizeModalDesignTab.click();
    }

    async switchToGeneralTab(): Promise<void> {
        await this.customizeModalGeneralTab.click();
    }

    async chooseBodyFont(optionName: 'Elegant serif' | 'Clean sans-serif'): Promise<void> {
        await this.customizeModalBodyFontSelect.click();
        await this.page.getByRole('option', {name: optionName, exact: true}).click();
    }
}
