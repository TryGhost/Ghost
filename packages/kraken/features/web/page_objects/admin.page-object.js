class AdminPageObject {
    adminPage = "/ghost";

    constructor(driver) {
        this.driver = driver;
        this.adminPage = this.driver.baseUrl + this.adminPage;
    }

    async navigateToAdminPage() {
        await this.driver.url(this.adminPage);
        return await this.driver.pause(1000);
    }

    async clickOnLeftMenuOption(option) {
        const links = await this.driver.$$(".gh-nav-list a");

        for (let link of links) {
            const text = await link.getText();
            if (text.includes(option)) {
                await link.click();
                break;
            }
        }
    }

    async getCurrentPath() {
        const currentUrl = await this.driver.getUrl();
        const url = new URL(currentUrl);
        const currentHash = url.hash.substring(2);
        return currentHash;
    }

    async clickAdminSetting() {
        const element = await this.driver.$(
            ".ember-view.gh-nav-bottom-tabicon"
        );
        return await element.click();
    }


    async getUnsavedChangesMessage() {
        const element = await this.driver.$(
            'div[data-test-modal="unsaved-settings"] h1'
        );
        return await element.getText();
    }
}

module.exports = { AdminPageObject };
