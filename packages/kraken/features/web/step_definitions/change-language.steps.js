const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");


When("I edit language", async function () {
    return await this.changeLanguagePageObject.editLanguage('es');
});

When("I click in edit language", async function () {
    return await this.changeLanguagePageObject.clickEditLanguage();
});

Then("I verify the language", async function () {
    const language = await this.changeLanguagePageObject.getLanguage();

        expect(language).to.equal("en");
});



