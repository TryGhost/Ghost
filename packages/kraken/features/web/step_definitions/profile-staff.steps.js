const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");


When("I click your profile", async function () {
    return await this.profileStaffPageObject.clickProfile();
});

When('I edit the name with name {kraken-string}', async function (name) {
    return await this.profileStaffPageObject.setName(name);
});


When("I click in save", async function () {
    return await this.profileStaffPageObject.clickSave();
});


Then("I should be on the profile staff section", async function () {
    const elementText = await this.profileStaffPageObject.getOwnerSection();
    expect(elementText).to.equal("Owner");
});

Then('I should be on the profile staff section with name {kraken-string}', async function (name) {
    const elementText = await this.profileStaffPageObject.getName();
    const result=elementText.toString().substring(elementText.length - name.length);
    expect(result).to.equal(name);
});

