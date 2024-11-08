class SitePageObject {
    sitePage = "/";

    constructor(driver) {
        this.driver = driver;
        this.sitePage = this.driver.baseUrl + this.sitePage;
    }

    async navigateToSitePage() {
        await this.driver.url(this.sitePage);
        return await this.driver.pause(1000);
    }

    async getSiteTitle() {
        const title = await this.driver.getTitle();
        return title;
    }
}

module.exports = { SitePageObject };
