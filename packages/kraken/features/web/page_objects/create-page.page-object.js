const { faker } = require("@faker-js/faker");

class PageEditorPageObject {
    pageEditorPage = "/ghost/#/editor/page";

    constructor(driver) {
        this.driver = driver;
        this.pageEditorPage = this.driver.baseUrl + this.pageEditorPage;
    }

    async navigateToHomePage() {
        await this.driver.url(this.driver.baseUrl);
        return await this.driver.pause(1000);
    }

    async navigateToPageEditor() {
        await this.driver.url(this.pageEditorPage);
        return await this.driver.pause(1000);
    }

    async createAndPublishPage(title, url) {
        await this.setTitle(title);
        await this.setContent(faker.lorem.paragraph());
        await this.driver.pause(1000);
        await this.clickSettings();
        await this.driver.pause(1000);
        await this.setUrl(url);
        await this.clickEditorButton("Publish");
        await this.driver.pause(1000);
        await this.clickContinue();
        await this.driver.pause(1000);
        await this.clickConfirmPublish();
        return await this.driver.pause(1000);
    }

    async setTitle(title) {
        const element = await this.driver.$(
            "textarea[data-test-editor-title-input]"
        );
        return await element.setValue(title);
    }

    async setContent(content) {
        const element = await this.driver.$(
            'p[data-koenig-dnd-droppable="true"]'
        );
        await element.click();
        return await element.setValue(content);
    }

    async clickSettings() {
        const element = await this.driver.$("button[title='Settings']");
        return await element.click();
    }

    async setUrl(url) {
        const element = await this.driver.$("input#url");
        return await element.setValue(url);
    }

    async clickEditorButton(buttonName) {
        const elements = await this.driver.$$(`button.gh-btn-editor>span`);
        for (let element of elements) {
            const text = await element.getText();
            if (text.includes(buttonName)) {
                await element.click();
                break;
            }
        }
    }

    async clickContinue() {
        const elements = await this.driver.$$(`button.gh-btn-black>span`);
        for (let element of elements) {
            const text = await element.getText();
            if (text.includes("Continue, final review →")) {
                await element.click();
                break;
            }
        }
    }

    async clickConfirmPublish() {
        const element = this.driver.$(
            `button[data-test-button="confirm-publish"]`
        );
        return await element.click();
    }

    async clickBookmarkLink() {
        const element = await this.driver.$("a[data-test-complete-bookmark]");
        return await element.click();
    }

    async navigateToPage(url) {
        await this.driver.url(`${this.driver.baseUrl}/${url?.toLowerCase()}`);
        return await this.driver.pause(1000);
    }

    async getPageTitle() {
        const element = await this.driver.$("h1.gh-page-title");
        return await element.getText();
    }

    async navigateToPage(url) {
        await this.driver.url(`${this.driver.baseUrl}/${url?.toLowerCase()}`);
        return await this.driver.pause(1000);
    }

    async getPageTitle() {
        const element = await this.driver.$("h1.gh-article-title");
        return await element.getText();
    }

    async verifyPageInHome(title) {
        const elements = await this.driver.$$(`.nav`);
        const value=false;
        for (let element of elements) {
            const text = await element.getText();
            if (text.includes(title)) {
                value=true;
                break;
            }
        }
        return value;
    }
}

module.exports = { PageEditorPageObject };
