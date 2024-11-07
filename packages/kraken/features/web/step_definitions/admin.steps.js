const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

When("I click the {string} section", async function (sectionName) {
    const links = await this.driver.$$(".gh-nav-list a");

    for (let link of links) {
        const text = await link.getText();
        if (text.includes(sectionName)) {
            await link.click();
            break;
        }
    }
});

Then("I should be on the {string} section", async function (sectionName) {
    const element = await this.driver.$(".gh-canvas-title");
    const elementText = await element.getText();
    expect(elementText).to.equal(sectionName);
});
