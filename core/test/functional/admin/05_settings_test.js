/*globals casper, __utils__, url */

casper.test.begin("Settings screen is correct", 15, function suite(test) {
    test.filename = "settings_test.png";

    casper.start(url + "ghost/settings/", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/general\/$/, "Ghost doesn't require login this time");
    }).viewport(1280, 1024);

    casper.then(function testViews() {
        test.assertExists(".wrapper", "Settings main view is present");
        test.assertExists(".settings-sidebar", "Settings sidebar view is present");
        test.assertExists(".settings-menu", "Settings menu is present");
        test.assertExists(".wrapper", "Settings main view is present");
        test.assertExists(".settings-content", "Settings content view is present");
        test.assertEval(function testGeneralIsActive() {
            return document.querySelector('.settings-menu .general').classList.contains('active');
        }, "general tab is marked active");
        test.assertEval(function testContentIsGeneral() {
            return document.querySelector('.settings-content').id === 'general';
        }, "loaded content is general screen");
    });

    // test the user tab
    casper.thenClick('.settings-menu .users');
    casper.waitForSelector('#user', function then() {
        test.assertEval(function testGeneralIsNotActive() {
            return !document.querySelector('.settings-menu .general').classList.contains('active');
        }, "general tab is not marked active");
        test.assertEval(function testUserIsActive() {
            return document.querySelector('.settings-menu .users').classList.contains('active');
        }, "user tab is marked active");
        test.assertEval(function testContentIsUser() {
            return document.querySelector('.settings-content').id === 'user';
        }, "loaded content is user screen");
    }, function onTimeOut() {
        test.fail('User screen failed to load');
    });

    function handleUserRequest(requestData, request) {
        // make sure we only get requests from the user pane
        if (requestData.url.indexOf('settings/') !== -1) {
            casper.test.fail("Saving the user pane triggered another settings pane to save");
        }
    }

    function handleSettingsRequest(requestData, request) {
        // make sure we only get requests from the user pane
        if (requestData.url.indexOf('users/') !== -1) {
            casper.test.fail("Saving a settings pane triggered the user pane to save");
        }
    }

    casper.then(function listenForRequests() {
        casper.on('resource.requested', handleUserRequest);
    });

    casper.thenClick('#user .button-save');
    casper.waitFor(function successNotification() {
        return this.evaluate(function () {
            return document.querySelectorAll('.js-bb-notification section').length > 0;
        });
    }, function doneWaiting() {

    }, function waitTimeout() {
        casper.test.fail("Saving the user pane did not result in a notification");
    });

    casper.then(function checkUserWasSaved() {
        casper.removeListener('resource.requested', handleUserRequest);
    });

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assert(true, 'Got success notification');
    }, function onTimeout() {
        test.assert(false, 'No success notification :(');
    });

    casper.thenClick('#main-menu .settings a').then(function testOpeningSettingsTwice() {
        casper.on('resource.requested', handleSettingsRequest);
        test.assertEval(function testUserIsActive() {
            return document.querySelector('.settings-menu .general').classList.contains('active');
        }, "general tab is marked active");

    });

    casper.thenClick('#general .button-save').waitFor(function successNotification() {
        return this.evaluate(function () {
            return document.querySelectorAll('.js-bb-notification section').length > 0;
        });
    }, function doneWaiting() {

    }, function waitTimeout() {
        casper.test.fail("Saving the general pane did not result in a notification");
    });

    casper.then(function checkSettingsWereSaved() {
        casper.removeListener('resource.requested', handleSettingsRequest);
    });

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assert(true, 'Got success notification');
    }, function onTimeout() {
        test.assert(false, 'No success notification :(');
    });

    casper.run(function () {
        casper.removeListener('resource.requested', handleUserRequest);
        casper.removeListener('resource.requested', handleSettingsRequest);
        test.done();
    });
});

casper.test.begin("User settings screen validates email", 6, function suite(test) {
    var email, brokenEmail;

    test.filename = "user_settings_test.png";

    casper.start(url + "ghost/settings/user/", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/user\/$/, "Ghost doesn't require login this time");
    }).viewport(1280, 1024);

    casper.then(function setEmailToInvalid() {
        email = casper.getElementInfo('#user-email').attributes.value;
        brokenEmail = email.replace('.', '-');

        casper.fillSelectors('.user-profile', {
            '#user-email': brokenEmail
        }, false);
    });

    casper.thenClick('#user .button-save');

    casper.waitForResource('/users/');

    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assert(true, 'Got error notification');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'No error notification :(');
    });

    casper.then(function resetEmailToValid() {
        casper.fillSelectors('.user-profile', {
            '#user-email': email
        }, false);
    });

    casper.thenClick('#user .button-save');

    casper.waitForResource(/users/);

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assert(true, 'Got success notification');
        test.assertSelectorDoesntHaveText('.notification-success', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'No success notification :(');
    });

    casper.run(function () {
        test.done();
    });
});