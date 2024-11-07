const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

When('I click the "Create Post" button', async function () {
    const element = await this.driver.$("a[data-test-new-post-button]");
    return await element.click();
});
