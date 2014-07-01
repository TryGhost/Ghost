// # Setup Test
// Test that setup works correctly

/*global CasperTest, casper, email */

CasperTest.begin('Ghost setup fails properly', 5, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('setup', function then() {
        test.assertUrlMatch(/ghost\/setup\/$/, 'Landed on the correct URL');
    });

    casper.then(function setupWithShortPassword() {
        casper.fillAndAdd('#setup', {email: email, password: 'test'});
    });

    // should now throw a short password error
    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assert(true, 'Got error notification');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'No error notification :(');
    });

    casper.then(function setupWithLongPassword() {
        casper.fillAndAdd('#setup', {email: email, password: 'testing1234'});
    });

    // should now throw a 1 user only error
    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assert(true, 'Got error notification');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'No error notification :(');
    });
}, true);

CasperTest.begin('Authenticated user is redirected', 8, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque('.login-box', function then() {
        this.fillAndSave('#login', user);
    });

    casper.wait(2000);

    casper.waitForResource(/posts/, function testForDashboard() {
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
        test.assertExists('#global-header', 'Global admin header is present');
        test.assertExists('.manage', 'We\'re now on content');
    }, function onTimeOut() {
        test.fail('Failed to signin');
    });

    casper.thenOpenAndWaitForPageLoad('setup-authenticated', function testTitleAndUrl() {
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
        test.assertExists('#global-header', 'Global admin header is present');
        test.assertExists('.manage', 'We\'re now on content');
    }, function onTimeOut() {
        test.fail('Failed to redirect');
    });
}, true);
