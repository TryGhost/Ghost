/**
 * Tests if Sitemap exists and is working
 */
CasperTest.begin('Ensure that Sitemap is available', 3, function suite(test) {
    casper.thenOpen(url + 'sitemap.xml', function (response) {
        test.assertEqual(response.status, 200, 'Response status should be 200.');
        test.assert(this.getPageContent().indexOf('<?xml') >= 0, 'Feed should contain <?xml');
        test.assert(this.getPageContent().indexOf('<urlset') >= 0, 'Feed should contain <urlset');
        test.assert(this.getPageContent().indexOf('</urlset>') >= 0, 'Feed should contain </urlset>');
    });
}, true);