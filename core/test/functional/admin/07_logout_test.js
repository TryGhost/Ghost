/**
 * Tests logging out and attempting to sign up
 */

/*globals casper, __utils__, url, testPost, falseUser, email */
casper.test.begin("Ghost logout works correctly", 2, function suite(test) {

    casper.test.filename = "logout_test.png";

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

    casper.thenClick('.usermenu-signout a').waitForResource(/login/, function then() {
        test.assertExists('.notification-success', 'got success notification');
    });

    casper.run(function () {
        test.done();
    });
});

// has to be done after signing out
casper.test.begin("Can't spam signin", 3, function suite(test) {

    casper.test.filename = "spam_test.png";

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
    casper.wait(200, function doneWait() {
        this.echo("I've waited for 1 seconds.");
    });

    casper.then(function testForErrorMessage() {
        test.assertExists('.notification-error', 'got error notification');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    });

    casper.run(function () {
        test.done();
    });
});

casper.test.begin("Ghost signup fails properly", 5, function suite(test) {

    casper.test.filename = "signup_test.png";

    casper.start(url + "ghost/signup/", function then() {
        test.assertEquals(casper.getCurrentUrl(), url + "ghost/signup/", "Reached signup page");
    }).viewport(1280, 1024);

    casper.then(function signupWithShortPassword() {
        this.fill("#register", {email: email, password: 'test'}, true);
    });

    // should now throw a short password error
    casper.waitForResource(/signup/, function () {
        test.assertExists('.notification-error', 'got error notification');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    });

    casper.then(function signupWithLongPassword() {
        this.fill("#register", {email: email, password: 'testing1234'}, true);
    });

    // should now throw a 1 user only error
    casper.waitForResource(/signup/, function () {
        test.assertExists('.notification-error', 'got error notification');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    });

    casper.run(function () {
        test.done();
    });
});