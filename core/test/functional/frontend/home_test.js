/**
 * Tests the homepage
 */

/*globals CasperTest, casper, __utils__, url, testPost, falseUser, email */
CasperTest.begin('Home page loads', 3, function suite(test) {
    casper.start(url, function then(response) {
        test.assertTitle('Ghost', 'The homepage should have a title and it should be Ghost');
        test.assertExists('.content .post', 'There is at least one post on this page');
        test.assertSelectorHasText('.poweredby', 'Proudly published with Ghost');
    });
}, true);

CasperTest.begin('Test helpers on homepage', 3, function suite(test) {
    casper.start(url, function then(response) {
        // body class
        test.assertExists('body.home-template', 'body_class outputs correct home-template class');
        // post class
        test.assertExists('article.post', 'post_class outputs correct post class');
        test.assertExists('article.tag-getting-started', 'post_class outputs correct tag class');
    });
}, true);