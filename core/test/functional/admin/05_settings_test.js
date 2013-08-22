/*globals casper, __utils__, url */

casper.test.begin("Settings screen is correct", 19, function suite(test) {

    casper.test.filename = "settings_test.png";

    casper.start(url + "ghost/settings", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertEquals(this.getCurrentUrl(), url + "ghost/settings/general", "Ghost doesn't require login this time");
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

    // test the publishing / content tab
    casper.thenClick('.settings-menu .publishing', function then() {
        test.assertEval(function testGeneralIsNotActive() {
            return !document.querySelector('.settings-menu .general').classList.contains('active');
        }, "general tab is not marked active");
        test.assertEval(function testContentIsActive() {
            return document.querySelector('.settings-menu .publishing').classList.contains('active');
        }, "content tab is marked active");
        test.assertEval(function testContentIsContent() {
            return document.querySelector('.settings-content').id === 'content';
        }, "loaded content is content screen");
    });

    // test the user tab
    casper.thenClick('.settings-menu .users', function then() {
        test.assertEval(function testGeneralIsNotActive() {
            return !document.querySelector('.settings-menu .general').classList.contains('active');
        }, "general tab is not marked active");
        test.assertEval(function testContentIsNotActive() {
            return !document.querySelector('.settings-menu .publishing').classList.contains('active');
        }, "content tab is marked active");
        test.assertEval(function testUserIsActive() {
            return document.querySelector('.settings-menu .users').classList.contains('active');
        }, "user tab is marked active");
        test.assertEval(function testContentIsUser() {
            return document.querySelector('.settings-content').id === 'user';
        }, "loaded content is user screen");
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

    casper.thenClick('#user .button-save').waitFor(function successNotification() {
        return this.evaluate(function () {
            return document.querySelectorAll('.js-bb-notification section').length > 0;
        });
    }, function doneWaiting() {

    }, function waitTimeout() {
        casper.test.fail("Saving the user pane did not result in a notification");
    });

    casper.then(function checkUserWasSaved() {
        casper.removeListener('resource.requested', handleUserRequest);
        test.assertExists('.notification-success', 'got success notification');
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
        test.assertExists('.notification-success', 'got success notification');
    });

    casper.run(function () {
        casper.removeListener('resource.requested', handleUserRequest);
        casper.removeListener('resource.requested', handleSettingsRequest);
        test.done();
    });
});