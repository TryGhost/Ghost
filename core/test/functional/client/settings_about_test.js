// # About Test
// Test the various parts of the About page

/*globals CasperTest, casper */

CasperTest.begin('About screen is correct', 9, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('settings.about', function testTitleAndUrl() {
        test.assertTitle('Settings - About - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/settings\/about\/$/, 'Landed on the correct URL');
    });

    casper.then(function testVersionNumber() {
        var versionNumber = casper.getHTML('.about-ghost-intro .version');
        test.assertMatch(versionNumber, /\d+\.\d+\.\d+/, 'Version is a number'); // Tests for a pattern like 0.0.0 to v11111.3334534.2342453-beta
    });

    casper.then(function testDatabaseType() {
        var databaseTypeText = casper.getHTML('.about-environment-database');
        test.assertMatch(databaseTypeText, /sqlite3|mysql|pg/gi, 'Database is an allowed type');
    });

    casper.waitForSelector('.top-contributors li', function testContributors() {
        var firstContribImageSrc = casper.getElementAttribute('.top-contributors li:nth-child(1) a img', 'src');

        // Check first contributor image tag is on the page
        test.assertExist('.top-contributors li:nth-child(1) img', 'First contributor image is in place');

        // Check first contributor image resource exists & alt tag isnt empty
        test.assertResourceExists(firstContribImageSrc, 'First contributor image file exists');
        test.assertDoesntExist('.top-contributors li:nth-child(1) a img[alt=""]', 'First contributor image alt is not empty');

        // Check first contributor links to GitHub
        test.assertExists('.top-contributors li:nth-child(1) a[href*="github.com"]', 'First contributor link to GitHub');

        // Check first contributor links to GitHub
        test.assertDoesntExist('.top-contributors li:nth-child(1) a[title=""]', 'First contributor title is not empty');
    });
});
