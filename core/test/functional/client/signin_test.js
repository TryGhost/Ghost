// # Signin Test
// Test that signin works, including testing our spam prevention mechanisms

/*globals CasperTest, casper, url, user, falseUser */

CasperTest.begin('Ghost admin will load login page', 4, function suite(test) {
    CasperTest.Routines.signout.run(test);
    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle('Sign In - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/signin\/$/, 'We should be presented with the signin page.');

        casper.then(function testLink() {
            var text = this.evaluate(function (selector) {
                return document.querySelector(selector).innerText;
            }, '.forgotten-link');

            casper.echoConcise('Text' + text);
            test.assertExists('.forgotten-link', '.forgotten-link exists');
            test.assertEquals(text, 'Forgot?', 'Forgotten text is correct');
        });
    });
}, true);

// Note, this test applies to a global redirect, which sends us to the standard admin.
CasperTest.begin('Redirects login to signin', 2, function suite(test) {
    CasperTest.Routines.signout.run(test);
    casper.start(url + 'ghost/login/', function testRedirect(response) {
        test.assertEquals(response.status, 200, 'Response status should be 200.');
        test.assertUrlMatch(/ghost\/signin\//, 'Should be redirected to /signin/.');
    });
}, true);

CasperTest.begin('Login limit is in place', 7, function suite(test) {
    CasperTest.Routines.signout.run(test);

    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle('Sign In - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque('.gh-signin',
        function then() {
            this.fillAndSave('#login', falseUser);
        },
        function onTimeout() {
            test.fail('Sign in form didn\'t fade in.');
        });

    casper.wait(2100, function doneWait() {
        this.fillAndSave('#login', falseUser);
    });

    casper.waitForText('remaining', function onSuccess() {
        test.assert(true, 'The login limit is in place.');
        test.assertSelectorDoesntHaveText('.gh-alert', '[object Object]');
        test.assertTextExists('password is incorrect');
        test.assertDoesntExist('.form-group.error input[name="identification"]', 'email field was highlighted');
        test.assertExists('.form-group.error input[name="password"]', 'password field was not highlighted');
    }, function onTimeout() {
        test.assert(false, 'We did not trip the login limit.');
    });
}, true);

CasperTest.begin('Can login to Ghost', 4, function suite(test) {
    CasperTest.Routines.signout.run(test);

    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle('Sign In - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque('.gh-signin', function then() {
        this.fillAndSave('#login', user);
    });

    casper.wait(2000);

    casper.waitForResource(/posts/, function testForDashboard() {
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
        test.assertExists('.gh-nav-main-content.active', 'Now we are on Content');
    }, function onTimeOut() {
        test.fail('Failed to signin');
    });
}, true);

CasperTest.begin('Authenticated user is redirected', 6, function suite(test) {
    CasperTest.Routines.signout.run(test);

    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle('Sign In - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque('' +
        '.gh-signin', function then() {
        this.fillAndSave('#login', user);
    });

    casper.wait(2000);

    casper.waitForResource(/posts/, function testForDashboard() {
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
        test.assertExists('.gh-nav-main-content.active', 'Now we are on Content');
    }, function onTimeOut() {
        test.fail('Failed to signin');
    });

    casper.thenOpenAndWaitForPageLoad('signin-authenticated', function testTitleAndUrl() {
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
        test.assertExists('.gh-nav-main-content.active', 'Now we are on Content');
    }, function onTimeOut() {
        test.fail('Failed to redirect');
    });
}, true);

CasperTest.begin('Validates unknown email for sign-in', 5, function suite(test) {
    CasperTest.Routines.signout.run(test);

    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle('Sign In - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque('.gh-signin',
        function testUnknownEmail() {
            this.fillAndSave('form.gh-signin', {
                identification: 'unknown@ghost.org',
                password: 'testing'
            });
        },
        function onTimeout() {
            test.fail('Login form didn\'t fade in.');
        });

    casper.waitForText('no user with that email address', function onSuccess() {
        test.assert(true, 'Unknown email error was shown');
        test.assertExists('.form-group.error input[name="identification"]', 'email field was not highlighted');
        test.assertDoesntExist('.form-group.error input[name="password"]', 'password field was highlighted');
    }, casper.failOnTimeout(test, 'Unknown email error was not shown'));
}, true);

CasperTest.begin('Validates missing details for sign-in', 11, function suite(test) {
    CasperTest.Routines.signout.run(test);

    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle('Sign In - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque('.gh-signin',
        function testMissingEverything() {
            this.fillAndSave('form.gh-signin', {
                identification: '',
                password: ''
            });
        },
        function onTimeout() {
            test.fail('Login form didn\'t fade in.');
        });

    casper.waitForText('fill out the form', function onSuccess() {
        test.assert(true, 'Missing details error was shown');
        test.assertExists('.form-group.error input[name="identification"]', 'email field was not highlighted');
        test.assertExists('.form-group.error input[name="password"]', 'password field was not highlighted');
    }, casper.failOnTimeout(test, 'Missing details error was not shown'));

    casper.then(function testMissingEmail() {
        this.fillAndSave('form.gh-signin', {
            identification: '',
            password: 'testing'
        });
    });

    casper.waitForText('fill out the form', function onSuccess() {
        test.assert(true, 'Missing details error was shown');
        test.assertExists('.form-group.error input[name="identification"]', 'email field was not highlighted');
        test.assertDoesntExist('.form-group.error input[name="password"]', 'password field was still highlighted');
    }, casper.failOnTimeout(test, 'Missing details error was not shown'));

    casper.then(function testMissingPassword() {
        this.fillAndSave('form.gh-signin', {
            identification: 'test@test.com',
            password: ''
        });
    });

    casper.waitForText('fill out the form', function onSuccess() {
        test.assert(true, 'Missing details error was shown');
        test.assertDoesntExist('.form-group.error input[name="identification"]', 'email field was still highlighted');
        test.assertExists('.form-group.error input[name="password"]', 'password field was not highlighted');
    }, casper.failOnTimeout(test, 'Missing details error was not shown'));
}, true);

CasperTest.begin('Validates missing details for forgotten password', 5, function suite(test) {
    CasperTest.Routines.signout.run(test);

    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle('Sign In - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque('.gh-signin',
        function testMissingEmail() {
            casper.fill('form.gh-signin', {
                identification: '',
                password: ''
            });
            casper.click('.forgotten-link');
        },
        function onTimeout() {
            test.fail('Login form didn\'t fade in.');
        });

    casper.waitForText('enter an email address', function onSuccess() {
        test.assert(true, 'Missing email error was shown');
        test.assertExists('.form-group.error input[name="identification"]', 'email field was not highlighted');
        test.assertDoesntExist('.form-group.error input[name="password"]', 'password field was highlighted');
    }, casper.failOnTimeout(test, 'Missing email error was not shown'));
}, true);

CasperTest.begin('Validates unknown email for forgotten password', 5, function suite(test) {
    CasperTest.Routines.signout.run(test);

    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle('Sign In - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque('.gh-signin',
        function testMissingEmail() {
            casper.fill('form.gh-signin', {
                identification: 'unknown@ghost.org',
                password: ''
            });
            casper.click('.forgotten-link');
        },
        function onTimeout() {
            test.fail('Login form didn\'t fade in.');
        });

    casper.waitForText('no user with that email address', function onSuccess() {
        test.assert(true, 'Unknown email error was shown');
        test.assertExists('.form-group.error input[name="identification"]', 'email field was not highlighted');
        test.assertDoesntExist('.form-group.error input[name="password"]', 'password field was highlighted');
    }, casper.failOnTimeout(test, 'Unknown email error was not shown'));
}, true);
