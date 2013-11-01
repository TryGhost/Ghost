/**
 * Tests the default post page
 */

/*globals CasperTest, casper, __utils__, url, testPost, falseUser, email */
CasperTest.begin('Post page loads', 3, function suite(test) {
    casper.start(url + 'welcome-to-ghost', function then(response) {
        test.assertTitle('Welcome to Ghost', 'The post should have a title and it should be "Welcome to Ghost"');
        test.assertElementCount('.content .post', 1, 'There is exactly one post on this page');
        test.assertSelectorHasText('.poweredby', 'Proudly published with Ghost');
    });
}, true);

CasperTest.begin('Test helpers on homepage', 4, function suite(test) {
    casper.start(url + 'welcome-to-ghost', function then(response) {
        // body class
        test.assertExists('body.post-template', 'body_class outputs correct post-template class');
        test.assertExists('body.tag-getting-started', 'body_class outputs correct tag class');
        // post class
        test.assertExists('article.post', 'post_class outputs correct post class');
        test.assertExists('article.tag-getting-started', 'post_class outputs correct tag class');
    });
});