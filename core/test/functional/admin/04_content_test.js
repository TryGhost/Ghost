/*globals casper, __utils__, url, testPost */

casper.test.begin("Content screen is correct", 9, function suite(test) {

    casper.test.filename = "content_test.png";

    casper.start(url + "ghost/content/", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertEquals(this.getCurrentUrl(), url + "ghost/content/", "Ghost doesn't require login this time");
    }).viewport(1280, 1024);

    casper.then(function testViews() {
        test.assertExists(".content-view-container", "Content main view is present");
        test.assertExists(".content-list-content", "Content list view is present");
        test.assertExists(".content-list-content li .entry-title", "Content list view has at least one item");
        test.assertExists(".content-preview", "Content preview is present");
        test.assertSelectorHasText(".content-list-content li:first-child h3", testPost.title, "first item is the post we created");
    });

    casper.then(function testActiveItem() {
        casper.test.assertEquals(casper.evaluate(function () {
            return document.querySelector('.content-list-content li').className;
        }), "active", "first item is active");

    }).thenClick(".content-list-content li:nth-child(2) a", function then() {
        casper.test.assertEquals(casper.evaluate(function () {
            return document.querySelectorAll('.content-list-content li')[1].className;
        }), "active", "second item is active");
    });

    // TODO: finish testing delete
//    casper.then(function testDeletePost() {
//        casper.clickLabel(testPost.title, "h3");
//    });

    casper.run(function () {
        test.done();
    });
});