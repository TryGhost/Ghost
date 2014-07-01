// # Content Test
// Test the content screen, uses the editor to create dummy content

/*globals CasperTest, casper, testPost, newUser */

CasperTest.begin('Content screen is correct', 21, function suite(test) {
    // First, create a sample post for testing (this should probably be a routine)
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.then(function testViews() {
        test.assertExists('.content-view-container', 'Content main view is present');
        test.assertExists('.content-list-content', 'Content list view is present');
        test.assertExists('.content-list .floatingheader a.button.button-add', 'add new post button exists');
        test.assertEquals(
            this.getElementAttribute('.content-list .floatingheader a.button.button-add', 'href'),
            '/ghost/editor/', 'add new post href is correct'
        );
        test.assertExists('.content-list-content li .entry-title', 'Content list view has at least one item');
        test.assertSelectorHasText(
            '.content-list-content li:first-of-type h3', testPost.title, 'title is present and has content'
        );
        test.assertSelectorHasText(
            '.content-list-content li:first-of-type .entry-meta .status .draft', 'Draft', 'correct status is present'
        );
        test.assertExists('.content-preview', 'Content preview is present');
        test.assertSelectorHasText(
            '.content-preview header .status', 'Written', 'preview header contains "Written" when post is a draft'
        );
        test.assertSelectorHasText(
            '.content-preview header .author', newUser.name, 'preview header contains author name'
        );
    });

    casper.then(function testEditPostButton() {
        test.assertExists('.content-preview a.post-edit', 'edit post button exists');
    });

    casper.then(function testPostSettingsMenu() {
        test.assertExists('.content-preview a.post-settings', 'post settings button exists');
        this.click('.content-preview a.post-settings');
    });

    casper.waitUntilVisible('.post-settings-menu', function onSuccess() {
        test.assert(true, 'post settings menu should be visible after clicking post-settings icon');
    });

    casper.then(function postSettingsMenuItems() {
        test.assertExists('.post-settings-menu .post-setting-static-page', 'post settings static page exists');
        test.assertExists('.post-settings-menu a.delete', 'post settings delete this post exists');
    });

    casper.then(function testActiveItem() {
        test.assertExists('.content-list-content li:first-of-type .active', 'first item is active');
        test.assertDoesntExist('.content-list-content li:nth-of-type(2) .active', 'second item is not active');

        // Ember adds script tags into the list so we need to use nth-of-type
    }).thenClick('.content-list-content li:nth-of-type(2) a', function then() {
        test.assertDoesntExist('.content-list-content li:first-of-type .active', 'first item is not active');
        test.assertExists('.content-list-content li:nth-of-type(2) .active', 'second item is active');
    });
});

CasperTest.begin('Content list shows correct post status', 7, function testStaticPageStatus(test) {
    CasperTest.Routines.createTestPost.run(true);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Select first non-draft, non-static post.  Should be second in the list at this stage of testing.
    casper.thenClick('.content-list-content li:nth-of-type(2) a');

    // Test for status of 'Published'
    casper.then(function checkStatus() {
        test.assertSelectorHasText('.content-list-content li.active .entry-meta .status time', 'Published',
            'status is present and labeled as published');
    });

    // Test for 'Published' in header
    casper.then(function testHeader() {
        test.assertSelectorHasText(
            '.content-preview header .status', 'Published', 'preview header contains "Published" when post is published'
        );
        test.assertSelectorHasText(
            '.content-preview header .author', newUser.name, 'preview header contains author name'
        );
    });

    // Change post to static page
    casper.thenClick('a.post-settings');

    casper.waitUntilVisible('.post-settings-menu', function onSuccess() {
        test.assert(true, 'post settings menu should be visible after clicking post-settings icon');
    });

    casper.thenClick('.post-settings-menu .post-setting-static-page + label');

    casper.waitForSelector('.content-list-content li .entry-meta .status .page', function waitForSuccess() {
        test.assertSelectorHasText('.content-list-content li .entry-meta .status .page', 'Page', 'status is Page');
    }, function onTimeout() {
        test.assert(false, 'status did not change');
    });
});

CasperTest.begin('Delete post modal', 7, function testDeleteModal(test) {
    // Create a post that can be deleted
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Open post settings menu
    casper.thenClick('.content-preview a.post-settings');
    casper.waitForOpaque('.content-preview .post-settings-menu.open');
    casper.thenClick('.post-settings-menu a.delete');

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
    casper.thenClick('.content-preview a.post-settings');
    casper.thenClick('.post-settings-menu a.delete');

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

// TODO: Implement this test... much needed!
//CasperTest.begin('Infinite scrolling', 2, function suite(test) {
//    // Placeholder for infinite scrolling/pagination tests (will need to setup 16+ posts).
//
//    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
//        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
//        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
//    });
//});

CasperTest.begin('Posts can be marked as featured', 10, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Mark as featured
    casper.waitForSelector('.content-preview .unfeatured', function () {
        this.click('.content-preview .unfeatured');
    }, function onTimeOut() {
        test.assert(false, 'The first post can\'t be marked as featured');
    });

    casper.waitForSelector('.notification-success', function waitForSuccess() {
        test.assert(true, 'got success notification');
        test.assertSelectorHasText('.notification-message', 'Post successfully marked as featured.');
    }, function onTimeout() {
        test.assert(false, 'No success notification :(');
    });

    casper.waitForSelector('.content-list-content li.featured:first-of-type', function () {
        test.assertExists('.content-preview .featured', 'preview pane gets featured class');
        test.assertExists('.content-list-content li.featured:first-of-type', 'content list got a featured star');
        this.click('.notification-success .close');
    }, function onTimeout() {
        test.assert(false, 'No featured star appeared in the left pane');
    });

    // Mark as not featured
    casper.waitWhileSelector('.notification-success', function waitForNoSuccess() {
        this.click('.content-preview .featured');
    }, function onTimeout() {
        test.assert(false, 'Success notification wont go away:(');
    });

    casper.waitForSelector('.notification-success', function waitForSuccess() {
        test.assert(true, 'got success notification');
        test.assertSelectorHasText('.notification-message', 'Post successfully marked as not featured.');
        test.assertDoesntExist('.content-preview .featured');
        test.assertDoesntExist('.content-list-content li.featured:first-of-type');
    }, function onTimeout() {
        test.assert(false, 'Success notification wont go away:(');
    });
});

CasperTest.begin('Post url can be changed', 7, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.thenClick('a.post-settings');

    casper.waitUntilVisible('.post-settings-menu', function onSuccess() {
        test.assert(true, 'post settings menu should be visible after clicking post-settings icon');
    });

    // Test change permalink
    casper.then(function () {
        this.fillSelectors('.post-settings-menu form', {
            '#url': 'new-url'
        }, false);

        this.click('a.post-settings');
    });

    casper.waitForSelector('.notification-success', function waitForSuccess() {
        test.assert(true, 'got success notification');
        test.assertSelectorHasText('.notification-message', 'Permalink successfully changed to new-url.');
        casper.click('.notification-success a.close');
    }, function onTimeout() {
        test.assert(false, 'No success notification');
    });

    casper.waitWhileSelector('.notification-success', function () {
        test.assert(true, 'notification cleared.');
        test.assertNotVisible('.notification-success', 'success notification should not still exist');
    });
});

CasperTest.begin('Post published date can be changed', 7, function suite(test) {
    // Create a sample post
      CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.thenClick('a.post-settings');

    casper.waitUntilVisible('.post-settings-menu', function onSuccess() {
        test.assert(true, 'post settings menu should be visible after clicking post-settings icon');
    });

    // Test change published date
    casper.then(function () {
        this.fillSelectors('.post-settings-menu form', {
            '.post-setting-date': '22 May 14 @ 23:39'
        }, false);

        this.click('a.post-settings');
    });

    casper.waitForSelector('.notification-success', function waitForSuccess() {
        test.assert(true, 'got success notification');
        test.assertSelectorHasText('.notification-message', 'Publish date successfully changed to 22 May 14 @ 23:39.');
        casper.click('.notification-success a.close');
    }, function onTimeout() {
        test.assert(false, 'No success notification');
    });

    casper.waitWhileSelector('.notification-success', function () {
        test.assert(true, 'notification cleared.');
        test.assertNotVisible('.notification-success', 'success notification should not still exist');
    });
});

CasperTest.begin('Post can be changed to static page', 7, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.thenClick('.content-preview a.post-settings');

    casper.waitForOpaque('.content-preview .post-settings-menu.open', function onSuccess() {
        test.assert(true, 'post settings should be visible after clicking post-settings icon');
    });

    casper.thenClick('.post-settings-menu .post-setting-static-page + label');

    casper.waitForSelector('.notification-success', function waitForSuccess() {
        test.assert(true, 'got success notification');
        casper.click('.notification-success a.close');
    }, function onTimeout() {
        test.assert(false, 'No success notification');
    });

    casper.waitWhileSelector('.notification-success', function () {
        test.assert(true, 'notification cleared.');
        test.assertNotVisible('.notification-success', 'success notification should not still exist');
    });

    casper.thenClick('.post-settings-menu .post-setting-static-page + label');

    casper.waitForSelector('.notification-success', function waitForSuccess() {
        test.assert(true, 'got success notification');
        casper.click('.notification-success a.close');
    }, function onTimeout() {
        test.assert(false, 'No success notification');
    });
});