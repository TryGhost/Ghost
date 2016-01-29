// # Signup Test
// Test that signup works correctly

/*globals CasperTest */

CasperTest.begin('Ghost signup fails properly', 0, function suite(test) {
    /*jshint unused:false */

    // casper.thenOpenAndWaitForPageLoad('signup', function then() {
    //     test.assertUrlMatch(/ghost\/signup\/$/, 'Landed on the correct URL');
    // });

    // casper.then(function signupWithShortPassword() {
    //     casper.fillAndSave('#signup', {email: email, password: 'test'});
    // });

    // // should now throw a short password error
    // casper.waitForSelector('.notification-error', function onSuccess() {
    //     test.assert(true, 'Got error notification');
    //     test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    // }, function onTimeout() {
    //     test.assert(false, 'No error notification :(');
    // });

    // casper.then(function signupWithLongPassword() {
    //     casper.fillAndSave('#signup', {email: email, password: 'testing1234'});
    // });

    // // should now throw a 1 user only error
    // casper.waitForSelector('.notification-error', function onSuccess() {
    //     test.assert(true, 'Got error notification');
    //     test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    // }, function onTimeout() {
    //     test.assert(false, 'No error notification :(');
    // });
}, true);
