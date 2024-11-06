const { Given, When, Then } = require("@cucumber/cucumber");

When("I enter email {kraken-string}", async function (email) {
    const element = await this.driver.$("#identification");
    return await element.setValue(email);
});

When("I enter password {kraken-string}", async function (password) {
    console.log("received password: ", password);
    const element = await this.driver.$("#password");
    return await element.setValue(password);
});

When("I click next Sign In", async function () {
    const element = await this.driver.$("#ember5");
    return await element.click();
});
