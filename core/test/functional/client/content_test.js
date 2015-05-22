// # Content Test
// Test the content screen, uses the editor to create dummy content

/*globals CasperTest, casper, testPost, newUser */

CasperTest.begin('Content screen is correct', 17, function suite(test) {
    // First, create a sample post for testing (this should probably be a routine)
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Title is "Content - Test Blog"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.then(function testViews() {
        test.assertExists('.content-view-container', 'Content main view is present');
        test.assertExists('.content-list-content', 'Content list view is present');
        test.assertExists('.gh-nav-main-editor', 'add new post button exists');
        test.assertEquals(
            this.getElementAttribute('.gh-nav-main-editor', 'href'),
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

    casper.then(function testActiveItem() {
        test.assertExists('.content-list-content li:first-of-type .active', 'first item is active');
        test.assertDoesntExist('.content-list-content li:nth-of-type(2) .active', 'second item is not active');

        // Ember adds script tags into the list so we need to use nth-of-type
    }).thenClick('.content-list-content li:nth-of-type(2) a', function then() {
        test.assertDoesntExist('.content-list-content li:first-of-type .active', 'first item is not active');
        test.assertExists('.content-list-content li:nth-of-type(2) .active', 'second item is active');
    });
});

CasperTest.begin('Content list shows correct post status', 5, function testStaticPageStatus(test) {
    CasperTest.Routines.createTestPost.run(true);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Title is "Content - Test Blog"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Select first non-draft, non-static post.  Should be second in the list at this stage of testing.
    casper.thenClick('.content-list-content li:nth-of-type(3) a');

    // Test for status of 'Published'
    casper.then(function checkStatus() {
        test.assertSelectorHasText('.content-list-content .active .published', 'Published',
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

    casper.thenClick('.post-edit');
    casper.waitForSelector('#entry-title');

    // // TODO readd this test when #3811 is fixed
    // // Change post to static page
    // casper.thenClick('.post-settings');
    // casper.waitForOpaque('.post-settings-menu.open');

    // casper.thenClick('.post-setting-static-page');

    // casper.thenTransitionAndWaitForScreenLoad('content', function onSuccess() {
    //    casper.waitForSelector('.content-list-content li .entry-meta .status .page', function waitForSuccess() {
    //           test.assertSelectorHasText('.content-list-content li .entry-meta .status .page', 'Page', 'status is Page');
    //       }, function onTimeout() {
    //           test.assert(false, 'status did not change');
    //       });
    // });
});

// TODO: Implement this test... much needed!
// CasperTest.begin('Infinite scrolling', 2, function suite(test) {
//    // Placeholder for infinite scrolling/pagination tests (will need to setup 16+ posts).
//
//    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
//        test.assertTitle('Content - Test Blog', 'Title is "Content - Test Blog"');
//        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
//    });
// });

CasperTest.begin('Posts can be marked as featured', 6, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Title is "Content - Test Blog"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Mark as featured
    casper.waitForSelector('.content-preview .unfeatured', function () {
        this.click('.content-preview .unfeatured');
    }, function onTimeOut() {
        test.assert(false, 'The first post can\'t be marked as featured');
    });

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function (resource) {
        test.assert(resource.status < 400);
    });

    casper.waitForSelector('.content-list-content li.featured:first-of-type', function () {
        test.assertExists('.content-preview .featured', 'preview pane gets featured class');
        test.assertExists('.content-list-content li.featured:first-of-type', 'content list got a featured star');
    }, function onTimeout() {
        test.assert(false, 'No featured star appeared in the left pane');
    });

    // Mark as not featured
    casper.thenClick('.content-preview .featured');

    casper.waitWhileSelector('.content-preview .featured', function onSuccess() {
        test.assertDoesntExist('.content-list-content li.featured:first-of-type');
    }, function onTimeout() {
        casper.test.fail('Couldn\'t unfeature post.');
    }, 2000);
});
