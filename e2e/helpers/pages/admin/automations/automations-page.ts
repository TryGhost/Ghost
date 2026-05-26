import {AdminPage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class AutomationsPage extends AdminPage {
    readonly pageRoot: Locator;
    readonly emailDesignButton: Locator;
    readonly emailDesignModal: Locator;
    readonly emailDesignModalTitle: Locator;
    readonly emailDesignGeneralTab: Locator;
    readonly emailDesignDesignTab: Locator;
    readonly emailDesignSenderNameInput: Locator;
    readonly emailDesignSenderEmailInput: Locator;
    readonly emailDesignReplyToEmailInput: Locator;
    readonly emailDesignFooterInput: Locator;
    readonly emailDesignSaveButton: Locator;
    readonly emailDesignSavedButton: Locator;
    readonly emailDesignCloseButton: Locator;
    readonly publicationTitleToggle: Locator;
    readonly publicationIconToggle: Locator;
    readonly badgeToggle: Locator;
    readonly headingFontSelect: Locator;
    readonly headingWeightSelect: Locator;
    readonly bodyFontSelect: Locator;
    readonly buttonStyleOutline: Locator;
    readonly buttonCornersPill: Locator;
    readonly linkStyleBold: Locator;
    readonly imageCornersRounded: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/automations';

        this.pageRoot = page.getByTestId('automations-page');
        this.emailDesignButton = page.getByRole('button', {name: 'Email design'});
        this.emailDesignModal = page.getByTestId('automation-email-design-modal');
        this.emailDesignModalTitle = this.emailDesignModal.getByRole('heading', {name: 'Email design'});
        this.emailDesignGeneralTab = this.emailDesignModal.getByRole('tab', {name: 'General'});
        this.emailDesignDesignTab = this.emailDesignModal.getByRole('tab', {name: 'Design'});
        this.emailDesignSenderNameInput = this.emailDesignModal.getByLabel('Sender name');
        this.emailDesignSenderEmailInput = this.emailDesignModal.getByLabel('Sender email');
        this.emailDesignReplyToEmailInput = this.emailDesignModal.getByLabel('Reply-to email');
        this.emailDesignFooterInput = this.emailDesignModal.getByLabel('Email footer');
        this.emailDesignSaveButton = this.emailDesignModal.getByRole('button', {name: 'Save'});
        this.emailDesignSavedButton = this.emailDesignModal.getByRole('button', {name: 'Saved'});
        this.emailDesignCloseButton = this.emailDesignModal.getByRole('button', {name: 'Close'});
        this.publicationTitleToggle = this.emailDesignModal.getByText('Publication title').locator('..').getByRole('switch');
        this.publicationIconToggle = this.emailDesignModal.getByText('Publication icon').locator('..').getByRole('switch');
        this.badgeToggle = this.emailDesignModal.locator('.mt-6').filter({hasText: 'Promote independent publishing'}).getByRole('switch');
        this.headingFontSelect = this.getEmailDesignField('Heading font').getByRole('combobox');
        this.headingWeightSelect = this.getEmailDesignField('Heading weight').getByRole('combobox');
        this.bodyFontSelect = this.getEmailDesignField('Body font').getByRole('combobox');
        this.buttonStyleOutline = this.getEmailDesignField('Button style').getByRole('radio', {name: 'Outline'});
        this.buttonCornersPill = this.getEmailDesignField('Button corners').getByRole('radio', {name: 'Pill'});
        this.linkStyleBold = this.getEmailDesignField('Link style').getByRole('radio', {name: 'Bold'});
        this.imageCornersRounded = this.getEmailDesignField('Image corners').getByRole('radio', {name: 'Rounded'});
    }

    async waitUntilLoaded(): Promise<void> {
        await this.pageRoot.waitFor({state: 'visible'});
    }

    async openEmailDesignModal(): Promise<void> {
        await this.emailDesignButton.click();
        await this.emailDesignModal.waitFor({state: 'visible'});
        await this.emailDesignSenderNameInput.waitFor({state: 'visible'});
    }

    async closeEmailDesignModal(): Promise<void> {
        await this.emailDesignCloseButton.click();
        await this.emailDesignModal.waitFor({state: 'hidden'});
    }

    async saveEmailDesignModal(): Promise<void> {
        const designResponse = this.page.waitForResponse(
            response => response.url().includes('/ghost/api/admin/automated_emails/design') &&
                response.request().method() === 'PUT'
        );

        await this.emailDesignSaveButton.click();
        await designResponse;
        await this.emailDesignSavedButton.waitFor({state: 'visible'});
    }

    async switchToEmailDesignTab(): Promise<void> {
        await this.emailDesignDesignTab.click();
    }

    async switchToEmailDesignGeneralTab(): Promise<void> {
        await this.emailDesignGeneralTab.click();
    }

    async chooseSelectOption(select: Locator, optionName: string): Promise<void> {
        await select.click();
        await this.page.getByRole('option', {name: optionName, exact: true}).click();
    }

    async setEmailDesignColor(fieldName: string, hexValue: string): Promise<void> {
        await this.getEmailDesignField(fieldName).getByRole('button', {name: 'Pick color'}).click();
        await this.page.getByRole('textbox').fill(hexValue);
        await this.page.keyboard.press('Escape');
    }

    async openEmailDesignColorPicker(fieldName: string): Promise<Locator> {
        await this.getEmailDesignField(fieldName).getByRole('button', {name: 'Pick color'}).click();
        const colorInput = this.page.getByRole('textbox');
        await colorInput.waitFor({state: 'visible'});
        return colorInput;
    }

    getEmailDesignField(fieldName: string): Locator {
        return this.emailDesignModal.getByText(fieldName, {exact: true}).locator('..');
    }
}
