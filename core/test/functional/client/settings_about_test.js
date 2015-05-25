// # Settings About Test
// Tests that the settings about page is redirected

/*globals CasperTest, casper */

CasperTest.begin('About screen is correct', 1, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('settings.about', function testTitleAndUrl() {
        test.assertUrlMatch(/ghost\/about\/$/, 'Redirected to the correct URL');
    });
});
