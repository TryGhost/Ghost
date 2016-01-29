// Test that setup works correctly

/*global CasperTest, casper, email, user, password */

CasperTest.begin('Ghost setup fails properly', 11, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('setup', function then() {
        test.assertUrlMatch(/ghost\/setup\/one\/$/, 'Landed on the correct URL');
    });

    casper.thenTransitionAndWaitForScreenLoad('setup.two', function setupWithShortPassword() {
        casper.fillAndAdd('#setup', {'blog-title': 'ghost', name: 'slimer', email: email, password: 'short'});
    });

    // should now show a short password error
    casper.waitForText('Password must be at least 8 characters long', function onSuccess() {
        test.assert(true, 'Short password error was shown');
    }, casper.failOnTimeout(test, 'Short password error was not shown'));

    casper.then(function setupWithLongPassword() {
        casper.fillAndAdd('#setup', {'blog-title': 'ghost', name: 'slimer', email: email, password: password});
    });

    // This can take quite a long time
    casper.wait(5000);

    casper.waitForScreenLoad('setup.three', function inviteUsers() {
        casper.thenClick('.gh-flow-content .btn');
    });

    casper.waitForText('No users to invite', function onSuccess() {
        test.assert(true, 'Got error message');

        test.assertExists('.gh-flow-content .btn-minor', 'Submit button is not minor');
        test.assertSelectorHasText('.gh-flow-content .btn', 'No users to invite', 'Submit button has wrong text');
    }, function onTimeout() {
        test.assert(false, 'No error message for empty invitation list');
    });

    casper.then(function fillInvalidEmail() {
        casper.fill('form.gh-flow-invite', {users: 'test'});
        casper.thenClick('.gh-flow-content .btn');
    });

    casper.waitForText('1 invalid email address', function onSuccess() {
        test.assert(true, 'Got invalid email error');
    }, casper.failOnTimeout(test, 'Invalid email error not shown'));

    casper.then(function fillInvitationForm() {
        casper.fill('form.gh-flow-invite', {users: 'test@example.com'});
        test.assertSelectorHasText('.gh-flow-content .btn', 'Invite 1 user', 'One invitation button text is incorrect');

        test.assertExists('.gh-flow-content .btn-green', 'Submit button is not green');

        casper.fill('form.gh-flow-invite', {users: 'test@example.com\ntest2@example.com'});
        test.assertSelectorHasText('.gh-flow-content .btn', 'Invite 2 users', 'Two invitations button text is incorrect');
    });

    casper.thenClick('.gh-flow-content .btn');

    // This might take awhile
    casper.wait(5000);

    // These invitations will fail, because Casper can't send emails
    casper.waitForSelector('.gh-alert', function onSuccess() {
        test.assert(true, 'Got error notification');
        test.assertSelectorHasText('.gh-alert', 'Failed to send 2 invitations: test@example.com, test2@example.com');
    }, function onTimeout() {
        test.assert(false, 'No error notification after invite.');
    });
}, true, true);

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
}, true, true);
