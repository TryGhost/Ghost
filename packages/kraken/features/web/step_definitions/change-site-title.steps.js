const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

When("I modify the title to {kraken-string}", async function (title) {
    return await this.settingsPageObject.setSiteTitle(title);
});

When("I navigate to Site page", async function () {
    return await this.sitePageObject.navigateToSitePage();
});

Then("the site name should be {kraken-string}", async function (expectedTitle) {
    const currentTitle = await this.sitePageObject.getSiteTitle();
    expect(currentTitle).to.equal(expectedTitle);
});
