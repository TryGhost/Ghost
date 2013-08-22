/*globals casper, __utils__, url, user, falseUser */
casper.test.begin("Ghost admin will load login page", 2, function suite(test) {

    casper.test.filename = "admin_test.png";

    casper.start(url + "ghost", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertEquals(this.getCurrentUrl(), url + "ghost/login/", "Ghost requires login");
    }).viewport(1280, 1024);

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

casper.test.begin("Can't spam it", 2, function suite(test) {

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
        this.fill("#login", falseUser, true);
        casper.wait(200, function doneWait() {
            this.fill("#login", falseUser, true);
        });

    });
    casper.wait(200, function doneWait() {
        this.echo("I've waited for 1 seconds.");
    });

    casper.then(function testForErrorMessage() {
        test.assertSelectorHasText('.notification-error', 'Slow down, there are way too many login attempts!');
    });

    casper.run(function () {
        test.done();
    });
});

