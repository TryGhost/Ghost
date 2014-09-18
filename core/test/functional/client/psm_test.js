// # Post Settings Menu Tests
// Test the post settings menu on the editor screen works as expected

/*globals CasperTest, casper, __utils__ */


CasperTest.begin('Post settings menu', 14, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    casper.then(function () {
        test.assertExists('.post-settings', 'icon toggle should exist');
        test.assertExists('.post-settings-menu', 'popup menu should be rendered at startup');
        test.assertExists('.post-settings-menu #url', 'url field exists');
        test.assertExists('.post-settings-menu .post-setting-date', 'publication date field exists');
        test.assertExists('.post-settings-menu .post-setting-static-page', 'static page checkbox field exists');
        test.assertExists('.post-settings-menu button.delete', 'delete post button exists');
    });

    casper.thenClick('.post-settings');

    casper.waitForOpaque('.post-settings-menu', function onSuccess() {
        test.assert(true, 'popup menu should be visible after clicking post-settings icon');
        test.assertNotVisible(
            '.post-settings-menu button.delete', 'delete post button shouldn\'t be visible on unsaved drafts'
        );
    });

    casper.thenClick('.post-settings');

    // Enter a title and save draft so converting to/from static post
    // will result in notifications and 'Delete This Post' button appears
    casper.then(function () {
        casper.sendKeys('#entry-title', 'aTitle');
        casper.thenClick('.js-publish-button');
    });

    casper.waitForSelector('.notification-success', function waitForSuccess() {
        test.assert(true, 'got success notification');
        test.assertSelectorHasText('.notification-success', 'Saved.');
        casper.click('.notification-success .close');
    }, function onTimeout() {
        test.assert(false, 'No success notification');
    });

    casper.waitWhileSelector('.notification-success');

    casper.thenClick('.post-settings');

    casper.waitForOpaque('.post-settings-menu', function onSuccess() {
        test.assert(true, 'post settings menu should be visible after clicking post-settings icon');
    });

    casper.waitUntilVisible('.post-settings-menu button.delete', function onSuccess() {
        test.assert(true, 'delete post button should be visible for saved drafts');
    });

});

CasperTest.begin('Delete post modal', 7, function testDeleteModal(test) {
    // Create a post that can be deleted
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Transition to the editor
    casper.thenClick('.post-edit');
    casper.waitForSelector('#entry-title');

    // Open post settings menu
    casper.thenClick('.post-settings');
    casper.thenClick('.post-settings-menu button.delete');

    casper.waitUntilVisible('#modal-container', function onSuccess() {
        test.assertSelectorHasText(
            '.modal-content .modal-header',
            'Are you sure you want to delete this post?',
            'delete modal has correct text');
    });

    casper.thenClick('.js-button-reject');

    casper.waitWhileVisible('#modal-container', function onSuccess() {
        test.assert(true, 'clicking cancel should close the delete post modal');
    });

    // Test delete
    casper.thenClick('.post-settings');
    casper.thenClick('.post-settings-menu button.delete');

    casper.waitForSelector('#modal-container .modal-content', function onSuccess() {
        test.assertExists('.modal-content .js-button-accept', 'delete button exists');

        // Delete the post
        this.click('.modal-content .js-button-accept');

        casper.waitForSelector('.notification-success', function onSuccess() {
            test.assert(true, 'Got success notification from delete post');
            test.assertSelectorHasText('.notification-message', 'Your post has been deleted.');
        }, function onTimeout() {
            test.fail('No success notification from delete post');
        });
    });
});

CasperTest.begin('Post url can be changed', 4, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

     // Transition to the editor
    casper.thenClick('.post-edit');
    casper.waitForSelector('#entry-title');

    casper.thenClick('.post-settings');

    // Test change permalink
    casper.then(function () {
        this.fillSelectors('.post-settings-menu form', {
            '#url': 'new-url'
        }, false);

        this.click('.post-settings');
    });

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function testGoodResponse(resource) {
        test.assert(400 > resource.status);
    });

    casper.then(function checkValueMatches() {
        //using assertField(name) checks the htmls initial "value" attribute, so have to hack around it.
        var slugVal = this.evaluate(function () {
            return __utils__.getFieldValue('post-setting-slug');
        });
        test.assertEqual(slugVal, 'new-url');
    });
});

CasperTest.begin('Post published date can be changed', 4, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

     // Transition to the editor
    casper.thenClick('.post-edit');
    casper.waitForSelector('#entry-title');

    casper.thenClick('.post-settings');

    // Test change published date
    casper.then(function () {
        this.fillSelectors('.post-settings-menu form', {
            '.post-setting-date': '22 May 14 @ 23:39'
        }, false);

        this.click('.post-settings');
    });

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function testGoodResponse(resource) {
        test.assert(400 > resource.status);
    });

    casper.then(function checkValueMatches() {
        //using assertField(name) checks the htmls initial "value" attribute, so have to hack around it.
        var dateVal = this.evaluate(function () {
            return __utils__.getFieldValue('post-setting-date');
        });
        test.assertEqual(dateVal, '22 May 14 @ 23:39');
    });
});

CasperTest.begin('Post can be changed to static page', 6, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Transition to the editor
    casper.thenClick('.post-edit');
    casper.waitForSelector('#entry-title');

    casper.thenClick('.post-settings');

    casper.thenClick('label[for=static-page]');

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function waitForSuccess(resource) {
        test.assert(400 > resource.status);

        test.assertExists('.post-setting-static-page:checked', 'can turn on static page');
    });

    casper.thenClick('label[for=static-page]');

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function waitForSuccess(resource) {
        test.assert(400 > resource.status);

        test.assertDoesntExist('.post-setting-static-page:checked', 'can turn off static page');
    });
});

CasperTest.begin('Post url input is reset from all whitespace back to original value', 3, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Transition to the editor
    casper.thenClick('.post-edit');
    casper.waitForSelector('#entry-title');

    casper.thenClick('.post-settings');

    var originalSlug;
    casper.then(function () {
        originalSlug = casper.evaluate(function () {
            return __utils__.getFieldValue('post-setting-slug');
        });
    });

    // Test change permalink
    casper.then(function () {
        this.fillSelectors('.post-settings-menu form', {
            '#url': '    '
        }, false);

        this.click('button.post-settings');
    });

    casper.then(function checkValueMatches() {
        //using assertField(name) checks the htmls initial "value" attribute, so have to hack around it.
        var slugVal = this.evaluate(function () {
            return __utils__.getFieldValue('post-setting-slug');
        });
        test.assertEqual(slugVal, originalSlug);
    });
});