const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");


When("I edit language {string}", async function (value) {
    return await this.changeLanguagePageObject.editLanguage(value);
});

When("I click in edit language", async function () {
    return await this.changeLanguagePageObject.clickEditLanguage();
});

When("I clear the input", async function () {
    return await this.changeLanguagePageObject.cleanInput();
});

When("I click in save language", async function () {
    return await this.changeLanguagePageObject.saveLanguage();
});


Then("I verify the language {string}", async function (value) {
    await this.changeLanguagePageObject.navigateToHomePage();
    const language = await this.changeLanguagePageObject.getLanguage();
    expect(language).to.not.equal(value);
});





