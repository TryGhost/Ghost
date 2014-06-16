/**
 * Tests logging out and attempting to sign up
 */

/*globals casper, __utils__, url, testPost, falseUser, email */
CasperTest.begin("Ghost logout works correctly", 2, function suite(test) {
    CasperTest.Routines.register.run(test);
    CasperTest.Routines.logout.run(test);
    CasperTest.Routines.login.run(test);

    casper.thenOpen(url + "ghost/", function then() {
        test.assertEquals(casper.getCurrentUrl(), url + "ghost/", "Ghost doesn't require login this time");
    });

    casper.thenClick('#usermenu a').waitFor(function checkOpaque() {
        return this.evaluate(function () {
            var loginBox = document.querySelector('#usermenu .overlay.open');
            return window.getComputedStyle(loginBox).getPropertyValue('display') === "block"
                && window.getComputedStyle(loginBox).getPropertyValue('opacity') === "1";
        });
    });

    casper.waitForSelector('.usermenu-signout a');
    casper.thenClick('.usermenu-signout a');
    casper.waitForResource(/ghost\/signin/);

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assert(true, 'Got success notification');
    }, function onTimeout() {
        test.assert(false, 'No success notification :(');
    });
}, true);

// has to be done after signing out
CasperTest.begin("Can't spam signin", 3, function suite(test) {
    casper.thenOpen(url + "ghost/signin/", function testTitle() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
    });

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
}, true);

CasperTest.begin("Ghost signup fails properly", 5, function suite(test) {
    casper.thenOpen(url + "ghost/signup/", function then() {
        test.assertEquals(casper.getCurrentUrl(), url + "ghost/signup/", "Reached signup page");
    });

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
}, true);