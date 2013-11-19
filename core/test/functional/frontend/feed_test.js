/**
 * Tests if RSS exists and is working
 */
/*globals CasperTest, casper */
CasperTest.begin('Ensure that RSS is available', 3, function suite(test) {
    casper.thenOpen(url + 'rss/', function (response) {
        test.assertEqual(response.status, 200, 'Response status should be 200.');
        test.assert(this.getPageContent().indexOf('<rss') >= 0, 'Feed should contain <rss');
        test.assert(this.getPageContent().indexOf('</rss>') >= 0, 'Feed should contain </rss>');
    });
});