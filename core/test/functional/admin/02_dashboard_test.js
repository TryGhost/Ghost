/*globals casper, __utils__, url */

casper.test.begin("Ghost dashboard is correct", 13, function suite(test) {

    casper.test.filename = "dashboard_test.png";

    casper.start(url + "ghost", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertEquals(this.getCurrentUrl(), url + "ghost/", "Ghost doesn't require login this time");
        test.assertExists("#ghost", "Ghost is present");
    }).viewport(1280, 1024);

    casper.then(function testMenus() {
        test.assertExists("#main-menu", "Main menu is present");
        test.assertSelectorHasText("#main-menu .dashboard a", "Dashboard");
        test.assertSelectorHasText("#main-menu .content a", "Content");
        test.assertSelectorHasText("#main-menu .editor a", "New Post");
        test.assertSelectorHasText("#main-menu .settings a", "Settings");

        test.assertExists("#usermenu", "User menu is present");
        test.assertSelectorHasText("#usermenu .usermenu-profile a", "Your Profile");
        test.assertSelectorHasText("#usermenu .usermenu-help a", "Help / Support");
        test.assertSelectorHasText("#usermenu .usermenu-shortcuts a", "Keyboard Shortcuts");
        test.assertSelectorHasText("#usermenu .usermenu-signout a", "Sign Out");
    });

    casper.run(function () {
        test.done();
    });
});
