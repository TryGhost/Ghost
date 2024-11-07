class AdminPageObject {
    adminPage = "/ghost";

    constructor(driver) {
        this.driver = driver;
        this.adminPage = this.driver.baseUrl + this.adminPage;
    }

    async navigateToAdminPage() {
        await this.driver.url(this.postEditorPage);
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
}

module.exports = { AdminPageObject };
