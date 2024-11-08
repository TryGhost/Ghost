const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

Given("I am in the Settings page", async function () {
    return await this.settingsPageObject.navigateToSettingsPage();
});

When("I click the edit title and description option", async function () {
    return await this.settingsPageObject.clickEditTitleAndDescription();
});

When("I click the save title button", async function () {
    return await this.settingsPageObject.clickSaveTitleButton();
});
