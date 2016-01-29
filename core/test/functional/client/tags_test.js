// # Settings Test
// Test the various tabs on the settings page

/*
    NOTE: These tests have been replaced with:
    core/client/tests/acceptance/settings/tags-test.js
    core/client/tests/integration/components/gh-tag-settings-form-test.js
*/

// CasperTest.begin('Tags screen is correct', 6, function suite(test) {
//     casper.thenOpenAndWaitForPageLoad('settings.tags', function testTitleAndUrl() {
//         test.assertTitle('Settings - Tags - Test Blog', 'Ghost admin has incorrect title');
//         test.assertUrlMatch(/ghost\/settings\/tags\/$/, 'Landed on the correct URL');
//     });
//
//     casper.then(function tagsScreenHasContent() {
//         test.assertExists('.settings-tags .settings-tag', 'Has a tag');
//         test.assertSelectorHasText('.settings-tag .tag-title', 'Getting Started', 'Tag title is displayed');
//         test.assertSelectorHasText('.settings-tag .label', '/getting-started', 'Tag slug is displayed');
//         test.assertSelectorHasText('.settings-tag .tags-count', '1', 'Number of posts using tag is displayed');
//     });
// });
//
// CasperTest.begin('Tag creation', 16, function suite(test) {
//     casper.thenOpenAndWaitForPageLoad('settings.tags');
//
//     casper.thenClick('.view-actions .btn-green');
//
//     casper.waitForOpaque('.tag-settings-pane', function onSuccess() {
//         test.assert(true, 'tag settings menu is visible after clicking New Tag button');
//     });
//
//     casper.then(function enterName() {
//         casper.sendKeys('#tag-name', 'Test Tag', {keepFocus: true});
//     });
//     casper.thenClick('#tag-description');
//     casper.waitForResource(/\/tags\//, function onSuccess() {
//         test.assert(true, 'Losing focus on the name field triggered a save request');
//     }, function doneWaiting() {
//         test.fail('Name field did not trigger a save request on blur');
//     });
//
//     casper.waitForText('/test-tag').then(function verifyUIUpdates() {
//         test.assertField('url', 'test-tag');
//         test.assertSelectorHasText('.ghost-url-preview', '127.0.0.1:2369/tag/test-tag');
//         test.assertSelectorHasText('.settings-tags .tag-title', 'Test Tag');
//         test.assertSelectorHasText('.settings-tags .label', '/test-tag');
//         test.assertSelectorHasText('.settings-tags .tags-count', '0');
//     });
//
//     casper.then(function testMissingNameValidation() {
//         casper.fill('.tag-settings-pane form', {
//             name: ''
//         });
//         casper.waitForText('You must specify a name for the tag.', function onSuccess() {
//             test.assertExists('.form-group.error input[name="name"]');
//             test.assert(true, 'Error displayed for missing tag name');
//         }, function doneWaiting() {
//             test.fail('Error not displayed for missing tag name');
//         });
//     });
//
//     casper.then(function testNameStartsWithCommaValidation() {
//         casper.fill('.tag-settings-pane form', {
//             name: ',, commas'
//         });
//         casper.waitForText('Tag names can\'t start with commas.', function onSuccess() {
//             test.assertExists('.form-group.error input[name="name"]');
//             test.assert(true, 'Error displayed for tag name starting with comma');
//         }, function doneWaiting() {
//             test.fail('Error not displayed for tag name starting with comma');
//         });
//     });
//
//     casper.thenClick('.meta-data-button');
//
//     casper.waitForOpaque('.tag-meta-settings-pane', function onSuccess() {
//         test.assert(true, 'tags meta settings menu is visible after clicking Meta Data button');
//     });
//
//     casper.then(function testMetaTitleValidation() {
//         casper.fill('.tag-meta-settings-pane form', {
//             meta_title: new Array(152).join('a')
//         });
//         casper.waitForText('Meta Title cannot be longer than 150 characters.', function onSuccess() {
//             test.assertExists('.form-group.error input[name="meta_title"]');
//             test.assert(true, 'Error displayed when meta title is too long');
//         }, function doneWaiting() {
//             test.fail('Error not displayed when meta title is too long');
//         });
//     });
//
//     casper.then(function testMetaDescriptionValidation() {
//         casper.fill('.tag-meta-settings-pane form', {
//             meta_description: new Array(202).join('a')
//         });
//         casper.waitForText('Meta Description cannot be longer than 200 characters.', function onSuccess() {
//             test.assertExists('.form-group.error textarea[name="meta_description"]');
//             test.assert(true, 'Error displayed when meta description is too long');
//         }, function doneWaiting() {
//             test.fail('Error not displayed when meta description is too long');
//         });
//     });
// });
//
// CasperTest.begin('Tag editing', 3, function suite(test) {
//     casper.thenOpenAndWaitForPageLoad('settings.tags');
//
//     casper.thenClick('.settings-tags .settings-tag .tag-edit-button');
//
//     casper.waitForOpaque('.tag-settings-pane', function onSuccess() {
//         test.assert(true, 'tag settings menu is visible after clicking tag');
//     });
//
//     casper.then(function testNameValidation() {
//         casper.fill('.tag-settings-pane form', {
//             name: ''
//         });
//         casper.waitForText('You must specify a name for the tag.', function onSuccess() {
//             test.assertExists('.form-group.error input[name="name"]');
//             test.assert(true, 'Error displayed for missing tag name');
//         }, function doneWaiting() {
//             test.fail('Error not displayed for missing tag name');
//         });
//     });
// });
