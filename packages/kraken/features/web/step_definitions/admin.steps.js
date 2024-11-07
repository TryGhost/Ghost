const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

When("I click the {string} section", async function (sectionName) {
    return await this.adminPageObject.clickOnLeftMenuOption(sectionName);
});

Then("I should be on the {string} section", async function (expectedPath) {
    const currentPath = await this.adminPageObject.getCurrentPath();
    expect(currentPath).to.equal(expectedPath);
});
