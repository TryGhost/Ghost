/*globals casper, __utils__, url */

casper.test.begin("Settings screen is correct", 3, function suite(test) {

    casper.test.filename = "settings_test.png";

    casper.start(url + "ghost/settings", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertEquals(this.getCurrentUrl(), url + "ghost/settings/general", "Ghost doesn't require login this time");
    }).viewport(1280, 1024);

    casper.then(function testViews() {
        test.assertExists(".wrapper", "Settings main view is present");

        // TODO: real settings tests
    });

    casper.run(function () {
        test.done();
    });
});