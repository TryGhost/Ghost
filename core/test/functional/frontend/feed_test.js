/**
 * Tests if RSS exists and is working
 */
/*globals CasperTest, casper */
CasperTest.begin('Ensure that RSS is available', 11, function suite(test) {
    casper.thenOpen(url + 'rss/', function (response) {
        var content = this.getPageContent(),
            siteTitle = '<title><![CDATA[Ghost]]></title',
            siteDescription = '<description><![CDATA[Just a blogging platform.]]></description>',
            siteUrl = '<link>http://127.0.0.1:2369</link>',
            postTitle = '<![CDATA[Welcome to Ghost]]>',
            postStart = '<description><![CDATA[<p>You\'re live!',
            postEnd = 'you think :)</p>]]></description>',
            postLink = '<link>http://127.0.0.1:2369/welcome-to-ghost/</link>',
            postCreator = '<dc:creator><![CDATA[Test User]]>';

        test.assertEqual(response.status, 200, 'Response status should be 200.');
        test.assert(content.indexOf('<rss') >= 0, 'Feed should contain <rss');
        test.assert(content.indexOf(siteTitle) >= 0, 'Feed should contain blog title.');
        test.assert(content.indexOf(siteDescription) >= 0, 'Feed should contain blog description.');
        test.assert(content.indexOf(siteUrl) >= 0, 'Feed should contain link to blog.');
        test.assert(content.indexOf(postTitle) >= 0, 'Feed should contain welcome post title.');
        test.assert(content.indexOf(postStart) >= 0, 'Feed should contain start of welcome post content.');
        test.assert(content.indexOf(postEnd) >= 0, 'Feed should contain end of welcome post content.');
        test.assert(content.indexOf(postLink) >= 0, 'Feed should have link to the welcome post.');
        test.assert(content.indexOf(postCreator) >= 0, 'Welcome post should have Test User as the creator.');
        test.assert(content.indexOf('</rss>') >= 0, 'Feed should contain </rss>');
    });
});

CasperTest.begin('Ensures dated permalinks works with RSS', 4, function suite(test) {
	casper.thenOpen(url + "ghost/settings/", function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/settings\/general\/$/, "Ghost doesn't require login this time");
    });
	casper.thenClick('#permalinks');
	casper.thenClick('.button-save');
	casper.waitFor(function successNotification() {
        return this.evaluate(function () {
            return document.querySelectorAll('.js-bb-notification section').length > 0;
        });
    });
	casper.thenOpen(url + 'rss/', function (response) {
		var content = this.getPageContent(),
			today = new Date(),
			dd = ("0" + today.getDate()).slice(-2),
			mm = ("0" + (today.getMonth() + 1)).slice(-2),
			yyyy = today.getFullYear(),
			postLink = '/' + yyyy + '/' + mm + '/' + dd + '/welcome-to-ghost/';

		test.assertEqual(response.status, 200, 'Response status should be 200.');
		test.assert(content.indexOf(postLink) >= 0, 'Feed should have dated permalink.');
	});
});
