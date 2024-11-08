class PostListPageObject {
    postListPage = "/ghost/#/posts";

    constructor(driver) {
        this.driver = driver;
        this.postListPage = this.driver.baseUrl + this.postListPage;
    }

    async navigateToPostList() {
        await this.driver.url(this.postListPage);
        return await this.driver.pause(1000);
    }

    async getPostFromList(title) {
        const elements = await this.driver.$$(".posts-list");
        for (let element of elements) {
            const titleElement = await element.$(".gh-content-entry-title");
            const text = await titleElement.getText();
            if (text.includes(title)) {
                return element;
            }
        }
    }

    async getPostStatus(post) {
        const statusElement = await post.$(".gh-content-entry-status>span");
        return await statusElement.getText();
    }
}

module.exports = { PostListPageObject };
