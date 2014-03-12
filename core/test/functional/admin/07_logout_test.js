/**
 * Tests logging out and attempting to sign up
 */

/*globals casper, __utils__, url, testPost, falseUser, email */
casper.test.begin("Ghost logout works correctly", 2, function suite(test) {
    test.filename = "logout_test.png";

    casper.start(url + "ghost/", function then() {
        test.assertEquals(casper.getCurrentUrl(), url + "ghost/", "Ghost doesn't require login this time");
    }).viewport(1280, 1024);

    casper.thenClick('#usermenu a').waitFor(function checkOpaque() {
        return this.evaluate(function () {
            var loginBox = document.querySelector('#usermenu .overlay.open');
            return window.getComputedStyle(loginBox).getPropertyValue('display') === "block"
                && window.getComputedStyle(loginBox).getPropertyValue('opacity') === "1";
        });
    });

    casper.thenClick('.usermenu-signout a');
    casper.waitForResource(/signin/);

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assert(true, 'Got success notification');
    }, function onTimeout() {
        test.assert(false, 'No success notification :(');
    });

    casper.run(function () {
        test.done();
    });
});

// has to be done after signing out
casper.test.begin("Can't spam signin", 3, function suite(test) {
    test.filename = "spam_test.png";

    casper.start(url + "ghost/signin/", function testTitle() {
        test.assertTitle("", "Ghost admin has no title");
    }).viewport(1280, 1024);

    casper.waitFor(function checkOpaque() {
        return this.evaluate(function () {
            var loginBox = document.querySelector('.login-box');
            return window.getComputedStyle(loginBox).getPropertyValue('display') === "table"
                && window.getComputedStyle(loginBox).getPropertyValue('opacity') === "1";
        });
    }, function then() {
        this.fill("#login", falseUser, true);
        casper.wait(200, function doneWait() {
            this.fill("#login", falseUser, true);
        });

    });

    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assert(true, 'Got error notification');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'No error notification :(');
    });

    casper.run(function () {
        test.done();
    });
});

casper.test.begin("Ghost signup fails properly", 5, function suite(test) {
    test.filename = "signup_test.png";

    casper.start(url + "ghost/signup/", function then() {
        test.assertEquals(casper.getCurrentUrl(), url + "ghost/signup/", "Reached signup page");
    }).viewport(1280, 1024);

    casper.then(function signupWithShortPassword() {
        this.fill("#signup", {email: email, password: 'test'}, true);
    });

    // should now throw a short password error
    casper.waitForResource(/signup/);
    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assert(true, 'Got error notification');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'No error notification :(');
    });

    casper.then(function signupWithLongPassword() {
        this.fill("#signup", {email: email, password: 'testing1234'}, true);
    });

    // should now throw a 1 user only error
    casper.waitForResource(/signup/);
    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assert(true, 'Got error notification');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'No error notification :(');
    });

    casper.run(function () {
        test.done();
    });
});