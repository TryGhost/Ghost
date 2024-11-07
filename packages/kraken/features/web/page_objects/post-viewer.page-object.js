class PostViewerPageObject {
    postViewerPage = "";

    constructor(driver) {
        this.driver = driver;
        this.postViewerPage = this.driver.baseUrl + this.postViewerPage;
    }

    async navigateToPost(url) {
        await this.driver.url(`${this.postViewerPage}/${url?.toLowerCase()}`);
        return await this.driver.pause(1000);
    }

    async getPostTitle() {
        const element = await this.driver.$("h1.gh-article-title");
        return await element.getText();
    }
}

module.exports = { PostViewerPageObject };
