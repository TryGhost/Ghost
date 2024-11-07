const { Given, When, Then } = require("@cucumber/cucumber");

Given(
    "I am an admin logged in with email {kraken-string} and password {kraken-string}",
    async function (email, password) {
        const element = await this.driver.$("#identification");
        await element.setValue(email);
        const element2 = await this.driver.$("#password");
        await element2.setValue(password);
        const element3 = await this.driver.$("#ember5");
        await element3.click();
    }
);

When("I enter email {kraken-string}", async function (email) {
    const element = await this.driver.$("#identification");
    return await element.setValue(email);
});

When("I enter password {kraken-string}", async function (password) {
    const element = await this.driver.$("#password");
    return await element.setValue(password);
});

When("I click next Sign In", async function () {
    const element = await this.driver.$("#ember5");
    return await element.click();
});
