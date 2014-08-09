/**
 * Tests the homepage
 */

/*globals CasperTest, casper, __utils__, url, testPost, falseUser, email */
CasperTest.begin('Home page loads', 3, function suite(test) {
    casper.start(url, function then(response) {
        test.assertTitle('Test Blog', 'The homepage should have a title and it should be "Test Blog"');
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

CasperTest.begin('Test navigating to Post', 4, function suite(test) {
    casper.thenOpen(url, function then(response) {
        var lastPost = '.content article:last-of-type',
            lastPostLink = lastPost + ' .post-title a';

        test.assertExists(lastPost, 'there is a last child on the page');
        test.assertSelectorHasText(lastPostLink, 'Welcome to Ghost', 'Is correct post');

        casper.then(function testLink() {
            var link = this.evaluate(function (lastPostLink) {
                return document.querySelector(lastPostLink).getAttribute('href');
            }, lastPostLink);

            test.assert(link === '/welcome-to-ghost/', 'Has correct link');
        });

        casper.thenClick(lastPostLink);

        casper.waitForResource(/welcome-to-ghost/).then(function (resource) {
            test.assert(resource.status === 200, 'resource got 200');
        });
    });
}, true);

CasperTest.begin('Test navigating to Post with date permalink', 4, function suite(test) {
    CasperTest.Routines.togglePermalinks.run('on');
    casper.thenOpen(url, function then(response) {
        var lastPost = '.content article:last-of-type',
            lastPostLink = lastPost + ' .post-title a',
            today = new Date(),
            dd = ("0" + today.getDate()).slice(-2),
            mm = ("0" + (today.getMonth() + 1)).slice(-2),
            yyyy = today.getFullYear(),
            postLink = '/' + yyyy + '/' + mm + '/' + dd + '/welcome-to-ghost/';

        test.assertExists(lastPost, 'there is a last child on the page');
        test.assertSelectorHasText(lastPostLink, 'Welcome to Ghost', 'Is correct post');

        casper.then(function testLink() {
            var link = this.evaluate(function (lastPostLink) {
                return document.querySelector(lastPostLink).getAttribute('href');
            }, lastPostLink);

            test.assert(link === postLink, 'Has correct link');
        });

        casper.thenClick(lastPostLink);

        casper.waitForResource(postLink).then(function (resource) {
            test.assert(resource.status === 200, 'resource got 200');
        });
    });
    CasperTest.Routines.togglePermalinks.run('off');
}, false);

