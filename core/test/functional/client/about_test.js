// # About Test
// Test the various parts of the About page

/*globals CasperTest, casper */

CasperTest.begin('About screen is correct', 9, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('about', function testTitleAndUrl() {
        test.assertTitle('About - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/about\/$/, 'Redirected to the correct URL');
    });

    casper.then(function testVersionNumber() {
        var versionNumber = casper.getHTML('.gh-env-list-version');
        test.assertMatch(versionNumber, /\d+\.\d+\.\d+/, 'Version is a number'); // Tests for a pattern like 0.0.0 to v11111.3334534.2342453-beta
    });

    casper.then(function testDatabaseType() {
        var databaseTypeText = casper.getHTML('.gh-env-list-database-type');
        test.assertMatch(databaseTypeText, /sqlite3|mysql|pg/gi, 'Database is an allowed type');
    });

    casper.waitForSelector('.gh-contributors article', function testContributors() {
        var firstContribImageSrc = casper.getElementAttribute('.gh-contributors article:nth-child(1) a img', 'src');

        // Check first contributor image tag is on the page
        test.assertExist('.gh-contributors article:nth-child(1) img', 'First contributor image is in place');

        // Check first contributor image resource exists & alt tag isnt empty
        test.assertResourceExists(firstContribImageSrc, 'First contributor image file exists');
        test.assertDoesntExist('.gh-contributors article:nth-child(1) a img[alt=""]', 'First contributor image alt is not empty');

        // Check first contributor links to GitHub
        test.assertExists('.gh-contributors article:nth-child(1) a[href*="github.com"]', 'First contributor link to GitHub');

        // Check first contributor links to GitHub
        test.assertDoesntExist('.gh-contributors article:nth-child(1) a[title=""]', 'First contributor title is not empty');
    });
});
