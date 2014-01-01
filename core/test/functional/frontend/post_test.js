/**
 * Tests the default post page
 */

/*globals CasperTest, casper, __utils__, url, testPost, falseUser, email */

// Tests when permalinks is set to date (changed in feed_test)
CasperTest.begin('Post page does not load as slug', 2, function suite(test) {
    casper.start(url + 'welcome-to-ghost', function then(response) {
        test.assertTitle('404 — Page Not Found', 'The post should return 404 page');
        test.assertElementCount('.content .post', 0, 'There is no post on this page');
    });
}, true);

CasperTest.begin('Post page loads', 3, function suite(test) {
    CasperTest.Routines.togglePermalinks.run('off');
    casper.thenOpen(url + 'welcome-to-ghost', function then(response) {
        test.assertTitle('Welcome to Ghost', 'The post should have a title and it should be "Welcome to Ghost"');
        test.assertElementCount('.content .post', 1, 'There is exactly one post on this page');
        test.assertSelectorHasText('.poweredby', 'Proudly published with Ghost');
    });
});

CasperTest.begin('Test helpers on homepage', 4, function suite(test) {
    casper.start(url + 'welcome-to-ghost', function then(response) {
        // body class
        test.assertExists('body.post-template', 'body_class outputs correct post-template class');
        test.assertExists('body.tag-getting-started', 'body_class outputs correct tag class');
        // post class
        test.assertExists('article.post', 'post_class outputs correct post class');
        test.assertExists('article.tag-getting-started', 'post_class outputs correct tag class');
    });
}, true);