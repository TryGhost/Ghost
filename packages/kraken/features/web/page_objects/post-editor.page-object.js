const { faker } = require("@faker-js/faker");

class PostEditorPageObject {
    postEditorPage = "/ghost/#/editor/post";

    constructor(driver) {
        this.driver = driver;
        this.postEditorPage = this.driver.baseUrl + this.postEditorPage;
    }

    async navigateToPostEditor() {
        await this.driver.url(this.postEditorPage);
        return await this.driver.pause(1000);
    }

    async createAndPublishPost(title, url) {
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

    async clickReturnArrow() {
        const element = await this.driver.$('a[data-test-link="posts"]');
        return await element.click();
    }
}

module.exports = { PostEditorPageObject };
