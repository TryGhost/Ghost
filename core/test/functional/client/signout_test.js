// # Signout Test
// Test that signout works correctly

/*globals CasperTest, casper */
CasperTest.begin('Ghost signout works correctly', 3, function suite(test) {
    CasperTest.Routines.signout.run(test);
    CasperTest.Routines.signin.run(test);

    casper.thenOpenAndWaitForPageLoad('root', function then() {
        test.assertTitle('Content - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL without signing in');
    });

    casper.thenClick('.gh-nav-menu').waitFor(function checkOpaque() {
        return this.evaluate(function () {
            var menu = document.querySelector('.gh-nav-menu.open');
            return window.getComputedStyle(menu).getPropertyValue('display') === 'block' &&
                window.getComputedStyle(menu).getPropertyValue('opacity') === '1';
        });
    });

    casper.captureScreenshot('user-menu-open.png');

    casper.waitForSelector('.user-menu-signout');
    casper.thenClick('.user-menu-signout');

    casper.waitForSelector('#login').then(function assertSuccess() {
        test.assert(true, 'Got login screen');
    });

    casper.captureScreenshot('user-menu-logout-clicked.png');
}, true);
