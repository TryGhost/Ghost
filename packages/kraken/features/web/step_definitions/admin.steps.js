const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

Then("I should be on the {string} section", async function (sectionName) {
    const element = await this.driver.$(".gh-canvas-title");
    const elementText = await element.getText();
    expect(elementText).to.equal(sectionName);
});
