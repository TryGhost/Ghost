const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

When("I type a post title {kraken-string}", async function (string) {
    const element = this.driver.$("textarea[data-test-editor-title-input]");
    return await element.setValue(string);
});

When("I type a random content {kraken-string}", async function (string) {
    const element = await this.driver.$('p[data-koenig-dnd-droppable="true"]');
    await element.click();
    return await element.setValue(string);
});

When(`I click the "Settings" button`, async function () {
    const element = await this.driver.$("button[title='Settings']");
    return await element.click();
});

When("I type a random page url {kraken-string}", async function (string) {
    const element = await this.driver.$("input#url");
    return await element.setValue(string);
});

When(`I click the {string} editor button`, async function (buttonName) {
    const elements = await this.driver.$$(`button.gh-btn-editor>span`);
    for (let element of elements) {
        const text = await element.getText();
        if (text.includes(buttonName)) {
            await element.click();
            break;
        }
    }
});

When(`I click the "Continue" button`, async function () {
    const elements = await this.driver.$$(`button.gh-btn-black>span`);
    for (let element of elements) {
        const text = await element.getText();
        if (text.includes("Continue, final review →")) {
            await element.click();
            break;
        }
    }
});

When('I click the "Confirm publish" button', async function () {
    const element = this.driver.$(`button[data-test-button="confirm-publish"]`);

    return await element.click();
});

When("I click the post bookmark link", async function () {
    const element = await this.driver.$("a[data-test-complete-bookmark]");
    return await element.click();
});
