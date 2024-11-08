class SettingsPageObject {
    adminPage = "/ghost/#/settings";

    constructor(driver) {
        this.driver = driver;
        this.adminPage = this.driver.baseUrl + this.adminPage;
    }

    async navigateToSettingsPage() {
        await this.driver.url(this.adminPage);
        return await this.driver.pause(1000);
    }

    async clickEditTitleAndDescription() {
        const element = await this.driver.$(
            'div[data-testid="title-and-description"] button'
        );
        return await element.click();
    }

    async setSiteTitle(title) {
        const element = await this.driver.$(
            'div[data-testid="title-and-description"] input[placeholder="Site title"]'
        );
        await element.clearValue();
        return await element.setValue(title);
    }

    async clickSaveTitleButton() {
        const elements = await this.driver.$$(
            'div[data-testid="title-and-description"] button'
        );

        for (let element of elements) {
            const text = await element.$("span").getText();
            if (text.includes("Save")) {
                await element.click();
                break;
            }
        }
    }

    async clickExitSettingsButton() {
        const element = await this.driver.$(
            'button[data-testid="exit-settings"]'
        );
        return await element.click();
    }

    async getUnsavedChangesMessage() {
        const element = await this.driver.$(
            'section[data-testid="confirmation-modal"] h3'
        );
        return await element.getText();
    }
}

module.exports = { SettingsPageObject };
