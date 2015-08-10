// # Post Settings Menu Tests
// Test the post settings menu on the editor screen works as expected

/*globals CasperTest, casper, __utils__ */

CasperTest.begin('Post settings menu', 8, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    casper.then(function () {
        test.assertExists('.post-settings', 'icon toggle should exist');
        test.assertExists('.settings-menu', 'popup menu should be rendered at startup');
        test.assertExists('.settings-menu #url', 'url field exists');
        test.assertExists('.settings-menu .post-setting-date', 'publication date field exists');
        test.assertExists('.settings-menu .post-setting-static-page', 'static page checkbox field exists');
    });

    // Enter a title and save draft so converting to/from static post
    // will result in notifications and 'Delete This Post' button appears
    casper.then(function () {
        casper.sendKeys('#entry-title', 'aTitle');
        casper.thenClick('.js-publish-button');
    });

    casper.thenClick('.post-settings');

    casper.waitForOpaque('.settings-menu', function onSuccess() {
        test.assert(true, 'post settings menu should be visible after clicking post-settings icon');
    });
});

CasperTest.begin('Post url can be changed', 4, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Title is "Content - Test Blog"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Transition to the editor
    casper.thenClick('.post-edit');
    casper.waitForSelector('#entry-title');

    casper.thenClick('.post-settings');

    // Test change permalink
    casper.then(function () {
        this.fillSelectors('.settings-menu form', {
            '#url': 'new-url'
        }, false);

        this.click('.post-settings');
    });

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function testGoodResponse(resource) {
        test.assert(resource.status < 400, 'resource.status < 400');
    });

    casper.then(function checkValueMatches() {
        // using assertField(name) checks the htmls initial "value" attribute, so have to hack around it.
        var slugVal = this.evaluate(function () {
            return __utils__.getFieldValue('post-setting-slug');
        });
        test.assertEquals(slugVal, 'new-url', 'slug has correct value');
    });
});

CasperTest.begin('Post published date can be changed', 4, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Title is "Content - Test Blog"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Transition to the editor
    casper.thenClick('.post-edit');
    casper.waitForSelector('#entry-title');

    casper.thenClick('.post-settings');

    // Test change published date
    casper.then(function () {
        this.fillSelectors('.settings-menu form', {
            '.post-setting-date': '22 May 14 @ 23:39'
        }, false);

        this.click('.post-settings');
    });

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function testGoodResponse(resource) {
        test.assert(resource.status < 400, 'resource.status < 400');
    });

    casper.then(function checkValueMatches() {
        // using assertField(name) checks the htmls initial "value" attribute, so have to hack around it.
        var dateVal = this.evaluate(function () {
            return __utils__.getFieldValue('post-setting-date');
        });
        test.assertEquals(dateVal, '22 May 14 @ 23:39', 'date is correct');
    });
});

CasperTest.begin('Post can be changed to static page', 2, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Title is "Content - Test Blog"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Transition to the editor
    casper.thenClick('.post-edit');
    casper.waitForSelector('#entry-title');

    casper.thenClick('.post-settings');

    casper.thenClick('label[for=static-page]');

    casper.waitForSelector('.post-setting-static-page:checked', function onSuccess() {
        casper.click('label[for=static-page]');
    }, function onTimeout() {
        casper.test.fail('Post was not changed to static page.');
    }, 2000);

    casper.waitForSelector('.post-setting-static-page:not(checked)', function onSuccess() {
        return;
    }, function onTimeout() {
        casper.test.fail('Static page was not changed to post.');
    }, 2000);
});

CasperTest.begin('Post url input is reset from all whitespace back to original value', 4, function suite(test) {
    // Create a sample post
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Title is "Content - Test Blog"');
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
        this.fillSelectors('.settings-menu form', {
            '#url': '    '
        }, false);
    });

    // Click in a different field
    casper.thenClick('#post-setting-date');

    casper.then(function checkValueMatches() {
        // using assertField(name) checks the htmls initial "value" attribute, so have to hack around it.
        var slugVal = this.evaluate(function () {
            return __utils__.getFieldValue('post-setting-slug');
        });
        test.assertNotEquals(slugVal, '    ', 'slug is not just spaces');
        test.assertEquals(slugVal, originalSlug, 'slug gets reset to original value');
    });
});

CasperTest.begin('Tag Editor', 18, function suite(test) {
    var testTag = 'Test1',
        createdTag = '.tags-input-list li.label-tag';

    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    casper.then(function () {
        test.assertExists('.tags-input-list', 'should have tag list area');
        test.assertExists('#tag-input', 'should have tag input');
    });

    casper.thenClick('#tag-input');
    casper.then(function () {
        casper.sendKeys('#tag-input', testTag, {keepFocus: true});
    });
    casper.then(function () {
        casper.sendKeys('#tag-input', casper.page.event.key.Enter, {keepFocus: true});
    });

    casper.waitForSelector(createdTag, function onSuccess() {
        test.assertSelectorHasText(createdTag, testTag, 'typing enter after tag name should create tag');
    });

    casper.thenClick(createdTag);
    casper.waitWhileSelector(createdTag, function onSuccess() {
        test.assert(true, 'clicking the tag should delete the tag');
    });

    casper.then(function () {
        casper.sendKeys('#tag-input', testTag, {keepFocus: true});
    });
    casper.then(function () {
        casper.sendKeys('#tag-input', casper.page.event.key.Tab, {keepFocus: true});
    });

    casper.waitForSelector(createdTag, function onSuccess() {
        test.assertSelectorHasText(createdTag, testTag, 'typing tab after tag name should create tag');
    });

    casper.then(function () {
        casper.sendKeys('#tag-input', casper.page.event.key.Backspace, {keepFocus: true});
    });

    casper.waitForSelector(createdTag + '.highlight', function onSuccess() {
        test.assert(true, 'hitting backspace should highlight the last tag');
    });

    casper.then(function () {
        casper.sendKeys('#tag-input', casper.page.event.key.Backspace, {keepFocus: true});
    });

    casper.waitWhileSelector(createdTag + '.highlight', function onSuccess() {
        test.assert(true, 'hitting backspace on a higlighted tag should delete it');
    });

    casper.then(function () {
        casper.sendKeys('#tag-input', testTag, {keepFocus: true});
    });
    casper.then(function () {
        casper.sendKeys('#tag-input', casper.page.event.key.Tab, {keepFocus: true});
    });

    casper.waitForSelector(createdTag, function onSuccess() {
        test.assertSelectorHasText(createdTag, testTag, 'typing tab after tag name should create tag');
    });

    casper.then(function () {
        casper.sendKeys('#tag-input', casper.page.event.key.Left, {keepFocus: true});
    });

    casper.waitForSelector(createdTag + '.highlight', function onSuccess() {
        test.assert(true, 'hitting left should highlight the last tag');
    });

    casper.then(function () {
        casper.sendKeys('#tag-input', casper.page.event.key.Left, {keepFocus: true});
    });

    casper.waitWhileSelector(createdTag + '.highlight', function onSuccess() {
        test.assert(true, 'hitting left on a higlighted tag should un-highlight it');
    });

    casper.waitForSelector(createdTag, function onSuccess() {
        test.assertSelectorHasText(createdTag, testTag, 'un-highlighting tag should not delete it');
    });

    casper.then(function () {
        casper.sendKeys('#tag-input', casper.page.event.key.Right, {keepFocus: true});
    });

    casper.waitForSelector(createdTag + '.highlight', function onSuccess() {
        test.assert(true, 'hitting right should highlight the first tag');
    });

    casper.then(function () {
        casper.sendKeys('#tag-input', casper.page.event.key.Right, {keepFocus: true});
    });

    casper.waitWhileSelector(createdTag + '.highlight', function onSuccess() {
        test.assert(true, 'hitting right on a higlighted tag should un-highlight it');
    });

    casper.waitForSelector(createdTag, function onSuccess() {
        test.assertSelectorHasText(createdTag, testTag, 'un-highlighting tag should not delete it');
    });

    casper.thenClick(createdTag);
    casper.waitWhileSelector(createdTag, function onSuccess() {
        test.assert(true, 'clicking the tag should delete the tag');
    });

    casper.then(function () {
        casper.sendKeys('#tag-input', testTag, {keepFocus: true});
    });

    // Click in a different field
    casper.thenClick('#post-setting-date');

    casper.waitForSelector(createdTag, function onSuccess() {
        test.assertSelectorHasText(createdTag, testTag, 'de-focusing from tag input should create tag with leftover text');
    });
});
