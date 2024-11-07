const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

When("I click profile icon", async function () {
    const element = await this.driver.$(".ember-view.gh-nav-bottom-tabicon");
    return await element.click();
});

When("I click your profile", async function () {
    const element = await this.driver.$("button.ml-2.inline-block.text-sm.font-bold.text-green");
    return await element.click();
});

Then("I should be on the profile staff section", async function () {
    const element = await this.driver.$(".text-md.font-semibold.capitalize.text-white");
    const elementText = await element.getText();
    expect(elementText).to.equal("Owner");
});

