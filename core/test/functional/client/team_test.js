// # Settings Test

/*globals CasperTest, casper */

// These classes relate to elements which only appear when a given tab is loaded.
// These are used to check that a switch to a tab is complete, or that we are on the right tab.
var generalTabDetector = '.gh-nav-settings-general.active',
    usersTabDetector = '.gh-nav-main-users';

CasperTest.begin('Team tab is correct', 4, function suite(test) {
    // TODO make sure settings nav tests are refactored into app_test.js

    casper.then(function testSwitchingTabs() {
        casper.thenClick('.gh-nav-main-users');
        casper.waitForSelector(usersTabDetector, function then() {
            // assert that the right menu item is active
            test.assertExists('.gh-nav-main-users.active', 'Users link is active');
            test.assertDoesntExist('.gh-nav-settings-general.active', 'General link is not active');
        }, casper.failOnTimeout(test, 'waitForSelector `usersTabDetector` timed out'));

        casper.thenClick('.gh-nav-settings-general');
        casper.waitForSelector(generalTabDetector, function then() {
            // assert that the right menu item is active
            test.assertExists('.gh-nav-settings-general.active', 'General link is active');
            test.assertDoesntExist('.gh-nav-main-users.active', 'User link is not active');
        }, casper.failOnTimeout(test, 'waitForSelector `generalTabDetector` timed out'));
    });
});

CasperTest.begin('Users screen is correct', 9, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('settings.general');
    casper.thenTransitionAndWaitForScreenLoad('team', function canTransition() {
        test.assert(true, 'Can transition to users screen from settings.general');
        test.assertUrlMatch(/ghost\/team\/$/, 'team transitions to correct url');
    });
    casper.then(function usersScreenHasContent() {
        test.assertSelectorHasText('.team .user-list .user-list-title', 'Active users', 'active users text is correct');
        test.assertExists('.team .user-list .user-list-item', 'Has an active user');
        test.assertSelectorHasText('.team .user-list-item .name', 'Test User', 'test user text is correct');
        test.assertExists('.team .user-list-item .role-label.owner', 'First user has owner role displayed');

        test.assertExists('.view-actions .btn-green', 'Add user button is on page.');
    });
    casper.thenClick('.view-actions .btn-green');
    casper.waitForOpaque('.invite-new-user .modal-content', function then() {
        test.assertEval(function testOwnerRoleNotAnOption() {
            var options = document.querySelectorAll('.invite-new-user #new-user-role select option'),
                i = 0;
            for (; i < options.length; i = i + 1) {
                if (options[i].text === 'Owner') {
                    return false;
                }
            }
            return true;
        }, '"Owner" is not a role option for new users');
    });

    // role options get loaded asynchronously; give them a chance to come in
    casper.waitForSelector('.invite-new-user #new-user-role select option', function then() {
        test.assertEval(function authorIsSelectedByDefault() {
            var options = document.querySelectorAll('.invite-new-user #new-user-role select option'),
                i = 0;
            for (; i < options.length; i = i + 1) {
                if (options[i].selected) {
                    return options[i].text === 'Author';
                }
            }
            return false;
        }, 'The "Author" role is selected by default when adding a new user');
    });
});

// ### User settings tests
CasperTest.begin('Can save settings', 5, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('team.user', function testTitleAndUrl() {
        test.assertTitle('Team - User - Test Blog', 'Ghost Admin title is correct');
        test.assertUrlMatch(/ghost\/team\/test\/$/, 'team.user has correct URL');
    });

    function handleUserRequest(requestData) {
        // make sure we only get requests from the user pane
        if (requestData.url.indexOf('settings/') !== -1) {
            test.fail('Saving the user pane triggered another settings pane to save');
        }
    }

    function handleSettingsRequest(requestData) {
        // make sure we only get requests from the user pane
        if (requestData.url.indexOf('team/') !== -1) {
            test.fail('Saving a settings pane triggered the user pane to save');
        }
    }

    casper.then(function listenForRequests() {
        casper.on('resource.requested', handleUserRequest);
    });

    casper.thenClick('.btn-blue');
    casper.waitForResource(/\/users\/\d\/\?include=roles/, function onSuccess() {
        test.assert(true, 'Saving the user pane triggered a save request');
    }, function doneWaiting() {
        test.fail('Saving the user pane did not trigger a save request');
    });

    casper.then(function checkUserWasSaved() {
        casper.removeListener('resource.requested', handleUserRequest);
    });

    casper.thenClick('.gh-nav-settings-general').then(function testTransitionToGeneral() {
        casper.waitForSelector(generalTabDetector, function then() {
                casper.on('resource.requested', handleSettingsRequest);
                test.assertEval(function testGeneralIsActive() {
                    return document.querySelector('.gh-nav-settings-general').classList.contains('active');
                }, 'general tab is marked active');
            },
            casper.failOnTimeout(test, 'waitForSelector `usersTabDetector` timed out'));
    });

    casper.thenClick('.btn-blue');
    casper.waitForResource(/\/users\/\d\/\?include=roles/, function onSuccess() {
        test.assert(true, 'Saving the user pane triggered a save request');
    }, function doneWaiting() {
        test.fail('Saving the user pane did not trigger a save request');
    });

    casper.then(function checkSettingsWereSaved() {
        casper.removeListener('resource.requested', handleSettingsRequest);
    });

    CasperTest.beforeDone(function () {
        casper.removeListener('resource.requested', handleUserRequest);
        casper.removeListener('resource.requested', handleSettingsRequest);
    });
});

CasperTest.begin('User settings screen resets all whitespace slug to original value', 3, function suite(test) {
    var slug;

    casper.thenOpenAndWaitForPageLoad('team.user', function testTitleAndUrl() {
        test.assertTitle('Team - User - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/team\/test\/$/, 'Ghost doesn\'t require login this time');
    });

    casper.then(function getSlugValue() {
        slug = this.evaluate(function () {
            return document.querySelector('#user-slug').value;
        });
    });

    casper.then(function changeSlugInput() {
        casper.fillSelectors('.user-profile', {
            '#user-slug': '   '
        }, false);
    });

    casper.thenClick('body');

    casper.then(function checkSlugInputValue() {
        casper.wait(250);
        test.assertField('user', slug, 'user slug is correct');
    });
});

CasperTest.begin('User settings screen change slug handles duplicate slug', 4, function suite(test) {
    var slug;

    casper.thenOpenAndWaitForPageLoad('team.user', function testTitleAndUrl() {
        test.assertTitle('Team - User - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/team\/test\/$/, 'Ghost doesn\'t require login this time');
    });

    casper.then(function getSlugValue() {
        slug = this.evaluate(function () {
            return document.querySelector('#user-slug').value;
        });
    });

    casper.then(function changeSlug() {
        casper.fillSelectors('.user-profile', {
            '#user-slug': slug + '!'
        }, false);
    });

    casper.thenClick('body');

    casper.waitForResource(/\/slugs\/user\//, function testGoodResponse(resource) {
        test.assert(resource.status < 400, 'resource.status < 400');
    });

    casper.then(function checkSlugInputValue() {
        test.assertField('user', slug, 'user slug is correct');
    });
});

CasperTest.begin('User settings screen validates email', 4, function suite(test) {
    var email;

    casper.thenOpenAndWaitForPageLoad('team.user', function testTitleAndUrl() {
        test.assertTitle('Team - User - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/team\/test\/$/, 'Ghost doesn\'t require login this time');
    });

    casper.then(function getEmail() {
        email = this.evaluate(function () {
            return document.querySelector('#user-email').value;
        });
    });

    casper.then(function setEmailToInvalid() {
        var brokenEmail = email.replace('.', '-');
        this.fillAndSave('.user-profile', {
            email: brokenEmail
        });
    });

    casper.waitForText('Please supply a valid email address', function onSuccess() {
        test.assert(true, 'Invalid email error was shown');
    }, casper.failOnTimeout(test, 'Invalid email error was not shown'));

    casper.then(function resetEmailToValid() {
        casper.fillSelectors('.user-profile', {
            '#user-email': email
        }, false);
    });

    casper.then(function checkEmailErrorWasCleared() {
        test.assertTextDoesntExist('Please supply a valid email address', 'Invalid email error was not cleared');
    });

    casper.thenClick('.view-actions .btn-blue');

    casper.waitForResource(/users/);
});

// TODO: user needs to be loaded whenever it is edited (multi user)
CasperTest.begin('User settings screen shows remaining characters for Bio properly', 4, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('team.user', function testTitleAndUrl() {
        test.assertTitle('Team - User - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/team\/test\/$/, 'Ghost doesn\'t require login this time');
    });

    function getRemainingBioCharacterCount() {
        return casper.getHTML('.word-count');
    }

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
    casper.thenOpenAndWaitForPageLoad('team.user', function testTitleAndUrl() {
        test.assertTitle('Team - User - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/team\/test\/$/, 'Ghost doesn\'t require login this time');
    });

    casper.then(function setBioToInvalid() {
        this.fillSelectors('form.user-profile', {
            '#user-bio': new Array(202).join('a')
        });
    });

    casper.thenClick('.view-actions .btn-blue');

    casper.waitForText('Bio is too long', function onSuccess() {
        test.assert(true, 'Bio too long error was shown');
    }, casper.failOnTimeout(test, 'Bio too long error was not shown'));
});

CasperTest.begin('Ensure user url field validation', 3, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('team.user', function testTitleAndUrl() {
        test.assertTitle('Team - User - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/team\/test\/$/, 'Ghost doesn\'t require login this time');
    });

    casper.then(function setWebsiteToInvalid() {
        this.fillSelectors('form.user-profile', {
            '#user-website': 'notaurl'
        });
    });

    casper.thenClick('.view-actions .btn-blue');

    casper.waitForText('Website is not a valid url', function onSuccess() {
        test.assert(true, 'Website invalid error was shown');
    }, casper.failOnTimeout(test, 'Website invalid error was not shown'));
});

CasperTest.begin('Ensure user location field length validation', 3, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('team.user', function testTitleAndUrl() {
        test.assertTitle('Team - User - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/team\/test\/$/, 'Ghost doesn\'t require login this time');
    });

    casper.then(function setLocationToInvalid() {
        this.fillSelectors('form.user-profile', {
            '#user-location': new Array(1002).join('a')
        });
    });

    casper.thenClick('.view-actions .btn-blue');

    casper.waitForText('Location is too long', function onSuccess() {
        test.assert(true, 'Location too long error was shown');
    }, casper.failOnTimeout(test, 'Location too long error was not shown'));
});
