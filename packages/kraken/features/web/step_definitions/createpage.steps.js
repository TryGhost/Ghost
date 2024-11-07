const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

When("I click on pages", async function () {
    const element = await this.driver.$("section.gh-nav-top.gh-nav-list.gh-nav-manage li:nth-child(2) a");
    return await element.click();
});


