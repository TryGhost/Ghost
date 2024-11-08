const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

Given("I am on the page editor page", async function () {
    return await this.pageEditorPageObject.navigateToPageEditor();
});



When(
    "I create and publish a page with title {kraken-string} and url {kraken-string}",
    async function (title, url) {
        return await this.pageEditorPageObject.createAndPublishPage(title, url);
    }
);

When("I type a post title {kraken-string}", async function (string) {
    return await this.pageEditorPageObject.setTitle(string);
});

When("I type a random content {kraken-string}", async function (string) {
    return await this.pageEditorPageObject.setContent(string);
});

When(`I click the "Settings" button`, async function () {
    return await this.pageEditorPageObject.clickSettings();
});

When("I type a random page url {kraken-string}", async function (string) {
    return await this.pageEditorPageObject.setUrl(string);
});

When(`I click the {string} editor button`, async function (buttonName) {
    return await this.pageEditorPageObject.clickEditorButton(buttonName);
});

When(`I click the "Continue" button`, async function () {
    return await this.pageEditorPageObject.clickContinue();
});

When('I click the "Confirm publish" button', async function () {
    return await this.pageEditorPageObject.clickConfirmPublish();
});

When("I click the page bookmark link", async function () {
    return await this.pageEditorPageObject.clickBookmarkLink();
});


Then(
    "I should see a page with the page title {kraken-string}",
    async function (pageTitle) {
        const currentPageTitle = await this.pageEditorPageObject.getPageTitle();

        expect(currentPageTitle).to.equal(pageTitle);
    }
);

Then(
    "I shouldn't see a page in home page with title {kraken-string}",
    async function (pageTitle) {
        const isInHome = await this.pageEditorPageObject.verifyPageInHome(pageTitle);
        expect(false).to.equal(isInHome);
    }
);

When("I navigate to the page url {kraken-string}", async function (postUrl) {
    return await this.pageEditorPageObject.navigateToPage(postUrl);
});

When("I navigate to the home page", async function () {
    return await this.pageEditorPageObject.navigateToHomePage();
});


