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

CasperTest.begin("Markdown in editor works", 3, function suite(test) {
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

CasperTest.begin("Image Uploads", 14, function suite(test) {
    casper.thenOpen(url + "ghost/editor/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
    });

    // Test standard image upload modal
    casper.then(function () {
        casper.writeContentToCodeMirror("![]()");
    });

    function assertEmptyImageUploaderDisplaysCorrectly() {
        test.assertExists(".entry-preview .js-upload-target", "Upload target exists");
        test.assertExists(".entry-preview .js-fileupload", "File upload target exists");
        test.assertExists(".entry-preview .image-url", "Image URL button exists");
    };

    casper.waitForSelector(".entry-preview .js-drop-zone.image-uploader", assertEmptyImageUploaderDisplaysCorrectly);

    // Test image URL upload modal
    casper.thenClick(".entry-preview .image-uploader a.image-url");

    casper.waitForSelector(".image-uploader-url", function onSuccess() {
        test.assertExists(".image-uploader-url .url.js-upload-url", "Image URL uploader exists")
        test.assertExists(".image-uploader-url .button-save.js-button-accept", "Image URL accept button exists")
        test.assertExists(".image-uploader-url .image-upload", "Back to normal image upload style button exists")
    });

    // Test image source location
    casper.thenOpen(url + "ghost/editor/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
    });

    var testFileLocation = "test/file/location";

    casper.then(function () {
        var markdownImageString = "![](" + testFileLocation + ")";
        casper.writeContentToCodeMirror(markdownImageString);
    });

    casper.waitForSelector(".entry-preview .js-drop-zone.pre-image-uploader", function onSuccess() {
        var imageJQuerySelector = ".entry-preview img.js-upload-target[src='" + testFileLocation + "']"
        test.assertExists(imageJQuerySelector, "Uploaded image tag properly links to source location");
    });

    // Test cancel image button
    casper.thenClick(".pre-image-uploader a.image-cancel.js-cancel");

    casper.waitForSelector(".entry-preview .js-drop-zone.image-uploader", assertEmptyImageUploaderDisplaysCorrectly);

    // Test image url source location
    casper.thenOpen(url + "ghost/editor/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
    });

    casper.then(function () {
        casper.writeContentToCodeMirror("![]()");
    });

    casper.waitForSelector(".entry-preview .js-drop-zone.image-uploader", function onSuccess() {
        casper.thenClick(".entry-preview .image-uploader a.image-url");
    });

    var imageURL = "random.url";
    casper.waitForSelector(".image-uploader-url", function onSuccess() {
        casper.sendKeys(".image-uploader-url input.url.js-upload-url", imageURL);
        casper.thenClick(".js-button-accept.button-save");
    });

    casper.waitForSelector(".entry-preview .js-drop-zone.pre-image-uploader", function onSuccess() {
        var imageJQuerySelector = ".entry-preview img.js-upload-target[src='" + imageURL + "']"
        test.assertExists(imageJQuerySelector, "Uploaded image tag properly links to inputted image URL");
    });

});

CasperTest.begin('Required Title', 4, function suite(test) {
    casper.thenOpen(url + "ghost/editor/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/editor\/$/, "Ghost doesn't require login this time");
    });

    casper.waitForSelector('#entry-title', function then() {
        test.assertEvalEquals(function() {
            return document.getElementById('entry-title').value;
        }, '', 'Title is empty');
    });

    casper.thenClick('.js-publish-button');  // Safe to assume draft mode?

    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
        test.assertSelectorHasText('.notification-error', 'must specify a title');
    }, function onTimeout() {
        test.fail('Title required error did not appear');
    }, 2000);
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

CasperTest.begin("Tag editor", 6, function suite(test) {
    casper.thenOpen(url + "ghost/editor/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
    });

    var tagName = "someTagName";

    casper.then(function () {
        test.assertExists("#entry-tags", "should have tag label area");
        test.assertExists("#entry-tags .tag-label", "should have tag label icon");
        test.assertExists("#entry-tags input.tag-input", "should have tag input area");
        casper.sendKeys("#entry-tags input.tag-input", tagName);
        casper.sendKeys("#entry-tags input.tag-input", casper.page.event.key.Enter);
    });

    var createdTagSelector = "#entry-tags .tags .tag";
    casper.waitForSelector(createdTagSelector, function onSuccess() {
        test.assertSelectorHasText(createdTagSelector, tagName, "typing enter after tag name should create tag");
    });

    casper.thenClick(createdTagSelector);

    casper.waitWhileSelector(createdTagSelector, function onSuccess() {
        test.assert(true, "clicking the tag should delete the tag");
    });
});

CasperTest.begin("Post settings menu", 18, function suite(test) {
    casper.thenOpen(url + "ghost/editor/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
    });

    casper.then(function () {
        test.assertExists("#publish-bar a.post-settings", "icon toggle should exist");
        test.assertNotVisible("#publish-bar .post-settings-menu", "popup menu should not be visible at startup");
        test.assertExists(".post-settings-menu input#url", "url field exists");
        test.assertExists(".post-settings-menu input#pub-date", "publication date field exists");
        test.assertExists(".post-settings-menu input#static-page", "static page checkbox field exists");
        test.assertExists(".post-settings-menu a.delete", "delete post button exists")
    });

    casper.thenClick("#publish-bar a.post-settings");

    casper.waitUntilVisible("#publish-bar .post-settings-menu", function onSuccess() {
        test.assert(true, "popup menu should be visible after clicking post-settings icon");
        test.assertNotVisible(".post-settings-menu a.delete", "delete post btn shouldn't be visible on unsaved drafts");
    });

    casper.thenClick("#publish-bar a.post-settings");

    casper.waitWhileVisible("#publish-bar .post-settings-menu", function onSuccess() {
        test.assert(true, "popup menu should not be visible after clicking post-settings icon");
    });

    // Enter a title and save draft so converting to/from static post
    // will result in notifications and 'Delete This Post' button appears
    casper.then(function (){
        casper.sendKeys("#entry-title", "aTitle");
        casper.thenClick(".js-publish-button");
    });

    casper.thenClick("#publish-bar a.post-settings");

    casper.waitUntilVisible("#publish-bar .post-settings-menu", function onSuccess() {
        test.assert(true, "post settings menu should be visible after clicking post-settings icon");
    });

    casper.waitUntilVisible(".post-settings-menu a.delete", function onSuccess() {
        test.assert(true, "delete post button should be visible for saved drafts");
    });

    // Test Static Page conversion
    casper.thenClick(".post-settings-menu #static-page");

    var staticPageConversionText = "Successfully converted to static page.";
    casper.waitForText(staticPageConversionText, function onSuccess() {
        test.assertSelectorHasText(
            ".notification-success", staticPageConversionText, "correct static page conversion notification appears");
    });

    casper.thenClick(".post-settings-menu #static-page");

    var postConversionText = "Successfully converted to post.";
    casper.waitForText(postConversionText, function onSuccess() {
        test.assertSelectorHasText(
            ".notification-success", postConversionText, "correct post conversion notification appears");
    });

    // Test Delete Post Modal
    casper.thenClick(".post-settings-menu a.delete");

    casper.waitUntilVisible("#modal-container", function onSuccess() {
        test.assert(true, "delete post modal is visible after clicking delete");
        test.assertSelectorHasText(
            "#modal-container .modal-header",
            "Are you sure you want to delete this post?",
            "delete post modal header has correct text");
    });

    casper.thenClick("#modal-container .js-button-reject");

    casper.waitWhileVisible("#modal-container", function onSuccess() {
        test.assert(true, "clicking cancel should close the delete post modal");
    });

    casper.thenClick("#publish-bar a.post-settings");
    casper.thenClick(".post-settings-menu a.delete");
    casper.waitUntilVisible("#modal-container", function onSuccess() {
        casper.thenClick("#modal-container .js-button-accept");
    });

    casper.waitForUrl(/ghost\/content\/$/, function onSuccess() {
        test.assert(true, "clicking the delete post button should bring us to the content page");
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

CasperTest.begin('Admin navigation bar is correct', 28, function suite(test) {
    casper.thenOpen(url + 'ghost/editor/', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/editor\/$/, "Ghost doesn't require login this time");
    });

    casper.then(function testNavItems() {
        test.assertExists('a.ghost-logo', 'Ghost logo home page link exists');
        test.assertEquals(this.getElementAttribute('a.ghost-logo', 'href'), '/', 'Ghost logo href is correct');

        test.assertExists('#main-menu li.content a', 'Content nav item exists');
        test.assertSelectorHasText('#main-menu li.content a', 'Content', 'Content nav item has correct text');
        test.assertEquals(this.getElementAttribute('#main-menu li.content a', 'href'), '/ghost/', 'Content href is correct');
         test.assertEval(function testContentIsNotActive() {
            return !document.querySelector('#main-menu li.content').classList.contains('active');
        }, 'Content nav item is not marked active');

        test.assertExists('#main-menu li.editor a', 'Editor nav item exists');
        test.assertSelectorHasText('#main-menu li.editor a', 'New Post', 'Editor nav item has correct text');
        test.assertEquals(this.getElementAttribute('#main-menu li.editor a', 'href'), '/ghost/editor/', 'Editor href is correct');
        test.assertEval(function testEditorIsNotActive() {
            return document.querySelector('#main-menu li.editor').classList.contains('active');
        }, 'Editor nav item is marked active');

        test.assertExists('#main-menu li.settings a', 'Settings nav item exists');
        test.assertSelectorHasText('#main-menu li.settings a', 'Settings', 'Settings nav item has correct text');
        test.assertEquals(this.getElementAttribute('#main-menu li.settings a', 'href'), '/ghost/settings/', 'Settings href is correct');
        test.assertEval(function testSettingsIsActive() {
            return !document.querySelector('#main-menu li.settings').classList.contains('active');
        }, 'Settings nav item is not marked active');
    });

    casper.then(function testUserMenuNotVisible() {
        test.assertExists('#usermenu', 'User menu nav item exists');
        test.assertNotVisible('#usermenu ul.overlay', 'User menu should not be visible');
    });

    casper.thenClick('#usermenu a');
    casper.waitForSelector('#usermenu ul.overlay', function then() {
        test.assertVisible('#usermenu ul.overlay', 'User menu should be visible');

        test.assertExists('#usermenu li.usermenu-profile a', 'Profile menu item exists');
        test.assertSelectorHasText('#usermenu li.usermenu-profile a', 'Your Profile', 'Profile menu item has correct text');
        test.assertEquals(this.getElementAttribute('li.usermenu-profile a', 'href'), '/ghost/settings/user/', 'Profile href is correct');

        test.assertExists('#usermenu li.usermenu-help a', 'Help menu item exists');
        test.assertSelectorHasText('#usermenu li.usermenu-help a', 'Help / Support', 'Help menu item has correct text');
        test.assertEquals(this.getElementAttribute('#usermenu li.usermenu-help a', 'href'), 'http://ghost.org/forum/', 'Help href is correct');

        test.assertExists('#usermenu li.usermenu-signout a', 'Sign Out menu item exists');
        test.assertSelectorHasText('#usermenu li.usermenu-signout a', 'Sign Out', 'Sign Out menu item has correct text');
        test.assertEquals(this.getElementAttribute('#usermenu li.usermenu-signout a', 'href'), '/ghost/signout/', 'Sign Out href is correct');
    });
});
