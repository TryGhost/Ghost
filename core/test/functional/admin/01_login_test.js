/*globals casper, __utils__, url, user, falseUser */

casper.test.begin('Ensure Session is Killed', 1, function suite(test) {
    test.filename = 'login_logout_test.png';

    casper.start(url + 'logout/', function (response) {
        test.assertUrlMatch(/ghost\/sign/, 'We got redirected to signin or signup page');
    });

    casper.run(function () {
        test.done();
    });
});

casper.test.begin('Ensure a User is Registered', 2, function suite(test) {
    test.filename = 'login_user_registered_test.png';

    casper.start(url + 'ghost/signup/').viewport(1280, 1024);

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
        test.pass('Already registered!');
    }, function onTimeout() {
        test.assertUrlMatch(/\/ghost\/$/, 'If we\'re not already registered, we should be logged in.');
        test.pass('Successfully registered.');
    }, 2000);

    casper.run(function () {
        test.done();
    });
});

casper.test.begin('Ensure Session is Killed after Registration', 1, function suite(test) {
    test.filename = 'login_logout2_test.png';

    casper.start(url + 'logout/', function then() {
        test.assertUrlMatch(/ghost\/signin/, 'We got redirected to signin page');
    });

    casper.run(function () {
        test.done();
    });
});

casper.test.begin("Ghost admin will load login page", 2, function suite(test) {
    test.filename = "admin_test.png";

    casper.start(url + "ghost", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/signin\/$/, 'If we\'re not already registered, we should be logged in.');
    }).viewport(1280, 1024);

    casper.run(function () {
        test.done();
    });
});

casper.test.begin('Redirects to signin', 2, function suite(test) {
    test.filename = 'login_redirect_test.png';

    casper.start(url + 'ghost/login/', function testRedirect(response) {
        test.assertEqual(response.status, 200, 'Response status should be 200.');
        test.assertUrlMatch(/ghost\/signin\/$/, 'Should be redirected to /signin/.');
    });

    casper.run(function () {
        test.done();
    });
});

casper.test.begin("Can't spam it", 4, function suite(test) {
    test.filename = "login_spam_test.png";

    casper.start(url + "ghost/signin/", function testTitle() {
        test.assertTitle("", "Ghost admin has no title");
    }).viewport(1280, 1024);

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

    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assert(true, 'Save without title results in error notification as expected');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
        test.assertSelectorHasText('.notification-error', 'Slow down, there are way too many login attempts!');
    }, function onTimeout() {
        test.assert(false, 'Spamming the login did not result in an error notification');
    });

    // This test causes the spam notification
    // add a wait to ensure future tests don't get tripped up by this.
    casper.wait(1000);

    casper.run(function () {
        test.done();
    });
});

casper.test.begin("Can login to Ghost", 4, function suite(test) {
    test.filename = "login_test.png";

    casper.start(url + "ghost/login/", function testTitle() {
        test.assertTitle("", "Ghost admin has no title");
    }).viewport(1280, 1024);

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

    casper.run(function () {
        test.done();
    });
});
