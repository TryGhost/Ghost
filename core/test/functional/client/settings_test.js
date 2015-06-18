// # Settings Test
// Test the various tabs on the settings page

/*globals CasperTest, casper */

// These classes relate to elements which only appear when a given tab is loaded.
// These are used to check that a switch to a tab is complete, or that we are on the right tab.
var generalTabDetector = '.gh-nav-settings-general.active';

CasperTest.begin('Settings screen is correct', 5, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('settings.general', function testTitleAndUrl() {
        test.assertTitle('Settings - General - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/settings\/general\/$/, 'Landed on the correct URL');
    });

    casper.then(function testViews() {
        test.assertExists('.gh-main .gh-view', 'Settings content view is present');
        test.assertExists(generalTabDetector, 'Form is present');
        test.assertSelectorHasText('.view-title', 'General', 'Title is "General"');
    });
});

// ## General settings tests
CasperTest.begin('General settings pane is correct', 4, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('settings.general', function testTitleAndUrl() {
        test.assertUrlMatch(/ghost\/settings\/general\/$/, 'Landed on the correct URL');
    });

    function assertImageUploaderModalThenClose() {
        test.assertSelectorHasText('.description', 'Add image', '.description has the correct text');
        casper.click('.modal-container .js-button-accept');
    }

    // Ensure image upload modals display correctly

    // Test Blog Logo Upload Button
    casper.waitForSelector('.js-modal-logo', function () {
        casper.click('.js-modal-logo');
    });

    casper.waitForSelector('.modal-container .modal-content .js-drop-zone .description',
        assertImageUploaderModalThenClose, casper.failOnTimeout(test, 'No upload logo modal container appeared'));

    // Test Blog Cover Upload Button
    casper.waitForSelector('.js-modal-cover', function () {
        casper.click('.js-modal-cover');
    });

    casper.waitForSelector('.modal-container .modal-content .js-drop-zone .description',
        assertImageUploaderModalThenClose, casper.failOnTimeout(test, 'No upload cover modal container appeared'));

    function handleSettingsRequest(requestData) {
        // make sure we only get requests from the user pane
        if (requestData.url.indexOf('users/') !== -1) {
            test.fail('Saving a settings pane triggered the user pane to save');
        }
    }

    casper.then(function listenForRequests() {
        casper.on('resource.requested', handleSettingsRequest);
    });

    // Ensure can save
    casper.waitForSelector('header .btn-blue').then(function () {
        casper.thenClick('header .btn-blue');
        casper.waitForResource('settings/', function onSuccess() {
            test.assert(true, 'Settings were saved');
        }, function doneWaiting() {
            test.fail('Settings were not saved');
        });
    });

    casper.then(function stopListeningForRequests() {
        casper.removeListener('resource.requested', handleSettingsRequest);
    });
});

// ## General settings validations tests
// // TODO: Change number of tests back to 6 once the commented-out tests are fixed
CasperTest.begin('General settings validation is correct', 4, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('settings.general', function testTitleAndUrl() {
        test.assertTitle('Settings - General - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/settings\/general\/$/, 'Landed on the correct URL');
    });

    // Ensure general blog title field length validation
    casper.fillAndSave('form#settings-general', {
        'general[title]': new Array(152).join('a')
    });

    // TODO: review once inline-validations are implemented
    casper.waitForSelectorTextChange('.gh-notification-red', function onSuccess() {
        test.assertSelectorHasText('.gh-notification-red', 'too long', '.gh-notification-red has correct text');
    }, casper.failOnTimeout(test, 'Blog title length error did not appear'), 2000);

    casper.thenClick('.gh-alert-close');

    // Ensure general blog description field length validation
    casper.fillAndSave('form#settings-general', {
        'general[description]': new Array(202).join('a')
    });

    // TODO: review once inline-validations are implemented
    casper.waitForSelectorTextChange('.gh-notification-red', function onSuccess() {
        test.assertSelectorHasText('.gh-notification-red', 'too long', '.gh-notification-red has correct text');
    }, casper.failOnTimeout(test, 'Blog description length error did not appear'));

    casper.thenClick('.gh-alert-close');

    // TODO move these to ember tests, note: async issues - field will be often be null without a casper.wait
    // Check postsPerPage autocorrect
    casper.fillAndSave('form#settings-general', {
        'general[postsPerPage]': 'notaninteger'
    });

    casper.wait(2000);

    casper.then(function checkSlugInputValue() {
        test.assertField('general[postsPerPage]', '5', 'posts per page is set correctly');
    });

    casper.fillAndSave('form#settings-general', {
        'general[postsPerPage]': '1001'
    });

    casper.wait(2000);

    casper.then(function checkSlugInputValue() {
        test.assertField('general[postsPerPage]', '5', 'posts per page is set correctly');
    });
});
