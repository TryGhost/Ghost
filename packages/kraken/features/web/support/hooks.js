const { After, Before } = require("@cucumber/cucumber");
const { WebClient } = require("kraken-node");
const { LoginPageObject } = require("../page_objects/login.page-object");
const { AdminPageObject } = require("../page_objects/admin.page-object");
const {
    PostEditorPageObject,
} = require("../page_objects/post-editor.page-object");
const {
    PostViewerPageObject,
} = require("../page_objects/post-viewer.page-object");
const properties = require("../../../properties.json");

Before(async function () {
    this.deviceClient = new WebClient("chrome", {}, this.userId);
    this.driver = await this.deviceClient.startKrakenForUserId(this.userId);
    this.driver.baseUrl = properties.GHOST_URL;
    this.loginPageObject = new LoginPageObject(this.driver);
    this.adminPageObject = new AdminPageObject(this.driver);
    this.postEditorPageObject = new PostEditorPageObject(this.driver);
    this.postViewerPageObject = new PostViewerPageObject(this.driver);
});

After(async function () {
    await this.deviceClient.stopKrakenForUserId(this.userId);
});
