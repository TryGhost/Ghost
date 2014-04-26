/**
 * Tests the flow of creating, editing and publishing tests
 */

/*globals casper, __utils__, url, testPost */
CasperTest.begin("Ghost edit draft flow works correctly", 8, function suite(test) {
    casper.thenOpen(url + "ghost/editor/", function then() {
        test.assertUrlMatch(/ghost\/editor\/$/, "Ghost doesn't require login this time");
    });

    casper.then(function createTestPost() {
        casper.sendKeys('#entry-title', testPost.title);
        casper.writeContentToCodeMirror(testPost.html);
    });

    casper.waitForSelectorTextChange('.entry-preview .rendered-markdown', function onSuccess() {
        test.assertSelectorHasText('.entry-preview .rendered-markdown', 'test', 'Editor value is correct');
    });

    casper.thenClick('.js-publish-button');
    casper.waitForResource(/posts\/$/);

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assert(true, 'Got success notification');
    }, function onTimeout() {
        test.assert(false, 'No success notification :(');
    });

    casper.thenOpen(url + 'ghost/content/', function then() {
        test.assertUrlMatch(/ghost\/content\//, "Ghost successfully loaded the content page");
    });

    casper.then(function then() {
        test.assertEvalEquals(function () {
            return document.querySelector('.content-list-content li').className;
        }, "active", "first item is active");

        test.assertSelectorHasText(".content-list-content li:first-child h3", testPost.title, "first item is the post we created");
    });

    casper.thenClick('.post-edit').waitForResource(/editor/, function then() {
        test.assertUrlMatch(/editor/, "Ghost successfully loaded the editor page again");
    });

    casper.thenClick('.js-publish-button');
    casper.waitForResource(/posts\/[0-9]+\/$/);

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assert(true, 'Got success notification');
    }, function onTimeout() {
        test.assert(false, 'No success notification :(');
    });
});

// TODO: test publishing, editing, republishing, unpublishing etc
//CasperTest.begin("Ghost edit published flow works correctly", 6, function suite(test) {
//
//
//
//});