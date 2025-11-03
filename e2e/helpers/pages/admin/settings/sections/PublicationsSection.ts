import {BasePage} from '../../../BasePage';
import {Page} from '@playwright/test';

export class PublicationSection extends BasePage {
    readonly defaultLanguage = 'en';
    readonly languageSection;
    readonly saveButton;
    readonly languageField;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/publication-language');

        this.languageSection = this.page.getByTestId('publication-language');
        this.saveButton = this.languageSection.getByRole('button', {name: 'Save'});
        this.languageField = this.languageSection.getByLabel('Site language');
    }

    async setLanguage(language: string): Promise<void> {
        if (language.trim().length === 0) {
            throw new Error('Language must be a non-empty string');
        }

        await this.languageField.fill(language.trim());
        await this.saveButton.click();
    }

    async resetToDefaultLanguage() {
        await this.languageField.fill(this.defaultLanguage);
        await this.saveButton.click();
    }
}
