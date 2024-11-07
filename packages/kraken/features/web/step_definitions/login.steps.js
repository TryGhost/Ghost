const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

Given(
    "I am an admin logged in with email {kraken-string} and password {kraken-string}",
    async function (email, password) {
        return await this.loginPageObject.loginAs(email, password);
    }
);

Given("I am on the login page", async function () {
    return await this.loginPageObject.navigateToLogin();
});

When("I enter email {kraken-string}", async function (email) {
    return await this.loginPageObject.setEmail(email);
});

When("I enter password {kraken-string}", async function (password) {
    return await this.loginPageObject.setPassword(password);
});

When("I click next Sign In", async function () {
    return await this.loginPageObject.clickSignIn();
});

Then("an error message is shown", async function () {
    const elementText = await this.loginPageObject.getErrorMessage();
    expect(elementText).to.contain("Your password is incorrect.");
});

Then("a retry button is shown", async function () {
    const elementText = await this.loginPageObject.getRetryButton();
    expect(elementText).to.equal("Retry");
});
