/*globals casper, __utils__, url, testPost */

var escapedUrl = url.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

CasperTest.begin("Ghost editor is correct", 10, function suite(test) {
    casper.thenOpen(url + "ghost/editor/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/editor\/$/, "Ghost doesn't require login this time");
        test.assertExists(".entry-markdown", "Ghost editor is present");
        test.assertExists(".entry-preview", "Ghost preview is present");
    });

    // test saving with no data
    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assert(true, 'Save without title results in error notification as expected');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'Save without title did not result in an error notification');
    });

    casper.then(function createTestPost() {
        casper.sendKeys('#entry-title', testPost.title);
        casper.writeContentToCodeMirror(testPost.html);
    });

    casper.waitForSelectorTextChange('.entry-preview .rendered-markdown', function onSuccess() {
        test.assertSelectorHasText('.entry-preview .rendered-markdown', 'test', 'Editor value is correct.');
    }, function onTimeout() {
        test.assert('false', 'markdown did not re-render');
    });

    casper.thenClick('.js-publish-button');

    casper.waitForResource(/\/posts\/$/, function checkPostWasCreated() {
        var urlRegExp = new RegExp("^" + escapedUrl + "ghost\/editor\/[0-9]*");
        test.assertUrlMatch(urlRegExp, 'got an id on our URL');
        test.assertExists('.notification-success', 'got success notification');
        test.assertEvalEquals(function () {
            return document.querySelector('#entry-title').value;
        }, testPost.title, 'Title is correct');
    }, function onTimeout() {
        test.assert('false', 'post was not created');
    });
});

CasperTest.begin("Haunted markdown in editor works", 3, function suite(test) {
    casper.thenOpen(url + "ghost/editor/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
    });

    casper.then(function testImage() {
        casper.writeContentToCodeMirror("![sometext]()");
    });

    casper.waitForSelectorTextChange('.entry-preview .rendered-markdown', function onSuccess() {
        test.assertEvalEquals(function () {
            return document.querySelector('.CodeMirror-wrap textarea').value;
        }, '![sometext]()', 'Editor value is correct');

        test.assertSelectorHasText('.entry-preview .rendered-markdown', 'Add image of sometext', 'Editor value is correct');
    }, function onTimeout() {
        test.assert('false', 'markdown did not re-render');
    });
});

CasperTest.begin("Word count and plurality", 4, function suite(test) {
    casper.thenOpen(url + "ghost/editor/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
    });

    casper.then(function checkZeroPlural() {
        test.assertSelectorHasText('.entry-word-count', '0 words', 'count of 0 produces plural "words".');
    });

    casper.then(function () {
        casper.writeContentToCodeMirror('test');
    });

    casper.waitForSelectorTextChange('.entry-word-count', function onSuccess() {
        test.assertSelectorHasText('.entry-word-count', '1 word', 'count of 1 produces singular "word".');
    });

    casper.then(function () {
        casper.writeContentToCodeMirror('test'); // append another word, assumes newline
    });

    casper.waitForSelectorTextChange('.entry-word-count', function onSuccess() {
        test.assertSelectorHasText('.entry-word-count', '2 words', 'count of 2 produces plural "words".');
    });
});

CasperTest.begin('Title Trimming', 2, function suite(test) {
    var untrimmedTitle = '  test title  ',
        trimmedTitle = 'test title';

    casper.thenOpen(url + 'ghost/editor/', function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", 'Ghost admin has no title');
    });

    casper.then(function populateTitle() {
        casper.sendKeys('#entry-title', untrimmedTitle);

        test.assertEvalEquals(function () {

            return $('#entry-title').val();

        }, trimmedTitle, 'Entry title should match expected value.');
    });
});

CasperTest.begin('Publish menu - new post', 10, function suite(test) {
    casper.thenOpen(url + 'ghost/editor/', function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", 'Ghost admin has no title');
    });

    // ... check default option status, label, class
    casper.then(function () {
        test.assertExists('.js-publish-splitbutton');
        test.assertExists('.js-publish-splitbutton.splitbutton-save');
        test.assertExists('.js-publish-button');
        test.assertExists('.js-publish-button.button-save');
        test.assertSelectorHasText('.js-publish-button', 'Save Draft');
        test.assertEval(function () {
            return (__utils__.findOne('.js-publish-button').getAttribute('data-status') === 'draft');
        }, 'Publish button\'s initial status should be "draft"');
    });

    casper.then(function () {
        // ... click the menu
        this.click('.js-publish-splitbutton .options.up');
        // ... click publish
        this.click('.js-publish-splitbutton li[data-set-status="published"]');
    });

    // ... check status, label, class
    casper.waitForSelector('.js-publish-splitbutton.splitbutton-delete', function onSuccess() {
        test.assertExists('.js-publish-button.button-delete', 'Publish button should have .button-delete');
        test.assertSelectorHasText('.js-publish-button', 'Publish Now');
        test.assertEval(function () {
            return (__utils__.findOne('.js-publish-button').getAttribute('data-status') === 'published');
        }, 'Publish button\'s updated status should be "published"');
    }, function onTimeout() {
        test.assert(false, 'Publish split button should have .splitbutton-delete');
    });
});

CasperTest.begin('Publish menu - existing post', 22, function suite(test) {
    // Create a post, save it and test refreshed editor
    casper.thenOpen(url + 'ghost/editor/', function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", 'Ghost admin has no title');
    });

    casper.then(function createTestPost() {
        casper.sendKeys('#entry-title', testPost.title);
        casper.writeContentToCodeMirror(testPost.html);
    });

    casper.waitForSelectorTextChange('.entry-preview .rendered-markdown', function onSuccess() {
        test.assertSelectorHasText('.entry-preview .rendered-markdown', 'test', 'Editor value is correct');
    });

    // Create a post in draft status
    casper.thenClick('.js-publish-button');

    casper.waitForResource(/posts\/$/, function checkPostWasCreated() {
        var urlRegExp = new RegExp("^" + escapedUrl + "ghost\/editor\/[0-9]*");
        test.assertUrlMatch(urlRegExp, 'got an id on our URL');
    });

    // ... check option status, label, class now that we're *saved* as 'draft'
    casper.then(function () {
        test.assertExists('.js-publish-splitbutton');
        test.assertExists('.js-publish-splitbutton.splitbutton-save');
        test.assertExists('.js-publish-button');
        test.assertExists('.js-publish-button.button-save');
        test.assertSelectorHasText('.js-publish-button', 'Save Draft');
        test.assertEval(function () {
            return (__utils__.findOne('.js-publish-button').getAttribute('data-status') === 'draft');
        }, 'Publish button\'s initial status should be "draft"');
    });

    // Open the publish options menu;
    casper.thenClick('.js-publish-splitbutton .options.up');

    // Select the publish post button
    casper.thenClick('.js-publish-splitbutton li[data-set-status="published"]');

    // ... check status, label, class
    casper.waitForSelector('.js-publish-splitbutton.splitbutton-delete', function onSuccess() {
        test.assertExists('.js-publish-button.button-delete', 'Publish button should have .button-delete');
        test.assertSelectorHasText('.js-publish-button', 'Publish Now');
        test.assertEval(function () {
            return (__utils__.findOne('.js-publish-button').getAttribute('data-status') === 'published');
        }, 'Publish button\'s updated status should be "published"');
    }, function onTimeout() {
        test.assert(false, 'Publish split button should have .splitbutton-delete');
    });

    // Publish the post
    casper.thenClick('.js-publish-button');

    casper.waitForResource(/posts\/$/, function checkPostWasCreated() {
        var urlRegExp = new RegExp("^" + escapedUrl + "ghost\/editor\/[0-9]*");
        test.assertUrlMatch(urlRegExp, 'got an id on our URL');
    });

    // ... check option status, label, class for saved as 'published'
    casper.then(function () {
        test.assertExists('.js-publish-splitbutton');
        test.assertExists('.js-publish-splitbutton.splitbutton-save');
        test.assertExists('.js-publish-button');
        test.assertExists('.js-publish-button.button-save');
        test.assertSelectorHasText('.js-publish-button', 'Update Post');
        test.assertEval(function () {
            return (__utils__.findOne('.js-publish-button').getAttribute('data-status') === 'published');
        }, 'Publish button\'s initial status on an already published post should be "published"');
    });

    // Open the publish options menu
    casper.thenClick('.js-publish-splitbutton .options.up');

    casper.waitForOpaque('.js-publish-splitbutton .editor-options.overlay', function onSuccess() {
            // Click the 'unpublish' option
            casper.thenClick('.js-publish-splitbutton li[data-set-status="draft"]');
    }, function onTimeout() {
            test.assert(false, 'Publish split button menu should have opened');
    });

    // ... check status, label, class
    casper.waitForSelector('.js-publish-splitbutton.splitbutton-delete', function onSuccess() {
        test.assertExists('.js-publish-button.button-delete', 'Publish button should have .button-delete');
        test.assertSelectorHasText('.js-publish-button', 'Unpublish');
        test.assertEval(function () {
            return (__utils__.findOne('.js-publish-button').getAttribute('data-status') === 'draft');
        }, 'Publish button\'s updated status should be "draft"');
    }, function onTimeout() {
        test.assert(false, 'Publish split button should have .splitbutton-delete');
    });
});
