const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

Then(
    "I should see a page with the post title {kraken-string}",
    async function (postTitle) {
        const currentPostTitle = await this.postViewerPageObject.getPostTitle();

        expect(currentPostTitle).to.equal(postTitle);
    }
);

When("I navigate to the post url {kraken-string}", async function (postUrl) {
    return await this.postViewerPageObject.navigateToPost(postUrl);
});
