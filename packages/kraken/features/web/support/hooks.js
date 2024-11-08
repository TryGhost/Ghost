const { After, Before } = require("@cucumber/cucumber");
const { WebClient } = require("kraken-node");
const { LoginPageObject } = require("../page_objects/login.page-object");
const { AdminPageObject } = require("../page_objects/admin.page-object");
const {
    PostEditorPageObject,
} = require("../page_objects/post-editor.page-object");
const {
    PageEditorPageObject,
} = require("../page_objects/create-page.page-object");

const {
    ProfileStaffPageObject,
} = require("../page_objects/profile-staff.page-object");

const {
    ChangeLanguagePageObject,
} = require("../page_objects/change-language.page-object");

const {
    PostViewerPageObject,
} = require("../page_objects/post-viewer.page-object");
const properties = require("../../../properties.json");
const {
    TagEditorPageObject,
} = require("../page_objects/tag-editor.page-object");
const { TagListPageObject } = require("../page_objects/tag-list.page-object");
const { SitePageObject } = require("../page_objects/site.page-object");
const { SettingsPageObject } = require("../page_objects/settings.page-object");
const { PostListPageObject } = require("../page_objects/post-list.page-object");

Before(async function () {
    this.deviceClient = new WebClient("chrome", {}, this.userId);
    this.driver = await this.deviceClient.startKrakenForUserId(this.userId);
    this.driver.baseUrl = properties.GHOST_URL;
    this.loginPageObject = new LoginPageObject(this.driver);
    this.adminPageObject = new AdminPageObject(this.driver);
    this.postEditorPageObject = new PostEditorPageObject(this.driver);
    this.postViewerPageObject = new PostViewerPageObject(this.driver);
    this.pageEditorPageObject = new PageEditorPageObject(this.driver);
    this.profileStaffPageObject = new ProfileStaffPageObject(this.driver);
    this.changeLanguagePageObject = new ChangeLanguagePageObject(this.driver);
    this.postListPageObject = new PostListPageObject(this.driver);
    this.settingsPageObject = new SettingsPageObject(this.driver);
    this.sitePageObject = new SitePageObject(this.driver);
    this.tagEditorPageObject = new TagEditorPageObject(this.driver);
    this.tagListPageObject = new TagListPageObject(this.driver);
});

After(async function () {
    await this.deviceClient.stopKrakenForUserId(this.userId);
});
