const { Given, When, Then } = require("@cucumber/cucumber");

When("I click on first univeristy", async function () {
    let element = await this.driver.$(
        ".flex.flex-col.items-center>div>:nth-child(1)"
    );
    return await element.click();
});

Then("I see that the University page is loaded", async function () {
    let element = await this.driver.$("#id-1");
    return await element.waitForDisplayed();
});
