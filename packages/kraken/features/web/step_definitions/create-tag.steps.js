const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

Given("I am in the Tag editor page", async function () {
    return await this.tagEditorPageObject.navigateToTagEditorPage();
});

When("I create a new tag {kraken-string}", async function (tagName) {
    return await this.tagEditorPageObject.createTag(tagName);
});

When("I type a new tag name {kraken-string}", async function (tagName) {
    return await this.tagEditorPageObject.setName(tagName);
});

When("I navigate to the Tag list page", async function () {
    return await this.tagListPageObject.navigateToTagListPage();
});

When("I exit the Tag editor page", async function () {
    return await this.tagEditorPageObject.exitEditor();
});

Then("I should see the new tag name {kraken-string}", async function (tagName) {
    const tag = await this.tagListPageObject.getTagFromList(tagName);
    expect(tag).to.exist;
});

Then("I should see the unsaved tag changes modal", async function () {
    const unsavedChangesMessage =
        await this.adminPageObject.getUnsavedChangesMessage();
    expect(unsavedChangesMessage).to.equal(
        "Are you sure you want to leave this page?"
    );
});
