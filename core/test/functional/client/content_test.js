// # Content Test
// Test the content screen, uses the editor to create dummy content

/*globals CasperTest, casper, testPost, newUser */

CasperTest.begin('Content screen is correct', 21, function suite(test) {
    // First, create a sample post for testing (this should probably be a routine)
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
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
        test.assertExists('.content-preview button.post-settings', 'post settings button exists');
        this.click('.content-preview button.post-settings');
    });

    casper.waitUntilVisible('.post-settings-menu', function onSuccess() {
        test.assert(true, 'post settings menu should be visible after clicking post-settings icon');
    });

    casper.then(function postSettingsMenuItems() {
        test.assertExists('.post-settings-menu .post-setting-static-page', 'post settings static page exists');
        test.assertExists('.post-settings-menu button.delete', 'post settings delete this post exists');
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
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
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
    casper.thenClick('button.post-settings');

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
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Open post settings menu
    casper.thenClick('.content-preview button.post-settings');
    casper.waitForOpaque('.content-preview .post-settings-menu.open');
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
    casper.thenClick('.content-preview button.post-settings');
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

// TODO: Implement this test... much needed!
//CasperTest.begin('Infinite scrolling', 2, function suite(test) {
//    // Placeholder for infinite scrolling/pagination tests (will need to setup 16+ posts).
//
//    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
//        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
//        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
//    });
//});

CasperTest.begin('Posts can be marked as featured', 8, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Mark as featured
    casper.waitForSelector('.content-preview .unfeatured', function () {
        this.click('.content-preview .unfeatured');
    }, function onTimeOut() {
        test.assert(false, 'The first post can\'t be marked as featured');
    });

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function (resource) {
        test.assert(400 > resource.status);
    });

    casper.waitForSelector('.content-list-content li.featured:first-of-type', function () {
        test.assertExists('.content-preview .featured', 'preview pane gets featured class');
        test.assertExists('.content-list-content li.featured:first-of-type', 'content list got a featured star');
    }, function onTimeout() {
        test.assert(false, 'No featured star appeared in the left pane');
    });

    // Mark as not featured
    casper.thenClick('.content-preview .featured');

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function waitForSuccess(resource) {
        test.assert(400 > resource.status);
    });

    casper.then(function untoggledFeaturedTest() {
        test.assertDoesntExist('.content-preview .featured', 'Untoggled featured.');
        test.assertDoesntExist('.content-list-content li.featured:first-of-type');
    }, function onTimeout() {
        test.assert(false, 'Couldn\'t unfeature post.');
    });
});

CasperTest.begin('Post url can be changed', 5, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.thenClick('button.post-settings');

    casper.waitUntilVisible('.post-settings-menu', function onSuccess() {
        test.assert(true, 'post settings menu should be visible after clicking post-settings icon');
    });

    // Test change permalink
    casper.then(function () {
        this.fillSelectors('.post-settings-menu form', {
            '#url': 'new-url'
        }, false);

        this.click('button.post-settings');
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

CasperTest.begin('Post published date can be changed', 5, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.thenClick('button.post-settings');

    casper.waitUntilVisible('.post-settings-menu', function onSuccess() {
        test.assert(true, 'post settings menu should be visible after clicking post-settings icon');
    });

    // Test change published date
    casper.then(function () {
        this.fillSelectors('.post-settings-menu form', {
            '.post-setting-date': '22 May 14 @ 23:39'
        }, false);

        this.click('button.post-settings');
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

CasperTest.begin('Post can be changed to static page', 7, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Title is "Ghost Admin"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.thenClick('.content-preview button.post-settings');

    casper.waitForOpaque('.content-preview .post-settings-menu.open', function onSuccess() {
        test.assert(true, 'post settings should be visible after clicking post-settings icon');
    });

    casper.thenClick('.post-settings-menu .post-setting-static-page + label');

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function waitForSuccess(resource) {
        test.assert(400 > resource.status);
    });
    //Reload the page so the html can update to have the checked attribute
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertExists('.post-setting-static-page[checked=checked]', 'can turn on static page');
    });

    casper.thenClick('.post-settings-menu .post-setting-static-page + label');

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function waitForSuccess(resource) {
        test.assert(400 > resource.status);
    });

    //Reload so html can be updated to not have the checked attribute
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertDoesntExist('.post-setting-static-page[checked=checked]', 'can turn off static page');
    });
});