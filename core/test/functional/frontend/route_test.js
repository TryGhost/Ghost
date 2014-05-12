/**
 * Tests archive page routing
 */

/*globals CasperTest, casper, __utils__, url, testPost, falseUser, email */
CasperTest.begin('Redirects page 1 request', 1, function suite(test) {
    casper.thenOpen(url + 'page/1/', function then(response) {
        test.assertEqual(casper.getCurrentUrl().indexOf('page/'), -1, 'Should be redirected to "/".');
    });
}, true);