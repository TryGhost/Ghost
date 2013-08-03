/*globals casper, __utils__, url */

casper.test.begin("Settings screen is correct", 12, function suite(test) {

    casper.test.filename = "settings_test.png";

    casper.start(url + "ghost/settings", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertEquals(this.getCurrentUrl(), url + "ghost/settings/general", "Ghost doesn't require login this time");
    }).viewport(1280, 1024);

    casper.then(function testViews() {
        test.assertExists(".wrapper", "Settings main view is present");
        test.assertExists(".settings-sidebar", "Settings sidebar view is present");
        test.assertExists(".settings-menu", "Settings menu is present");
        test.assertExists(".wrapper", "Settings main view is present");
        test.assertExists(".settings-content", "Settings content view is present");
        test.assertEval(function testGeneralIsActive() {
            return document.querySelector('.settings-menu .general').classList.contains('active');
        }, "general tab is marked active");
        test.assertEval(function testContentIsGeneral() {
            return document.querySelector('.settings-content').id === 'general';
        }, "loaded content is general screen");
    });

    casper.thenClick('.settings-menu .publishing', function then() {
        test.assertEval(function testGeneralIsNotActive() {
            return !document.querySelector('.settings-menu .general').classList.contains('active');
        }, "general tab is not marked active");
        test.assertEval(function testContentIsActive() {
            return document.querySelector('.settings-menu .publishing').classList.contains('active');
        }, "content tab is marked active");
        test.assertEval(function testContentIsContent() {
            return document.querySelector('.settings-content').id === 'content';
        }, "loaded content is contentß screen");
    });

    casper.run(function () {
        test.done();
    });
});