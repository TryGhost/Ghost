const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

When("I click profile icon", async function () {
    return await this.profileStaffPageObject.clickSettingProfile();
});

When("I click your profile", async function () {
    return await this.profileStaffPageObject.clickProfile();
});

Then("I should be on the profile staff section", async function () {
    const element = await this.driver.$(".text-md.font-semibold.capitalize.text-white");
    const elementText = await element.getText();
    expect(elementText).to.equal("Owner");
});

