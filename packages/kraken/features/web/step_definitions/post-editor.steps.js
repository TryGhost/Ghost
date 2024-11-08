const { When, Given, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

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

When(`I click the "Settings" button`, async function () {
    return await this.postEditorPageObject.clickSettings();
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

When("I click on the return arrow", async function () {
    return await this.postEditorPageObject.clickReturnArrow();
});

Then(
    "I should see a post {kraken-string} in the post list flagged as draft",
    async function (postTitle) {
        const post = await this.postListPageObject.getPostFromList(postTitle);
        console.log("!!!post!!!!!", post);
        expect(post).to.exist;
        const postStatus = await this.postListPageObject.getPostStatus(post);
        expect(postStatus).to.include("Draft");
    }
);
