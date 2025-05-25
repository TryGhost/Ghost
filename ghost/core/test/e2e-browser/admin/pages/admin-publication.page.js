const AdminPage = require('./admin-page');

class AdminPublicationPage extends AdminPage {
    #defaultLanguage = 'en';
    #languageSection = null;
    #saveButton = null;
    languageField = null;

    /**
     * @param {import('@playwright/test').Page} page - playwright page object
     */
    constructor(page) {
        super(page, '/ghost/#/settings/publication-language');

        this.#languageSection = this.page.getByTestId('publication-language');
        this.#saveButton = this.#languageSection.getByRole('button', {name: 'Save'});
        this.languageField = this.#languageSection.getByLabel('Site language');
    }

    async setLanguage(language) {
        await this.languageField.fill(language);
        await this.#saveButton.click();
    }

    async resetToDefaultLanguage() {
        await this.languageField.fill(this.#defaultLanguage);
        await this.#saveButton.click();
    }
}

module.exports = AdminPublicationPage;
