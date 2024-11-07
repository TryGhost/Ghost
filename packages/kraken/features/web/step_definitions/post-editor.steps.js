const { When, Given } = require("@cucumber/cucumber");

Given("I am on the post editor page", async function () {
    return await this.postEditorPageObject.navigateToPostEditor();
});

When(
    "I create and publish a post with title {kraken-string} and url {kraken-string}",
    async function (title, url) {
        return await this.postEditorPageObject.createAndPublishPost(title, url);
    }
);

When("I type a post title {kraken-string}", async function (string) {
    return await this.postEditorPageObject.setTitle(string);
});

When("I type a random content {kraken-string}", async function (string) {
    return await this.postEditorPageObject.setContent(string);
});

When(`I click the "Settings" button`, async function () {
    return await this.postEditorPageObject.clickSettings();
});

When("I type a random page url {kraken-string}", async function (string) {
    return await this.postEditorPageObject.setUrl(string);
});

When(`I click the {string} editor button`, async function (buttonName) {
    return await this.postEditorPageObject.clickEditorButton(buttonName);
});

When(`I click the "Continue" button`, async function () {
    return await this.postEditorPageObject.clickContinue();
});

When('I click the "Confirm publish" button', async function () {
    return await this.postEditorPageObject.clickConfirmPublish();
});

When("I click the post bookmark link", async function () {
    return await this.postEditorPageObject.clickBookmarkLink();
});
