const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

Then(
    "I should see a page with the post title {kraken-string}",
    async function (postTitle) {
        const element = await this.driver.$("h1.gh-article-title");
        const elementText = await element.getText();
        expect(elementText).to.equal(postTitle);
    }
);
