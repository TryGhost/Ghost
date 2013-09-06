/**
 * Tests logging out and attempting to sign up
 */

/*globals casper, __utils__, url, testPost, falseUser, email */
casper.test.begin('Ghost homepage loads', 2, function suite(test) {
    test.filename = '01_route_test_homepage_loads.png';

    casper.start(url, function then(response) {
        test.assertEqual(response.status, 200, 'Response status should be 200.');
        test.assertEquals(casper.getCurrentUrl(), url, 'Ghost loads homepage.');
    }).viewport(1280, 1024);

    casper.run(function () {
        test.done();
    });
});

casper.test.begin('Redirects page 1 request', 2, function suite(test) {
    test.filename = '01_route_test_redirects_page_1.png';

    casper.start(url + 'page/1/', function then(response) {
        test.assertEqual(response.status, 200, 'Response status should be 200.');
        test.assertEqual(casper.getCurrentUrl().indexOf('/page/'), -1, 'Should be redirected to "/".');
    }).viewport(1280, 1024);

    casper.run(function () {
        test.done();
    });
});