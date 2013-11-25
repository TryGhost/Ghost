/*globals casper, __utils__, url, user, falseUser */

CasperTest.begin('Ensure Session is Killed', 1, function suite(test) {
    casper.thenOpen(url + 'logout/', function (response) {
        test.assertUrlMatch(/ghost\/sign/, 'We got redirected to signin or signup page');
    });
}, true);

CasperTest.begin('Ensure a User is Registered', 2, function suite(test) {
    casper.thenOpen(url + 'ghost/signup/');

    casper.waitForOpaque(".signup-box",
        function then() {
            this.fill("#signup", newUser, true);
        },
        function onTimeout() {
            test.fail('Sign up form didn\'t fade in.');
        });

    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
        test.assertSelectorHasText('.notification-error', 'already registered');
        // If the previous assert succeeds, then we should skip the next check and just pass.
        casper.echo('Already registered!');
    }, function onTimeout() {
        test.assertUrlMatch(/\/ghost\/$/, 'If we\'re not already registered, we should be logged in.');
        casper.echo('Successfully registered.');
    }, 2000);

    casper.thenOpen(url + 'logout/', function then() {
        test.assertUrlMatch(/ghost\/signin/, 'We got redirected to signin page.');
    });
}, true);

CasperTest.begin("Ghost admin will load login page", 2, function suite(test) {
    casper.thenOpen(url + "ghost", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/signin\/$/, 'We should be presented with the signin page.');
    });
}, true);

CasperTest.begin('Redirects login to signin', 2, function suite(test) {
    casper.start(url + 'ghost/login/', function testRedirect(response) {
        test.assertEqual(response.status, 200, 'Response status should be 200.');
        test.assertUrlMatch(/ghost\/signin\/$/, 'Should be redirected to /signin/.');
    });
}, true);

CasperTest.begin("Can't spam it", 3, function suite(test) {
    casper.thenOpen(url + "ghost/signin/", function testTitle() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
    });

    casper.waitForOpaque(".login-box",
        function then() {
            this.fill("#login", falseUser, true);
        },
        function onTimeout() {
            test.fail('Sign in form didn\'t fade in.');
        });

    casper.wait(200, function doneWait() {
        this.fill("#login", falseUser, true);
    });

    casper.waitForText('Slow down, there are way too many login attempts!', function onSuccess() {
        test.assert(true, 'Spamming the login did result in an error notification');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'Spamming the login did not result in an error notification');
    });

    // This test causes the spam notification
    // add a wait to ensure future tests don't get tripped up by this.
    casper.wait(2000);
}, true);

CasperTest.begin("Can login to Ghost", 4, function suite(test) {
    casper.thenOpen(url + "ghost/login/", function testTitle() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
    });

    casper.waitForOpaque(".login-box",
        function then() {
            this.fill("#login", user, true);
        });

    casper.waitForResource(/ghost\/$/, function testForDashboard() {
        test.assertUrlMatch(/ghost\/$/, 'We got redirected to the Ghost page');
        test.assertExists("#global-header", "Global admin header is present");
        test.assertExists(".manage", "We're now on content");
    }, function onTimeOut() {
        test.fail('Failed to load ghost/ resource');
    });
}, true);
