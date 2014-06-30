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