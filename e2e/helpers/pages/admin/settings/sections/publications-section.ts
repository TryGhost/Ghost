import {BasePage} from '@/helpers/pages';
import {Page} from '@playwright/test';

export class PublicationSection extends BasePage {
    readonly defaultLanguage = 'en';
    readonly languageSection;
    readonly saveButton;
    readonly localeSelect;
    readonly customLanguageField;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/publication-language');

        this.languageSection = this.page.getByTestId('publication-language');
        this.saveButton = this.languageSection.getByRole('button', {name: 'Save'});
        this.localeSelect = this.languageSection.getByTestId('locale-select');
        this.customLanguageField = this.languageSection.getByLabel('Site language');
    }

    /**
     * Sets the publication language using the dropdown.
     * If the language code is in the predefined list, it selects from dropdown.
     * Otherwise, it uses the "Other..." option and enters the custom code.
     */
    async setLanguage(language: string): Promise<void> {
        if (language.trim().length === 0) {
            throw new Error('Language must be a non-empty string');
        }

        // Try to select from the dropdown first
        await this.localeSelect.click();

        // Wait for dropdown options to be visible before checking
        await this.page.getByTestId('select-option').first().waitFor({state: 'visible'});

        // Check if the language code exists in the dropdown options
        const optionLocator = this.page.getByTestId('select-option').filter({hasText: `(${language.trim()})`});
        const optionCount = await optionLocator.count();

        if (optionCount > 0) {
            // Select from dropdown
            await optionLocator.first().click();
        } else {
            // Use "Other..." option for custom locale
            await this.page.getByTestId('select-option').filter({hasText: 'Other'}).click();
            await this.customLanguageField.fill(language.trim());
        }

        await this.saveButton.click();
    }

    async resetToDefaultLanguage() {
        await this.setLanguage(this.defaultLanguage);
    }
}
