/**
 * Tests if RSS exists and is working
 */
/*globals CasperTest, casper */
CasperTest.begin('Check post not found (404)', 2, function suite(test) {
    casper.thenOpen(url + 'asdf/', function (response) {
        test.assertEqual(response.status, 404, 'Response status should be 404.');
		test.assertSelectorHasText('.error-code', '404');
    });
});

CasperTest.begin('Check frontend route not found (404)', 2, function suite(test) {
    casper.thenOpen(url + 'asdf/asdf/', function (response) {
        test.assertEqual(response.status, 404, 'Response status should be 404.');
		test.assertSelectorHasText('.error-code', '404');
    });
});