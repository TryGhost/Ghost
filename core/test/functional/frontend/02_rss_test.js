/**
 * Tests if RSS exists and is working
 */
casper.test.begin('Ensure that RSS is available', 3, function suite(test) {
    test.filename = 'rss_test.png';

    casper.start(url + 'rss/', function (response) {
        test.assertEqual(response.status, 200, 'Response status should be 200.');
        test.assert(this.getPageContent().indexOf('<rss') >= 0, 'Feed should contain <rss');
        test.assert(this.getPageContent().indexOf('</rss>') >= 0, 'Feed should contain </rss>');
    });
    
    casper.run(function () {
        test.done();
    });
});