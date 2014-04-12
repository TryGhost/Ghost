/*globals casper, __utils__, url */

CasperTest.begin("Settings screen is correct", 18, function suite(test) {
    casper.thenOpen(url + "ghost/settings/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/general\/$/, "Ghost doesn't require login this time");
    });

    casper.then(function testViews() {
        test.assertExists(".wrapper", "Settings main view is present");
        test.assertExists(".settings-sidebar", "Settings sidebar view is present");
        test.assertExists(".settings-menu", "Settings menu is present");
        test.assertExists(".settings-menu .general", "General tab is present");
        test.assertExists(".settings-menu .users", "Users tab is present");
        test.assertExists(".settings-menu .apps", "Apps is present");
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
            test.fail("Saving the user pane triggered another settings pane to save");
        }
    }

    function handleSettingsRequest(requestData, request) {
        // make sure we only get requests from the user pane
        if (requestData.url.indexOf('users/') !== -1) {
            test.fail("Saving a settings pane triggered the user pane to save");
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
        test.fail("Saving the user pane did not result in a notification");
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
        test.fail("Saving the general pane did not result in a notification");
    });

    casper.then(function checkSettingsWereSaved() {
        casper.removeListener('resource.requested', handleSettingsRequest);
    });

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assert(true, 'Got success notification');
    }, function onTimeout() {
        test.assert(false, 'No success notification :(');
    });

    CasperTest.beforeDone(function () {
        casper.removeListener('resource.requested', handleUserRequest);
        casper.removeListener('resource.requested', handleSettingsRequest);
    });
});

CasperTest.begin('Ensure general blog title field length validation', 3, function suite(test) {
    casper.thenOpen(url + "ghost/settings/general/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/general\/$/, "Ghost doesn't require login this time");
    });

    casper.waitForSelector('#general', function then() {
        this.fill("form#settings-general", {
            'general[title]': new Array(152).join('a')
        });
    });

    casper.thenClick('#general .button-save');

    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
        test.assertSelectorHasText('.notification-error', 'too long');
    }, function onTimeout() {
        test.fail('Blog title length error did not appear');
    }, 2000);
});

CasperTest.begin('Ensure general blog description field length validation', 3, function suite(test) {
    casper.thenOpen(url + "ghost/settings/general/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/general\/$/, "Ghost doesn't require login this time");
    });

    casper.waitForSelector('#general', function then() {
        this.fillSelectors("form#settings-general", {
            '#blog-description': new Array(202).join('a')
        });
    });

    casper.thenClick('#general .button-save');

    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
        test.assertSelectorHasText('.notification-error', 'too long');
    }, function onTimeout() {
        test.fail('Blog description length error did not appear');
    }, 2000);
});

CasperTest.begin('Ensure image upload modals display correctly', 6, function suite(test) {
    casper.thenOpen(url + "ghost/settings/general/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/general\/$/, "Ghost doesn't require login this time");
    });

    function assertImageUploaderModalThenClose() {
        test.assertExists('.js-drop-zone.image-uploader', 'Image drop zone modal renders correctly');
        this.click('#modal-container .js-button-accept');
        casper.waitForSelector('.notification-success', function onSuccess() {
            test.assert(true, 'Got success notification');
        }, function onTimeout() {
            test.fail('No success notification');
        }, 1000);
    };

    // Test Blog Logo Upload Button
    casper.waitForSelector('#general', function then() {
        this.click('#general .js-modal-logo');
    });

    casper.waitForSelector('#modal-container .modal-content', assertImageUploaderModalThenClose,
        function onTimeout() {
            test.fail('No upload logo modal container appeared');
        }, 1000);

    // Test Blog Cover Upload Button
    casper.then(function() {
        this.click('#general .js-modal-cover');
    });

    casper.waitForSelector('#modal-container .modal-content', assertImageUploaderModalThenClose,
        function onTimeout() {
            test.fail('No upload cover modal container appeared');
        }, 1000);
});

CasperTest.begin("User settings screen validates email", 6, function suite(test) {
    var email, brokenEmail;

    casper.thenOpen(url + "ghost/settings/user/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/user\/$/, "Ghost doesn't require login this time");
    });

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
});

CasperTest.begin('Ensure postsPerPage number field form validation', 3, function suite(test) {
    casper.thenOpen(url + "ghost/settings/general/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/general\/$/, "Ghost doesn't require login this time");
    });

    casper.waitForSelector('#general', function then() {
        this.fill("form#settings-general", {
            'general[postsPerPage]': 'notaninteger'
        });
    });

    casper.thenClick('#general .button-save');

    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
        test.assertSelectorHasText('.notification-error', 'use a number');
    }, function onTimeout() {
        test.fail('postsPerPage error did not appear');
    }, 2000);
});

CasperTest.begin('Ensure postsPerPage max of 1000', 3, function suite(test) {
    casper.thenOpen(url + "ghost/settings/general/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/general\/$/, "Ghost doesn't require login this time");
    });

    casper.waitForSelector('#general', function then() {
        this.fill("form#settings-general", {
            'general[postsPerPage]': '1001'
        });
    });

    casper.thenClick('#general .button-save');

    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
        test.assertSelectorHasText('.notification-error', 'use a number less than 1000');
    }, function onTimeout() {
        test.fail('postsPerPage max error did not appear');
    }, 2000);
});

CasperTest.begin('Ensure postsPerPage min of 0', 3, function suite(test) {
    casper.thenOpen(url + "ghost/settings/general/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/general\/$/, "Ghost doesn't require login this time");
    });

    casper.waitForSelector('#general', function then() {
        this.fill("form#settings-general", {
            'general[postsPerPage]': '-1'
        });
    });

    casper.thenClick('#general .button-save');

    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
        test.assertSelectorHasText('.notification-error', 'use a number greater than 0');
    }, function onTimeout() {
        test.fail('postsPerPage min error did not appear');
    }, 2000);
});

CasperTest.begin("User settings screen shows remaining characters for Bio properly", 4, function suite(test) {

    function getRemainingBioCharacterCount() {
        return casper.getHTML('.word-count');
    }

    casper.thenOpen(url + "ghost/settings/user/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/user\/$/, "Ghost doesn't require login this time");
    });

    casper.then(function checkCharacterCount() {
        test.assert(getRemainingBioCharacterCount() === '200', 'Bio remaining characters is 200');
    });

    casper.then(function setBioToValid() {
        casper.fillSelectors('.user-profile', {
                '#user-bio': 'asdf\n' // 5 characters
            }, false);
    });

    casper.then(function checkCharacterCount() {
        test.assert(getRemainingBioCharacterCount() === '195', 'Bio remaining characters is 195');
    });
});

CasperTest.begin('Ensure user bio field length validation', 3, function suite(test) {
    casper.thenOpen(url + "ghost/settings/user/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/user\/$/, "Ghost doesn't require login this time");
    });

    casper.waitForSelector('#user', function then() {
        this.fillSelectors("form.user-profile", {
            '#user-bio': new Array(202).join('a')
        });
    });

    casper.thenClick('#user .button-save');

    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
        test.assertSelectorHasText('.notification-error', 'is too long');
    }, function onTimeout() {
        test.fail('Bio field length error did not appear');
    }, 2000);
});

CasperTest.begin('Ensure user url field validation', 3, function suite(test) {
    casper.thenOpen(url + "ghost/settings/user/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/user\/$/, "Ghost doesn't require login this time");
    });

    casper.waitForSelector('#user', function then() {
        this.fillSelectors("form.user-profile", {
            '#user-website': 'notaurl'
        });
    });

    casper.thenClick('#user .button-save');

    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
        test.assertSelectorHasText('.notification-error', 'use a valid url');
    }, function onTimeout() {
        test.fail('Url validation error did not appear');
    }, 2000);
});

CasperTest.begin('Ensure user location field length validation', 3, function suite(test) {
    casper.thenOpen(url + "ghost/settings/user/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/user\/$/, "Ghost doesn't require login this time");
    });

    casper.waitForSelector('#user', function then() {
        this.fillSelectors("form.user-profile", {
            '#user-location': new Array(1002).join('a')
        });
    });

    casper.thenClick('#user .button-save');

    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
        test.assertSelectorHasText('.notification-error', 'is too long');
    }, function onTimeout() {
        test.fail('Location field length error did not appear');
    }, 2000);
});

CasperTest.begin('Admin navigation bar is correct', 28, function suite(test) {
    casper.thenOpen(url + 'ghost/settings/', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/settings\/general\/$/, "Ghost doesn't require login this time");
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
            return !document.querySelector('#main-menu li.editor').classList.contains('active');
        }, 'Editor nav item is not marked active');

        test.assertExists('#main-menu li.settings a', 'Settings nav item exists');
        test.assertSelectorHasText('#main-menu li.settings a', 'Settings', 'Settings nav item has correct text');
        test.assertEquals(this.getElementAttribute('#main-menu li.settings a', 'href'), '/ghost/settings/', 'Settings href is correct');
        test.assertEval(function testSettingsIsActive() {
            return document.querySelector('#main-menu li.settings').classList.contains('active');
        }, 'Settings nav item is marked active');
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
        test.assertEquals(this.getElementAttribute('#usermenu li.usermenu-profile a', 'href'), '/ghost/settings/user/', 'Profile href is correct');

        test.assertExists('#usermenu li.usermenu-help a', 'Help menu item exists');
        test.assertSelectorHasText('#usermenu li.usermenu-help a', 'Help / Support', 'Help menu item has correct text');
        test.assertEquals(this.getElementAttribute('#usermenu li.usermenu-help a', 'href'), 'http://ghost.org/forum/', 'Help href is correct');

        test.assertExists('#usermenu li.usermenu-signout a', 'Sign Out menu item exists');
        test.assertSelectorHasText('#usermenu li.usermenu-signout a', 'Sign Out', 'Sign Out menu item has correct text');
        test.assertEquals(this.getElementAttribute('#usermenu li.usermenu-signout a', 'href'), '/ghost/signout/', 'Sign Out href is correct');
    });
});
