import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class AccessSection extends BasePage {
    readonly section: Locator;
    readonly saveButton: Locator;
    readonly visibilitySelect: Locator;
    readonly passwordInput: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.section = page.getByTestId('access');
        this.saveButton = this.section.getByRole('button', {name: 'Save'});
        this.visibilitySelect = this.section.getByTestId('site-visibility-select');
        this.passwordInput = this.section.getByTestId('site-access-code');
    }

    async enablePrivateMode(password: string): Promise<void> {
        await this.visibilitySelect.click();
        await this.page.getByTestId('select-option').filter({hasText: /^Private$/}).click();
        await this.passwordInput.fill(password);
        await this.saveButton.click();
    }

    async disablePrivateMode(): Promise<void> {
        await this.visibilitySelect.click();
        await this.page.getByTestId('select-option').filter({hasText: /^Public$/}).click();
        await this.saveButton.click();
    }
}
