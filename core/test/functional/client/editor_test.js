// # Editor Test
// Test the editor screen works as expected

/*globals CasperTest, casper, testPost, $ */
CasperTest.begin('Ghost editor functions correctly', 19, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
        test.assertExists('.entry-markdown', 'Ghost editor is present');
        test.assertExists('.entry-preview', 'Ghost preview is present');
    });

    // Part 1: Test saving with no data - title is required
    casper.waitForSelector('#entry-title', function then() {
        test.assertEvalEquals(function() {
            return document.getElementById('entry-title').value;
        }, '', 'Title is empty');
    });

    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assert(true, 'Save without title results in error notification as expected');
        test.assertSelectorHasText('.notification-error', 'must specify a title', 'notification text is correct');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'Save without title did not result in an error notification');
    });

    this.thenClick('.js-bb-notification .close');

    // Part 2: Test saving with data
    casper.then(function createTestPost() {
        casper.sendKeys('#entry-title', testPost.title);
        casper.writeContentToCodeMirror(testPost.html);
    });

    casper.waitForSelectorTextChange('.entry-preview .rendered-markdown', function onSuccess() {
        test.assertSelectorHasText('.entry-preview .rendered-markdown', 'test', 'Editor value is correct.');
    }, casper.failOnTimeout(test, 'markdown did not re-render'));

    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assertUrlMatch(/ghost\/editor\/\d+\/$/, 'got an id on our URL');
        test.assertEvalEquals(function () {
            return document.querySelector('#entry-title').value;
        }, testPost.title, 'Title is correct');
    }, casper.failOnTimeout(test, 'Post was not successfully created'));

    // Part 3: Test title trimming
    var untrimmedTitle = '  test title  ',
        trimmedTitle = 'test title';

    casper.then(function populateTitle() {
        // Clear element
        casper.evaluate(function () {
            $('#entry-title').val('');
        });
        casper.sendKeys('#entry-title', untrimmedTitle);
        casper.click('#entry-markdown-content');

        test.assertEvalEquals(function () {
            return $('#entry-title').val();
        }, trimmedTitle, 'Entry title should match expected value.');
    });

    // Part 4: Word count and plurality
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

    // Part 5: Editor global shortcuts
    casper.then(function tryZenShortcut() {
        casper.sendKeys('#main', 'z', {modifiers: 'alt+shift'});
    });

    casper.waitForSelector('.editor.zen', function then() {
        casper.waitForTransparent('#global-header', function then() {
            test.assert(true, 'header becomes transparent');
        });
        casper.waitForTransparent('#publish-bar', function then() {
            test.assert(true, 'publish bar becomes transparent');
        });
    });

    casper.then(function tryZenShortcut() {
        casper.sendKeys('#main', 'z', {modifiers: 'alt+shift'});
    });

    casper.waitWhileSelector('.editor.zen', function then() {
        casper.waitForOpaque('#global-header', function then() {
            test.assert(true, 'header becomes opaque');
        });
        casper.waitForOpaque('#publish-bar', function then() {
            test.assert(true, 'publish bar becomes opaque');
        });
    });
});

// TODO: Expand markdown tests to cover more markdown, and keyboard shortcuts
CasperTest.begin('Markdown in editor works', 4, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    casper.then(function testImage() {
        casper.writeContentToCodeMirror('![sometext]()');
    });

    casper.waitForSelectorTextChange('.entry-preview .rendered-markdown', function onSuccess() {
        test.assertEvalEquals(function () {
            return document.querySelector('.CodeMirror-wrap textarea').value;
        }, '![sometext]()', 'Editor value is correct');

        test.assertSelectorHasText(
            '.entry-preview .rendered-markdown', 'Add image of sometext', 'Alt value is correct'
        );
    }, function onTimeout() {
        test.assert('false', 'markdown did not re-render');
    });
});

CasperTest.begin('Image Uploads', 17, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    // Test standard image upload modal
    casper.then(function () {
        casper.writeContentToCodeMirror('![]()');
    });

    function assertEmptyImageUploaderDisplaysCorrectly() {
        test.assertExists('.entry-preview .js-upload-target', 'Upload target exists');
        test.assertExists('.entry-preview .js-fileupload', 'File upload target exists');
        test.assertExists('.entry-preview .image-url', 'Image URL button exists');
    }

    casper.waitForSelector('.entry-preview .js-drop-zone.image-uploader', assertEmptyImageUploaderDisplaysCorrectly);

    // Test image URL upload modal
    casper.thenClick('.entry-preview .image-uploader a.image-url');

    casper.waitForSelector('.image-uploader-url', function onSuccess() {
        test.assertExists('.image-uploader-url .url.js-upload-url', 'Image URL uploader exists');
        test.assertExists('.image-uploader-url .button-save.js-button-accept', 'Image URL accept button exists');
        test.assertExists('.image-uploader-url .image-upload', 'Back to normal image upload style button exists');
    });

    // Test image source location
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    var testFileLocation = '/test/file/location';

    casper.then(function () {
        var markdownImageString = '![](' + testFileLocation + ')';
        casper.writeContentToCodeMirror(markdownImageString);
    });

    casper.waitForSelector('.entry-preview .js-drop-zone.pre-image-uploader', function onSuccess() {
        var imageJQuerySelector = '.entry-preview img.js-upload-target[src="' + testFileLocation + '"]';
        test.assertExists(imageJQuerySelector, 'Uploaded image tag properly links to source location');
    });

    // Test cancel image button
    casper.thenClick('.pre-image-uploader a.image-cancel.js-cancel');

    casper.waitForSelector('.entry-preview .js-drop-zone.image-uploader', assertEmptyImageUploaderDisplaysCorrectly);

    // Test image url source location
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    casper.then(function () {
        casper.writeContentToCodeMirror('![]()');
    });

    casper.waitForSelector('.entry-preview .js-drop-zone.image-uploader', function onSuccess() {
        casper.thenClick('.entry-preview .image-uploader a.image-url');
    });

    var imageURL = 'http://www.random.url';
    casper.waitForSelector('.image-uploader-url', function onSuccess() {
        casper.sendKeys('.image-uploader-url input.url.js-upload-url', imageURL);
        casper.thenClick('.js-button-accept.button-save');
    });

    casper.waitForSelector('.entry-preview .js-drop-zone.pre-image-uploader', function onSuccess() {
        var imageJQuerySelector = '.entry-preview img.js-upload-target[src="' + imageURL + '"]';
        test.assertExists(imageJQuerySelector, 'Uploaded image tag properly links to inputted image URL');
    });
});

CasperTest.begin('Tag editor', 7, function suite(test) {
casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
    test.assertTitle('Ghost Admin', 'Ghost admin has no title');
    test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
});

    var tagName = 'someTagName';

    casper.then(function () {
        test.assertExists('#entry-tags', 'should have tag label area');
        test.assertExists('#entry-tags .tag-label', 'should have tag label icon');
        test.assertExists('#entry-tags input.tag-input', 'should have tag input area');
        casper.sendKeys('#entry-tags input.tag-input', tagName);
        casper.sendKeys('#entry-tags input.tag-input', casper.page.event.key.Enter);
    });

    var createdTagSelector = '#entry-tags .tags .tag';
    casper.waitForSelector(createdTagSelector, function onSuccess() {
        test.assertSelectorHasText(createdTagSelector, tagName, 'typing enter after tag name should create tag');
    });

    casper.thenClick(createdTagSelector);

    casper.waitWhileSelector(createdTagSelector, function onSuccess() {
        test.assert(true, 'clicking the tag should delete the tag');
    });
});

CasperTest.begin('Post settings menu', 30, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    casper.then(function () {
        test.assertExists('#publish-bar button.post-settings', 'icon toggle should exist');
        test.assertNotVisible('#publish-bar .post-settings-menu', 'popup menu should not be visible at startup');
        test.assertExists('.post-settings-menu input#url', 'url field exists');
        test.assertExists('.post-settings-menu input.post-setting-date', 'publication date field exists');
        test.assertExists('.post-settings-menu input.post-setting-static-page', 'static page checkbox field exists');
        test.assertExists('.post-settings-menu button.delete', 'delete post button exists');
    });

    casper.thenClick('#publish-bar button.post-settings');

    casper.waitUntilVisible('#publish-bar .post-settings-menu', function onSuccess() {
        test.assert(true, 'popup menu should be visible after clicking post-settings icon');
        test.assertNotVisible(
            '.post-settings-menu button.delete', 'delete post button shouldn\'t be visible on unsaved drafts'
        );
    });

    casper.thenClick('#publish-bar button.post-settings');

    casper.waitWhileVisible('#publish-bar .post-settings-menu', function onSuccess() {
        test.assert(true, 'popup menu should not be visible after clicking post-settings icon');
    });

    // Enter a title and save draft so converting to/from static post
    // will result in notifications and 'Delete This Post' button appears
    casper.then(function (){
        casper.sendKeys('#entry-title', 'aTitle');
        casper.thenClick('.js-publish-button');
    });

    casper.waitForSelector('.notification-success', function waitForSuccess() {
        test.assert(true, 'got success notification');
        test.assertSelectorHasText('.notification-success', 'Saved.');
        casper.click('.notification-success a.close');
    }, function onTimeout() {
        test.assert(false, 'No success notification');
    });

    casper.waitWhileSelector('.notification-success');

    casper.thenClick('#publish-bar button.post-settings');

    casper.waitUntilVisible('#publish-bar .post-settings-menu', function onSuccess() {
        test.assert(true, 'post settings menu should be visible after clicking post-settings icon');
    });

    casper.waitUntilVisible('.post-settings-menu button.delete', function onSuccess() {
        test.assert(true, 'delete post button should be visible for saved drafts');
    });

    // Test change permalink
    casper.then(function () {
        this.fillSelectors('.post-settings-menu form', {
            '#url': 'new-url-editor'
        }, false);

        this.click('#publish-bar button.post-settings');
    });

    casper.waitForSelector('.notification-success', function waitForSuccess() {
        test.assert(true, 'got success notification');
        test.assertSelectorHasText('.notification-success', 'Permalink successfully changed to new-url-editor.');
        casper.click('.notification-success a.close');
    }, function onTimeout() {
        test.assert(false, 'No success notification');
    });

    casper.waitWhileSelector('.notification-success', function () {
        test.assert(true, 'notification cleared.');
        test.assertNotVisible('.notification-success', 'success notification should not still exist');
    });

    // Test change pub date
    casper.thenClick('#publish-bar button.post-settings');

    casper.waitUntilVisible('#publish-bar .post-settings-menu .post-setting-date', function onSuccess() {
        test.assert(true, 'post settings menu should be visible after clicking post-settings icon');
    });

    casper.then(function () {
        this.fillSelectors('.post-settings-menu form', {
            '.post-setting-date': '10 May 14 @ 00:17'
        }, false);

        this.click('#publish-bar button.post-settings');
    });

   casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function testGoodResponse(resource) {
        test.assert(400 > resource.status);
    });

    casper.then(function checkValueMatches() {
        //using assertField(name) checks the htmls initial "value" attribute, so have to hack around it.
        var dateVal = this.evaluate(function () {
            return __utils__.getFieldValue('post-setting-date');
        });
        test.assertEqual(dateVal, '10 May 14 @ 00:17');
    });
    
    // Test static page toggling
    casper.thenClick('.post-settings-menu .post-setting-static-page + label');

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function testGoodResponse(resource) {
        test.assert(400 > resource.status);
    });
    
    casper.then(function staticPageIsCheckedTest() {
        var checked = casper.evaluate(function evalCheckedProp() {
            return document.querySelector('.post-setting-static-page').checked
        });
        test.assert(checked, 'Turned post into static page.');
    });
    
    casper.thenClick('.post-settings-menu .post-setting-static-page + label');

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function testGoodResponse(resource) {
        test.assert(400 > resource.status);
    });
    
    casper.then(function staticPageIsCheckedTest() {
        var checked = casper.evaluate(function evalCheckedProp() {
            return document.querySelector('.post-setting-static-page').checked
        });
        test.assert(!checked, 'Turned page into post.');
    });
        


    // Test Delete Post Modal
    casper.thenClick('.post-settings-menu button.delete');

    casper.waitUntilVisible('#modal-container', function onSuccess() {
        test.assert(true, 'delete post modal is visible after clicking delete');
        test.assertSelectorHasText(
            '#modal-container .modal-header',
            'Are you sure you want to delete this post?',
            'delete post modal header has correct text');
    });

    casper.thenClick('#modal-container .js-button-reject');

    casper.waitWhileVisible('#modal-container', function onSuccess() {
        test.assert(true, 'clicking cancel should close the delete post modal');
    });

    casper.thenClick('#publish-bar button.post-settings');
    casper.thenClick('.post-settings-menu button.delete');
    casper.waitUntilVisible('#modal-container', function onSuccess() {
        casper.thenClick('#modal-container .js-button-accept');
    });

    casper.waitForUrl(/ghost\/\d+\/$/, function onSuccess() {
        test.assert(true, 'clicking the delete post button should bring us to the content page');
    });
});

CasperTest.begin('Publish menu - new post', 11, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    // ... check default option status, label, class
    casper.then(function () {
        test.assertExists('.js-publish-splitbutton');
        test.assertExists('.js-publish-splitbutton.splitbutton-save');
        test.assertExists('.js-publish-button');
        test.assertExists('.js-publish-button.button-save');
        test.assertSelectorHasText('.js-publish-button', 'Save Draft');
    });

    casper.then(function switchMenuToPublish() {
       // Open the publish options menu;
        casper.thenClick('.js-publish-splitbutton .options.up');

        casper.waitForOpaque('.js-publish-splitbutton .open');

        // Select the publish post button
        casper.thenClick('.js-publish-splitbutton li:first-child a');

        // ... check status, label, class
        casper.waitForSelector('.js-publish-splitbutton.splitbutton-delete', function onSuccess() {
            test.assertExists('.js-publish-button.button-delete', 'Publish button should have .button-delete');
            test.assertSelectorHasText('.js-publish-button', 'Publish Now');
        }, function onTimeout() {
            test.assert(false, 'Publish split button should have .splitbutton-delete');
        });
    });

    // Do publish
    casper.thenClick('.js-publish-button');

    // ... check status, label, class
    casper.waitForSelector('.js-publish-splitbutton.splitbutton-save', function onSuccess() {
        test.assertExists('.js-publish-button.button-save', 'Update button should have .button-save');
        test.assertSelectorHasText('.js-publish-button', 'Update Post');
    }, function onTimeout() {
        test.assert(false, 'Publish split button should have .splitbutton-save');
    });
});

CasperTest.begin('Publish menu - existing post', 21, function suite(test) {
    // Create a post, save it and test refreshed editor
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
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

    casper.waitForSelector('.notification-success', function checkPostWasCreated() {
        test.assertUrlMatch(/ghost\/editor\/\d+\/$/, 'got an id on our URL');
    });

    // ... check option status, label, class now that we're *saved* as 'draft'
    casper.then(function () {
        test.assertExists('.js-publish-splitbutton');
        test.assertExists('.js-publish-splitbutton.splitbutton-save');
        test.assertExists('.js-publish-button');
        test.assertExists('.js-publish-button.button-save');
        test.assertSelectorHasText('.js-publish-button', 'Save Draft');
    });

    casper.then(function switchMenuToPublish() {
        // Open the publish options menu;
        casper.thenClick('.js-publish-splitbutton .options.up');

        casper.waitForOpaque('.js-publish-splitbutton .open');

        // Select the publish post button
        casper.thenClick('.js-publish-splitbutton li:first-child a');

        // ... check status, label, class
        casper.waitForSelector('.js-publish-splitbutton.splitbutton-delete', function onSuccess() {
            test.assertExists('.js-publish-button.button-delete', 'Publish button should have .button-delete');
            test.assertSelectorHasText('.js-publish-button', 'Publish Now');
        }, function onTimeout() {
            test.assert(false, 'Publish split button should have .splitbutton-delete');
        });
    });

    // Do publish
    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-success', function checkPostWasCreated() {
        test.assertUrlMatch(/ghost\/editor\/\d+\/$/, 'got an id on our URL');
    });

    // ... check option status, label, class for saved as 'published'
    casper.then(function () {
        test.assertExists('.js-publish-splitbutton');
        test.assertExists('.js-publish-splitbutton.splitbutton-save');
        test.assertExists('.js-publish-button');
        test.assertExists('.js-publish-button.button-save');
        test.assertSelectorHasText('.js-publish-button', 'Update Post');
    });

    casper.then(function switchMenuToUnpublish() {
        // Open the publish options menu;
        casper.thenClick('.js-publish-splitbutton .options.up');

        casper.waitForOpaque('.js-publish-splitbutton .open');

        // Select the publish post button
        casper.thenClick('.js-publish-splitbutton li:nth-child(2) a');

        // ... check status, label, class
        casper.waitForSelector('.js-publish-splitbutton.splitbutton-delete', function onSuccess() {
            test.assertExists('.js-publish-button.button-delete', 'Publish button should have .button-delete');
            test.assertSelectorHasText('.js-publish-button', 'Unpublish');
        }, function onTimeout() {
            test.assert(false, 'Publish split button should have .splitbutton-delete');
        });
    });
    // Do unpublish
    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-success', function checkPostWasCreated() {
        // ... check status, label, class
        casper.waitForSelector('.js-publish-splitbutton.splitbutton-save', function onSuccess() {
            test.assertExists('.js-publish-button.button-save', 'Publish button should have .button-save');
            test.assertSelectorHasText('.js-publish-button', 'Save Draft');
        }, function onTimeout() {
            test.assert(false, 'Publish split button should have .splitbutton-save');
        });
    });
});


// test the markdown help modal
CasperTest.begin('Markdown help modal', 5, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    // open markdown help modal
    casper.thenClick('a.markdown-help');

    casper.waitUntilVisible('#modal-container', function onSuccess() {
        test.assertSelectorHasText(
            '.modal-content .modal-header',
            'Markdown Help',
            'delete modal has correct text');

        test.assertExists('.modal-content .close');
    });

    casper.thenClick('.modal-content .close');

    casper.waitWhileVisible('#modal-container', function onSuccess() {
        test.assert(true, 'clicking close should remove the markdown help modal');
    });
});
