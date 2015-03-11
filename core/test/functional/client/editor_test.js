// # Editor Test
// Test the editor screen works as expected

/*globals CasperTest, casper, testPost, $ */
CasperTest.begin('Ghost editor functions correctly', 20, function suite(test) {
    test.assertHTMLEquals = function (equals, message) {
        test.assertEvalEquals(function () {
            return document.querySelector('.entry-preview .rendered-markdown').innerHTML
                .replace(/<script.*?><\/script>/g, '');
        }, equals, message);
    };

    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
        test.assertExists('.entry-markdown', 'Ghost editor is present');
        test.assertExists('.entry-preview', 'Ghost preview is present');
    });

    // Part 1: Test saving with no data - title should default
    casper.waitForSelector('#entry-title', function then() {
        test.assertEvalEquals(function () {
            return document.getElementById('entry-title').value;
        }, '', 'Title is empty');
    });

    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assert(true, 'Can save with no title.');
        test.assertEvalEquals(function () {
            return document.getElementById('entry-title').value;
        }, '(Untitled)', 'Title is "(Untitled)"');
    }, function onTimeout() {
        test.assert(false, 'Failed to save without a title.');
    });

    this.thenClick('.js-bb-notification .close');

    // Part 2: Test saving with data
    casper.then(function createTestPost() {
        casper.sendKeys('#entry-title', testPost.title, {reset: true});
        casper.writeContentToCodeMirror(testPost.html);
    });

    // TODO: Expand markdown tests to cover more markdown, and keyboard shortcuts
    casper.waitForSelectorTextChange('.entry-preview .rendered-markdown', function onSuccess() {
        test.assertSelectorHasText(
            '.entry-preview .rendered-markdown',
            'I am a test post.  \n\nI have some small content\n',
            'Editor HTML preview has correct text.'
        );
        test.assertHTMLEquals(
            '<p>I am a test post.  </p>\n\n<h1 id=\"ihavesomesmallcontent\">I have some small content</h1>\n',
            'generated HTML is correct'
        );
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

    casper.then(function () {
        casper.writeContentToCodeMirror('even **more** words'); // append another word, assumes newline
    });

    casper.waitForSelectorTextChange('.entry-word-count', function onSuccess() {
        test.assertSelectorHasText('.entry-word-count', '5 words', 'count of 5 produces plural "words".');
    });

    // Part 5: Editor global shortcuts
    casper.then(function tryZenShortcut() {
        casper.sendKeys('.page-content', 'z', {modifiers: 'alt+shift'});
    });

    casper.waitForSelector('.editor.zen', function then() {
        casper.waitForTransparent('.global-nav', function then() {
            test.assert(true, 'header becomes transparent');
        });
        casper.waitForTransparent('#publish-bar', function then() {
            test.assert(true, 'publish bar becomes transparent');
        });
    });

    casper.then(function tryZenShortcut() {
        casper.sendKeys('.page-content', 'z', {modifiers: 'alt+shift'});
    });

    casper.waitWhileSelector('.editor.zen', function then() {
        casper.waitForOpaque('.global-nav', function then() {
            test.assert(true, 'header becomes opaque');
        });
        casper.waitForOpaque('#publish-bar', function then() {
            test.assert(true, 'publish bar becomes opaque');
        });
    });
});

CasperTest.begin('Image Uploads', 24, function suite(test) {
    test.assertHTMLEquals = function (equals, message) {
        test.assertEvalEquals(function () {
            return document.querySelector('.entry-preview .rendered-markdown').innerHTML
                .replace(/<script.*?><\/script>/g, '');
        }, equals, message);
    };

    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    // Test standard image upload modal
    casper.then(function testImage() {
        casper.writeContentToCodeMirror('![some text]()');
    });

    casper.waitForSelectorTextChange('.entry-preview .rendered-markdown', function onSuccess() {
        test.assertEvalEquals(function () {
            return document.querySelector('.CodeMirror-wrap textarea').value;
        }, '![some text]()', 'Editor value is correct');

        test.assertHTMLEquals('<section id=\"image_upload_1\" class=\"js-drop-zone image-uploader\">' +
        '<span class=\"media\"><span class=\"hidden\">Image Upload</span></span>' +
        '<img class=\"js-upload-target\" style=\"display: none; \" src=\"\">' +
        '<div class=\"description\">Add image of <strong>some text</strong></div>' +
        '<input class=\"js-fileupload main fileupload\" type=\"file\" name=\"uploadimage\">' +
        '<div class=\"js-fail failed\" style=\"display: none\">Something went wrong :(</div>' +
        '<button class=\"js-fail btn btn-green\" style=\"display: none\">Try Again</button>' +
        '<a class=\"image-url\" title=\"Add image from URL\"><span class=\"hidden\">URL</span></a>' +
        '</section>\n', 'HTML is correct');

        test.assertSelectorHasText(
            '.entry-preview .rendered-markdown', 'Add image of some text', 'Alt value is correct'
        );
    }, function onTimeout() {
        test.assert('false', 'markdown did not re-render');
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
        test.assertExists('.image-uploader-url .btn-blue.js-button-accept', 'Image URL accept button exists');
        test.assertExists('.image-uploader-url .image-upload', 'Back to normal image upload style button exists');
    });

    // Test image source location
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    var testFileLocation = '/test/file/location',
        imageURL = 'http://www.random.url';

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
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    casper.then(function () {
        casper.writeContentToCodeMirror('![]()');
    });

    casper.waitForSelector('.entry-preview .js-drop-zone.image-uploader', function onSuccess() {
        casper.thenClick('.entry-preview .image-uploader a.image-url');
    });

    casper.waitForSelector('.image-uploader-url', function onSuccess() {
        casper.sendKeys('.image-uploader-url input.url.js-upload-url', imageURL);
        casper.thenClick('.js-button-accept.btn-blue');
    });

    casper.waitForSelector('.entry-preview .js-drop-zone.pre-image-uploader', function onSuccess() {
        var imageJQuerySelector = '.entry-preview img.js-upload-target[src="' + imageURL + '"]';
        test.assertExists(imageJQuerySelector, 'Uploaded image tag properly links to inputted image URL');
    });

    // Save the post with the image
    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assertUrlMatch(/ghost\/editor\/\d+\/$/, 'got an id on our URL');
    }, casper.failOnTimeout(test, 'Post was not successfully created'));

    casper.thenTransitionAndWaitForScreenLoad('content', function canTransition() {
        test.assert(true, 'Can transition to content screen');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'content transitions to correct url');
    });

    // Edit the draft post we just created
    casper.thenClick('.content-preview a.post-edit');

    casper.then(function () {
        casper.writeContentToCodeMirror('abcdefghijklmnopqrstuvwxyz');
    });

    casper.waitForSelectorTextChange('.entry-preview .rendered-markdown', function onSuccess() {
        test.assertSelectorHasText(
           '.entry-preview .rendered-markdown',//
           'abcdefghijklmnopqrstuvwxyz',
           'Editor HTML preview has correct text after editing.'
        );
    }, casper.failOnTimeout(test, 'markdown did not re-render'));
});

CasperTest.begin('Tag editor', 7, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    var tagName = 'someTagName',
        createdTagSelector = '#entry-tags .tags .tag';

    casper.then(function () {
        test.assertExists('#entry-tags', 'should have tag label area');
        test.assertExists('#entry-tags .tag-label', 'should have tag label icon');
        test.assertExists('#entry-tags input.tag-input', 'should have tag input area');
    });

    casper.thenClick('#entry-tags input.tag-input');
    casper.then(function () {
        casper.sendKeys('#entry-tags input.tag-input', tagName, {keepFocus: true});
    });
    casper.then(function () {
        casper.sendKeys('#entry-tags input.tag-input', casper.page.event.key.Enter);
    });

    casper.waitForSelector(createdTagSelector, function onSuccess() {
        test.assertSelectorHasText(createdTagSelector, tagName, 'typing enter after tag name should create tag');
    });

    casper.thenClick(createdTagSelector);

    casper.waitWhileSelector(createdTagSelector, function onSuccess() {
        test.assert(true, 'clicking the tag should delete the tag');
    });
});

CasperTest.begin('Publish menu - new post', 10, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    // ... check default option status, label, class
    casper.then(function () {
        test.assertExists('.js-publish-splitbutton');
        test.assertExists('.js-publish-button');
        test.assertExists('.js-publish-button.btn-blue');
        test.assertSelectorHasText('.js-publish-button', 'Save Draft');
    });

    // Fill headline and content
    casper.then(function fillContent() {
        casper.sendKeys('#entry-title', 'Headline');
        casper.writeContentToCodeMirror('Just a bit of test text');
    });

    casper.then(function switchMenuToPublish() {
       // Open the publish options menu;
        casper.thenClick('.js-publish-splitbutton .dropdown-toggle');

        casper.waitForOpaque('.js-publish-splitbutton .open');

        // Select the publish post button
        casper.thenClick('.js-publish-splitbutton li:first-child a');

        // ... check status, label, class
        casper.waitForSelector('.js-publish-splitbutton', function onSuccess() {
            test.assertExists('.js-publish-button.btn-red', 'Publish button should have .btn-red');
            test.assertSelectorHasText('.js-publish-button', 'Publish Now');
        }, function onTimeout() {
            test.assert(false, 'Publish split button works');
        });
    });

    // Do publish
    casper.thenClick('.js-publish-button');

    // ... check status, label, class
    casper.waitForSelector('.js-publish-splitbutton', function onSuccess() {
        test.assertExists('.js-publish-button.btn-blue', 'Update button should have .btn-blue');
        test.assertSelectorHasText('.js-publish-button', 'Update Post');
    }, function onTimeout() {
        test.assert(false, 'Publish split button works');
    });
});

CasperTest.begin('Publish menu - existing post', 23, function suite(test) {
    // Create a post, save it and test refreshed editor
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    casper.thenClick('.js-publish-splitbutton .dropdown-toggle');

    casper.waitForOpaque('.js-publish-splitbutton .dropdown-menu', function onSuccess() {
        test.assert(true, 'popup menu should be visible after clicking post-settings icon');
        test.assertNotVisible(
            '.js-publish-splitbutton .delete', 'delete post button shouldn\'t be visible on unsaved drafts'
        );
    });

    casper.then(function createTestPost() {
        casper.sendKeys('#entry-title', testPost.title);
        casper.writeContentToCodeMirror(testPost.html);
    });

    casper.waitForSelectorTextChange('.entry-preview .rendered-markdown', function onSuccess() {
        test.assertSelectorHasText('.entry-preview .rendered-markdown', 'test', 'Editor value is correct');
    });

    casper.thenClick('.js-publish-splitbutton .dropdown-toggle');

    // Create a post in draft status
    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-success', function checkPostWasCreated() {
        test.assertUrlMatch(/ghost\/editor\/\d+\/$/, 'got an id on our URL');
    });

    // ... check option status, label, class now that we're *saved* as 'draft'
    casper.then(function () {
        test.assertExists('.js-publish-splitbutton');
        test.assertExists('.js-publish-button');
        test.assertExists('.js-publish-button.btn-blue');
        test.assertSelectorHasText('.js-publish-button', 'Save Draft');
    });

    casper.thenClick('.js-publish-splitbutton .dropdown-toggle');

    casper.waitForOpaque('.js-publish-splitbutton .open', function onSuccess() {
        test.assert(true, 'delete post button should be visible for saved drafts');
        test.assertVisible(
            '.js-publish-splitbutton .delete', 'delete post button should be visible on saved drafts'
        );
    });

    casper.thenClick('.js-publish-splitbutton .dropdown-toggle');

    casper.then(function switchMenuToPublish() {
        // Open the publish options menu;
        casper.thenClick('.js-publish-splitbutton .dropdown-toggle');

        casper.waitForOpaque('.js-publish-splitbutton .open');

        // Select the publish post button
        casper.thenClick('.js-publish-splitbutton li:first-child a');

        // ... check status, label, class
        casper.waitForSelector('.js-publish-splitbutton', function onSuccess() {
            test.assertExists('.js-publish-button.btn-red', 'Publish button should have .btn-red');
            test.assertSelectorHasText('.js-publish-button', 'Publish Now');
        }, function onTimeout() {
            test.assert(false, 'Publish split button works');
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
        test.assertExists('.js-publish-button');
        test.assertExists('.js-publish-button.btn-blue');
        test.assertSelectorHasText('.js-publish-button', 'Update Post');
    });

    casper.then(function switchMenuToUnpublish() {
        // Open the publish options menu;
        casper.thenClick('.js-publish-splitbutton .dropdown-toggle');

        casper.waitForOpaque('.js-publish-splitbutton .open');

        // Select the publish post button
        casper.thenClick('.js-publish-splitbutton li:nth-child(2) a');

        // ... check status, label, class
        casper.waitForSelector('.js-publish-splitbutton', function onSuccess() {
            test.assertExists('.js-publish-button.btn-red', 'Publish button should have .btn-red');
            test.assertSelectorHasText('.js-publish-button', 'Unpublish');
        }, function onTimeout() {
            test.assert(false, 'Publish split button works');
        });
    });
    // Do unpublish
    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-success', function checkPostWasCreated() {
        // ... check status, label, class
        casper.waitForSelector('.js-publish-splitbutton', function onSuccess() {
            test.assertExists('.js-publish-button.btn-blue', 'Publish button should have .btn-blue');
            test.assertSelectorHasText('.js-publish-button', 'Save Draft');
        }, function onTimeout() {
            test.assert(false, 'Publish split button works');
        });
    });
});

CasperTest.begin('Publish menu - delete post', 7, function testDeleteModal(test) {
    // Create a post that can be deleted
    CasperTest.Routines.createTestPost.run(false);

    // Begin test
    casper.thenOpenAndWaitForPageLoad('content', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Title is "Content - Test Blog"');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    // Transition to the editor
    casper.thenClick('.post-edit');
    casper.waitForSelector('#entry-title');

    // Open post settings menu
    casper.thenClick('.js-publish-splitbutton .dropdown-toggle');
    casper.waitForOpaque('.js-publish-splitbutton .open');
    casper.thenClick('.js-publish-splitbutton li:nth-child(4) a');

    casper.waitUntilVisible('.modal-container', function onSuccess() {
        test.assertSelectorHasText(
            '.modal-content .modal-header',
            'Are you sure you want to delete this post?',
            'delete modal has correct text');
    });

    casper.thenClick('.js-button-reject');

    casper.waitWhileVisible('.modal-container', function onSuccess() {
        test.assert(true, 'clicking cancel should close the delete post modal');
    });

    // Test delete
    casper.thenClick('.js-publish-splitbutton .dropdown-toggle');
    casper.waitForOpaque('.js-publish-splitbutton .open');
    casper.thenClick('.js-publish-splitbutton li:nth-child(4) a');

    casper.waitForSelector('.modal-container .modal-content', function onSuccess() {
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

CasperTest.begin('Publish menu - new post status is correct after failed save', 4, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    // Fill title and content
    casper.then(function writePost() {
        casper.sendKeys('#entry-title', new Array(160).join('x'));
    });

    casper.then(function switchMenuToPublish() {
       // Open the publish options menu;
        casper.thenClick('.js-publish-splitbutton .dropdown-toggle');

        casper.waitForOpaque('.js-publish-splitbutton .open');

        // Select the publish post button
        casper.thenClick('.js-publish-splitbutton li:first-child a');
    });

    // attempt to save
    casper.thenClick('.js-publish-button');

    // ... check status, label, class
    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assertExists('.js-publish-button.btn-blue', 'Update button should have .btn-blue');
        // wait for button to settle
        casper.wait(500);
        test.assertSelectorHasText('.js-publish-button', 'Save Draft');
    }, function onTimeout() {
        test.assert(false, 'Saving post with invalid title should trigger an error');
    });

    // Click on "Content" in the main nav
    casper.thenClick('.nav-content');

    // The "Are you sure?" modal appears
    casper.waitUntilVisible('.modal-content', function onSuccess() {
        casper.thenClick('.btn-red');
    }, function onTimeout() {
        test.assert(false, 'Are you sure you want to leave modal did not appear.');
    });
});

CasperTest.begin('Publish menu - existing post status is correct after failed save', 6, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    // Fill title and content
    casper.then(function writePost() {
        casper.sendKeys('#entry-title', 'a valid title');
        casper.writeContentToCodeMirror('body content');
    });

    // save
    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-success');

    casper.then(function updateTitle() {
        casper.sendKeys('#entry-title', new Array(160).join('y'));
    });

    casper.then(function switchMenuToPublish() {
        // Open the publish options menu;
        casper.thenClick('.js-publish-splitbutton .dropdown-toggle');

        casper.waitForOpaque('.js-publish-splitbutton .open');

        // Select the publish post button
        casper.thenClick('.js-publish-splitbutton li:first-child a');

        // ... check status, label, class
        casper.waitForSelector('.js-publish-splitbutton', function onSuccess() {
            test.assertExists('.js-publish-button.btn-red', 'Publish button should have .btn-red');
            test.assertSelectorHasText('.js-publish-button', 'Publish Now');
        }, function onTimeout() {
            test.assert(false, 'Publish split button works');
        });
    });

    // attempt to save
    casper.thenClick('.js-publish-button');

    // ... check status, label, class
    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assertExists('.js-publish-button.btn-blue', 'Update button should have .btn-blue');
        // wait for button to settle
        casper.wait(500);
        test.assertSelectorHasText('.js-publish-button', 'Save Draft');
    }, function onTimeout() {
        test.assert(false, 'Saving post with invalid title should trigger an error');
    });
});

// test the markdown help modal
CasperTest.begin('Markdown help modal', 5, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    // open markdown help modal
    casper.thenClick('a.markdown-help');

    casper.waitUntilVisible('.modal-container', function onSuccess() {
        test.assertSelectorHasText(
            '.modal-content .modal-header',
            'Markdown Help',
            'delete modal has correct text');

        test.assertExists('.modal-content .close');
    });

    casper.thenClick('.modal-content .close');

    casper.waitWhileVisible('.modal-container', function onSuccess() {
        test.assert(true, 'clicking close should remove the markdown help modal');
    });
});

// test editor title input is correct after changing a post attribute in the post-settings-menu
CasperTest.begin('Title input is set correctly after using the Post-Settings-Menu', function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    // add a new post
    casper.then(function fillContent() {
        casper.sendKeys('#entry-title', 'post title', {reset: true});
        casper.writeContentToCodeMirror('Just a bit of test text');
    });

    // save draft
    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-success');

    // change the title
    casper.then(function updateTitle() {
        casper.sendKeys('#entry-title', 'changed post title', {reset: true});
        casper.click('#entry-markdown-content');
    });

    // change a post attribute via the post-settings-menu

    casper.thenClick('.post-settings');

    casper.then(function () {
        this.fillSelectors('.settings-menu form', {
            '#url': 'changed-slug'
        }, false);

        this.click('.post-settings');
    });

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function testGoodResponse(resource) {
        test.assert(resource.status < 400);
    });

    casper.then(function checkTitleInput() {
        test.assertEvalEquals(function () {
            return $('#entry-title').val();
        }, 'changed post title', 'Title input should match expected value.');
    });
});

// test editor content input is correct after changing a post attribute in the post-settings-menu
CasperTest.begin('Editor content is set correctly after using the Post-Settings-Menu', function suite(test) {
    casper.thenOpenAndWaitForPageLoad('editor', function testTitleAndUrl() {
        test.assertTitle('Editor - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
    });

    // add a new post
    casper.then(function fillContent() {
        casper.sendKeys('#entry-title', 'post title');
        casper.writeContentToCodeMirror('Just a bit of test text');
    });

    // save draft
    casper.thenClick('.js-publish-button');

    casper.waitForSelector('.notification-success');

    // change the content
    casper.then(function updateContent() {
        casper.writeContentToCodeMirror('updated content');
        casper.click('#entry-title');
    });

    // change a post attribute via the post-settings-menu

    casper.thenClick('.post-settings');

    casper.then(function () {
        this.fillSelectors('.settings-menu form', {
            '#url': 'changed-slug-after-update'
        }, false);

        this.click('.post-settings');
    });

    casper.waitForResource(/\/posts\/\d+\/\?include=tags/, function testGoodResponse(resource) {
        test.assert(resource.status < 400);
    });

    casper.waitForSelectorTextChange('.entry-preview .rendered-markdown', function onSuccess() {
        test.assertSelectorHasText(
            '.entry-preview .rendered-markdown',
            'updated content',
            'Editor has correct content.'
        );
    }, casper.failOnTimeout(test, 'markdown was not available'));
});
