/**
 * Tests logging out and attempting to sign up
 */

/*globals casper, __utils__, url, testPost, falseUser, email */
casper.test.begin('Redirects page 1 request', 1, function suite(test) {
    test.filename = '01_route_test_redirects_page_1.png';

    casper.start(url + 'page/1/', function then(response) {
        test.assertEqual(casper.getCurrentUrl().indexOf('page/'), -1, 'Should be redirected to "/".');
    }).viewport(1280, 1024);

    casper.run(function () {
        test.done();
    });
});