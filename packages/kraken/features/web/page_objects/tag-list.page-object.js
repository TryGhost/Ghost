const { faker } = require("@faker-js/faker");

class TagListPageObject {
    tagListPage = "/ghost/#/tags";

    constructor(driver) {
        this.driver = driver;
        this.tagListPage = this.driver.baseUrl + this.tagListPage;
    }

    async navigateToTagListPage() {
        await this.driver.url(this.tagListPage);
        return await this.driver.pause(2000);
    }

    async getTagFromList(tagName) {
        const elements = await this.driver.$$(".gh-tags-list-item");
        for (let element of elements) {
            const titleElement = await element.$(".gh-tag-list-name");
            const text = await titleElement.getText();
            if (text.includes(tagName)) {
                return element;
            }
        }
    }
}

module.exports = { TagListPageObject };
