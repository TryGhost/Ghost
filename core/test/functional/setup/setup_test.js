// # Setup Test
// Test that setup works correctly

/*global CasperTest, casper, email, user, password */

CasperTest.begin('Ghost setup fails properly', 5, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('setup', function then() {
        test.assertUrlMatch(/ghost\/setup\/one\/$/, 'Landed on the correct URL');
    });

    casper.thenTransitionAndWaitForScreenLoad('setup.two', function setupWithShortPassword() {
        casper.fillAndAdd('#setup', {'blog-title': 'ghost', name: 'slimer', email: email, password: 'short'});
    });

    // should now throw a short password error
    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assert(true, 'Got error notification');
        test.assertSelectorHasText('.notification-error', 'Password must be at least 8 characters long');
    }, function onTimeout() {
        test.assert(false, 'No error notification :(');
    });

    casper.then(function setupWithLongPassword() {
        casper.fillAndAdd('#setup', {'blog-title': 'ghost', name: 'slimer', email: email, password: password});
    });

    // This can take quite a long time
    casper.wait(5000);

    casper.waitForResource(/\d+/, function testForDashboard() {
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
        test.assertExists('.gh-nav-main-content.active', 'Now we are on Content');
    }, function onTimeOut() {
        test.fail('Failed to signin');
    }, 20000);
}, true);

CasperTest.begin('Authenticated user is redirected', 6, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle('Sign In - ghost', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque('.gh-signin', function then() {
        this.fillAndSave('#login', user);
    });

    casper.wait(2000);

    casper.waitForResource(/\d+/, function testForDashboard() {
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
        test.assertExists('.gh-nav-main-content.active', 'Now we are on Content');
    }, function onTimeOut() {
        test.fail('Failed to signin');
    });

    casper.thenOpenAndWaitForPageLoad('setup-authenticated', function testTitleAndUrl() {
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
        test.assertExists('.gh-nav-main-content.active', 'Now we are on Content');
    }, function onTimeOut() {
        test.fail('Failed to redirect');
    });
}, true);
