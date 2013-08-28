/*globals casper, __utils__, url, user, falseUser */

casper.test.begin('Ensure Session is Killed', 1, function suite(test) {
    casper.test.filename = 'login_logout_test.png';

    casper.start(url + 'logout/', function (response) {
        test.assert(/\/ghost\//.test(response.url), response.url);
    });

    casper.run(function () {
        test.done();
    });
});

casper.test.begin('Ensure a User is Registered', 2, function suite(test) {
    casper.test.filename = 'login_user_registered_test.png';

    casper.start(url + 'ghost/signup/');

    casper.waitFor(function checkOpaque() {
        return this.evaluate(function () {
            var loginBox = document.querySelector('.login-box');
            return window.getComputedStyle(loginBox).getPropertyValue('display') === "block"
                && window.getComputedStyle(loginBox).getPropertyValue('opacity') === "1";
        });
    }, function then() {
        checkUrl = true;
        this.fill("#register", user, true);
    });

    casper.waitForSelectorTextChange('.notification-error', function (text) {
        test.assertSelectorHasText('.notification-error', 'already registered');
        // If the previous assert succeeds, then we should skip the next check and just pass.
        test.pass('Already registered!');
    }, function () {
        test.assertUrlMatch(/\/ghost\/$/, 'If we\'re not already registered, we should be logged in.');
        test.pass('Successfully registered.')
    }, 2000);

    casper.run(function () {
        test.done();
    });
});

casper.test.begin('Ensure Session is Killed after Registration', 1, function suite(test) {
    casper.test.filename = 'login_logout2_test.png';

    casper.start(url + 'logout/', function (response) {
        test.assert(/\/ghost\//.test(response.url), response.url);
    });

    casper.run(function () {
        test.done();
    });
});

casper.test.begin("Ghost admin will load login page", 2, function suite(test) {

    casper.test.filename = "admin_test.png";

    casper.start(url + "ghost", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertEquals(this.getCurrentUrl(), url + "ghost/signin/", "Ghost requires login");
    }).viewport(1280, 1024);

    casper.run(function () {
        test.done();
    });
});

casper.test.begin('Redirects to signin', 2, function suite(test) {
    casper.test.filename = 'login_redirect_test.png';

    casper.start(url + 'ghost/login/', function testRedirect(response) {
        test.assertEqual(response.status, 200, 'Response status should be 200.');
        test.assert(/\/signin\/$/.test(response.url), 'Should be redirected to /signin/. Actual response url: ' + response.url + '.');
    });

    casper.run(function () {
        test.done();
    });
});

casper.test.begin("Can't spam it", 2, function suite(test) {

    casper.test.filename = "login_spam_test.png";

    casper.start(url + "ghost/signin/", function testTitle() {
        test.assertTitle("", "Ghost admin has no title");
    }).viewport(1280, 1024);

    casper.waitFor(function checkOpaque() {
        return this.evaluate(function () {
            var loginBox = document.querySelector('.login-box');

            return window.getComputedStyle(loginBox).getPropertyValue('display') === "block"
                && window.getComputedStyle(loginBox).getPropertyValue('opacity') === "1";
        });
    }, function then() {
        this.fill("#login", falseUser, true);
        casper.wait(200, function doneWait() {
            this.fill("#login", falseUser, true);
        });
    });
    casper.wait(1000, function doneWait() {
        this.echo("I've waited for 1 seconds.");
    });

    casper.then(function testForErrorMessage() {
        test.assertSelectorHasText('.notification-error', 'Slow down, there are way too many login attempts!');
    });

    casper.run(function () {
        test.done();
    });
});

casper.test.begin("Can login to Ghost", 3, function suite(test) {

    casper.test.filename = "login_test.png";

    casper.start(url + "ghost/login/", function testTitle() {
        test.assertTitle("", "Ghost admin has no title");
    }).viewport(1280, 1024);

    casper.waitFor(function checkOpaque() {
        return this.evaluate(function () {
            var loginBox = document.querySelector('.login-box');
            return window.getComputedStyle(loginBox).getPropertyValue('display') === "block"
                && window.getComputedStyle(loginBox).getPropertyValue('opacity') === "1";
        });
    }, function then() {
        this.fill("#login", user, true);
    });

    casper.wait(1000, function doneWait() {
        this.echo("I've waited for 1 seconds.");
    });

    casper.then(function testForDashboard() {
        this.test.assertExists("#global-header", "Global admin header is present");
        this.test.assertExists(".dashboard", "We're now on the dashboard");
    });

    casper.run(function () {
        test.done();
    });
});
