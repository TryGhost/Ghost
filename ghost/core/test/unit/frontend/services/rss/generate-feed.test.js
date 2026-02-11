const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const should = require('should');
const sinon = require('sinon');
const _ = require('lodash');
const testUtils = require('../../../../utils');
const configUtils = require('../../../../utils/config-utils');
const routerManager = require('../../../../../core/frontend/services/routing').routerManager;
const generateFeed = require('../../../../../core/frontend/services/rss/generate-feed');
const {callRenderer} = require('../../../../../test/unit/server/services/koenig/test-utils');

describe('RSS: Generate Feed', function () {
    const data = {};
    let baseUrl;
    let routerManagerGetUrlByResourceIdStub;

    // Static set of posts
    let posts;

    before(function () {
        posts = _.cloneDeep(testUtils.DataGenerator.forKnex.posts);

        posts = _.filter(posts, function filter(post) {
            return post.status === 'published' && post.type === 'post';
        });

        posts[2].meta_description = 'test stuffs';

        _.each(posts, function (post) {
            post.url = '/' + post.slug + '/';
            post.primary_author = {name: 'Joe Bloggs'};

            // data is from fixtures that are inserted directly into the database via knex
            // that means it has raw __GHOST_URL__ values that would typically be modified by the model layer
            // we're not using the model layer here so we need to transform manually
            Object.entries(post).forEach(([key, value]) => {
                if (value && typeof value === 'string') {
                    post[key] = value.replace(/__GHOST_URL__/g, 'http://my-ghost-blog.com');
                }
            });
        });
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    beforeEach(function () {
        routerManagerGetUrlByResourceIdStub = sinon.stub(routerManager, 'getUrlByResourceId');

        baseUrl = '/rss/';

        data.safeVersion = '0.6';
        data.title = 'Test Title';
        data.description = 'Testing Desc';
        data.meta = {pagination: {pages: 1}};
    });

    describe('without subdirectory', function () {
        beforeEach(function () {
            configUtils.set({url: 'http://my-ghost-blog.com'});
        });

        it('should get the RSS tags correct', function (done) {
            data.posts = [];

            generateFeed(baseUrl, data).then(function (xmlData) {
                assertExists(xmlData);

                // xml & rss tags
                assert.match(xmlData, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
                assert.match(xmlData, /<rss/);
                assert.match(xmlData, /xmlns:dc="http:\/\/purl.org\/dc\/elements\/1.1\/"/);
                assert.match(xmlData, /xmlns:content="http:\/\/purl.org\/rss\/1.0\/modules\/content\/"/);
                assert.match(xmlData, /xmlns:atom="http:\/\/www.w3.org\/2005\/Atom"/);
                assert.match(xmlData, /version="2.0"/);
                assert.match(xmlData, /xmlns:media="http:\/\/search.yahoo.com\/mrss\/"/);

                // channel tags
                assert.match(xmlData, /<channel><title><!\[CDATA\[Test Title\]\]><\/title>/);
                assert.match(xmlData, /<description><!\[CDATA\[Testing Desc\]\]><\/description>/);
                assert.match(xmlData, /<link>http:\/\/my-ghost-blog.com\/<\/link>/);
                assert.match(xmlData, /<image><url>http:\/\/my-ghost-blog.com\/favicon.png<\/url><title>Test Title<\/title><link>http:\/\/my-ghost-blog.com\/<\/link><\/image>/);
                assert.match(xmlData, /<generator>Ghost 0.6<\/generator>/);
                assert.match(xmlData, /<lastBuildDate>.*?<\/lastBuildDate>/);
                assert.match(xmlData, /<atom:link href="http:\/\/my-ghost-blog.com\/rss\/" rel="self"/);
                assert.match(xmlData, /type="application\/rss\+xml"\/><ttl>60<\/ttl>/);
                assert.match(xmlData, /<\/channel><\/rss>$/);

                done();
            }).catch(done);
        });

        it('should get the item tags correct', function (done) {
            data.posts = posts;

            _.each(data.posts, function (post) {
                routerManagerGetUrlByResourceIdStub.withArgs(post.id, {absolute: true}).returns('http://my-ghost-blog.com/' + post.slug + '/');
            });

            generateFeed(baseUrl, data).then(function (xmlData) {
                assertExists(xmlData);

                // item tags
                assert.match(xmlData, /<item><title><!\[CDATA\[HTML Ipsum\]\]><\/title>/);
                assert.match(xmlData, /<description><!\[CDATA\[<h1>HTML Ipsum Presents<\/h1>/);
                assert.match(xmlData, /<link>http:\/\/my-ghost-blog.com\/html-ipsum\/<\/link>/);
                assert.match(xmlData, /<image><url>http:\/\/my-ghost-blog.com\/favicon.png<\/url><title>Test Title<\/title><link>http:\/\/my-ghost-blog.com\/<\/link><\/image>/);
                assert.match(xmlData, /<guid isPermaLink="false">/);
                assert.match(xmlData, /<\/guid><dc:creator><!\[CDATA\[Joe Bloggs\]\]><\/dc:creator>/);
                assert.match(xmlData, /<pubDate>Thu, 01 Jan 2015/);
                assert.match(xmlData, /<content:encoded><!\[CDATA\[<h1>HTML Ipsum Presents<\/h1>/);
                assert.match(xmlData, /<\/code><\/pre>\]\]><\/content:encoded><\/item>/);
                assert.doesNotMatch(xmlData, /<author>/);

                // basic structure check
                const postEnd = '<\/code><\/pre>\]\]><\/content:encoded>';
                const firstIndex = xmlData.indexOf(postEnd);

                // The first title should be before the first content
                assert(xmlData.indexOf('HTML Ipsum') < firstIndex);
                // The second title should be after the first content
                assert(xmlData.indexOf('Ghostly Kitchen Sink') > firstIndex);

                done();
            }).catch(done);
        });

        it('should only return visible tags', function (done) {
            const postWithTags = posts[2];
            postWithTags.tags = [
                {name: 'public', visibility: 'public'},
                {name: 'internal', visibility: 'internal'},
                {name: 'visibility'}
            ];

            data.posts = [postWithTags];

            generateFeed(baseUrl, data).then(function (xmlData) {
                assertExists(xmlData);
                // item tags
                assert.match(xmlData, /<title><!\[CDATA\[Short and Sweet\]\]>/);
                assert.match(xmlData, /<description><!\[CDATA\[test stuff/);
                assert.match(xmlData, /<content:encoded><!\[CDATA\[<!--kg-card-begin: markdown--><h2 id="testing">testing<\/h2>\n/);
                assert.match(xmlData, /<img src="http:\/\/placekitten.com\/500\/200"/);
                assert.match(xmlData, /<media:content url="http:\/\/placekitten.com\/500\/200" medium="image"\/>/);
                assert.match(xmlData, /<category><!\[CDATA\[public\]\]/);
                assert.match(xmlData, /<category><!\[CDATA\[visibility\]\]/);
                assert.doesNotMatch(xmlData, /<category><!\[CDATA\[internal\]\]/);
                done();
            }).catch(done);
        });

        it('should not error if author is somehow not present', function (done) {
            data.posts = [_.omit(posts[2], 'primary_author')];

            generateFeed(baseUrl, data).then(function (xmlData) {
                assertExists(xmlData);

                // special/optional tags
                assert.match(xmlData, /<title><!\[CDATA\[Short and Sweet\]\]>/);
                assert.match(xmlData, /<description><!\[CDATA\[test stuff/);
                assert.match(xmlData, /<content:encoded><!\[CDATA\[<!--kg-card-begin: markdown--><h2 id="testing">testing<\/h2>\n/);
                assert.match(xmlData, /<img src="http:\/\/placekitten.com\/500\/200"/);
                assert.match(xmlData, /<media:content url="http:\/\/placekitten.com\/500\/200" medium="image"\/>/);
                assert.doesNotMatch(xmlData, /<dc:creator>/);

                done();
            }).catch(done);
        });

        it('should not error if post content is null', function (done) {
            data.posts = [Object.assign({}, posts[2], {html: null})];

            generateFeed(baseUrl, data).then(function (xmlData) {
                assertExists(xmlData);

                // special/optional tags
                assert.match(xmlData, /<title><!\[CDATA\[Short and Sweet\]\]>/);
                assert.match(xmlData, /<description><!\[CDATA\[test stuff/);
                assert.match(xmlData, /<content:encoded\/>/);
                assert.match(xmlData, /<media:content url="http:\/\/placekitten.com\/500\/200" medium="image"\/>/);
                assert.match(xmlData, /<dc:creator>/);

                done();
            }).catch(done);
        });

        it('should use meta_description and image where available', function (done) {
            data.posts = [posts[2]];

            generateFeed(baseUrl, data).then(function (xmlData) {
                assertExists(xmlData);

                // special/optional tags
                assert.match(xmlData, /<title><!\[CDATA\[Short and Sweet\]\]>/);
                assert.match(xmlData, /<description><!\[CDATA\[test stuff/);
                assert.match(xmlData, /<content:encoded><!\[CDATA\[<!--kg-card-begin: markdown--><h2 id="testing">testing<\/h2>\n/);
                assert.match(xmlData, /<img src="http:\/\/placekitten.com\/500\/200"/);
                assert.match(xmlData, /<media:content url="http:\/\/placekitten.com\/500\/200" medium="image"\/>/);

                done();
            }).catch(done);
        });

        it('should use excerpt when no meta_description is set', function (done) {
            data.posts = [posts[0]];

            _.each(data.posts, function (post) {
                routerManagerGetUrlByResourceIdStub.withArgs(post.id, {absolute: true}).returns('http://my-ghost-blog.com/' + post.slug + '/');
            });

            generateFeed(baseUrl, data).then(function (xmlData) {
                assertExists(xmlData);

                // special/optional tags
                assert.match(xmlData, /<title><!\[CDATA\[HTML Ipsum\]\]>/);
                assert.match(xmlData, /<description><!\[CDATA\[This is my custom excerpt!/);

                done();
            }).catch(done);
        });

        it('should process urls correctly', function (done) {
            data.posts = [posts[3]];

            generateFeed(baseUrl, data).then(function (xmlData) {
                assertExists(xmlData);

                // anchor URL - <a href="#nowhere" title="Anchor URL">
                assert.match(xmlData, /<a href="#nowhere" title="Anchor URL">/);

                // relative URL - <a href="/about#nowhere" title="Relative URL">
                assert.match(xmlData, /<a href="http:\/\/my-ghost-blog.com\/about#nowhere" title="Relative URL">/);

                // protocol relative URL - <a href="//somewhere.com/link#nowhere" title="Protocol Relative URL">
                assert.match(xmlData, /<a href="\/\/somewhere.com\/link#nowhere" title="Protocol Relative URL">/);

                // absolute URL - <a href="http://somewhere.com/link#nowhere" title="Absolute URL">
                assert.match(xmlData, /<a href="http:\/\/somewhere.com\/link#nowhere" title="Absolute URL">/);

                done();
            }).catch(done);
        });
    });

    describe('Card reformatting', function () {
        before(function () {
            let postWithBookmark = posts[0];
            let postWithVideo = posts[1];
            let postWithAudio = posts[2];

            postWithBookmark.html = callRenderer('bookmark', {
                url: 'https://www.ghost.org/',
                icon: 'https://www.ghost.org/favicon.ico',
                title: 'Ghost: The Creator Economy Platform',
                description: 'doing kewl stuff',
                author: 'ghost',
                publisher: 'Ghost - The Professional Publishing Platform',
                thumbnail: 'https://ghost.org/images/meta/ghost.png',
                caption: 'caption here'
            });

            postWithVideo.html = callRenderer('video', {
                src: '/content/images/2022/11/koenig-lexical.mp4',
                caption: 'This is a <b>caption</b>',
                fileName: 'koenig-lexical.mp4',
                mimeType: 'video/mp4',
                width: 200,
                height: 100,
                duration: 60,
                thumbnailSrc: '/content/images/2022/11/koenig-lexical.jpg',
                customThumbnailSrc: '/content/images/2022/11/koenig-lexical-custom.jpg',
                thumbnailWidth: 100,
                thumbnailHeight: 50
            });

            postWithAudio.html = callRenderer('audio', {
                src: '/content/audio/2022/11/koenig-lexical.mp3',
                title: 'Test Audio',
                duration: 60,
                mimeType: 'audio/mp3',
                thumbnailSrc: '/content/images/2022/11/koenig-audio-lexical.jpg'
            });

            data.posts = [postWithBookmark, postWithVideo, postWithAudio];
        });

        it('should remove clutter from bookmark card', function (done) {
            // Check if original card content is present
            data.posts[0].html.html.should.match(/kg-bookmark-thumbnail/);
            data.posts[0].html.html.should.match(/kg-bookmark-icon/);
            data.posts[0].html.html.should.match(/kg-bookmark-description/);

            generateFeed(baseUrl, data).then(function (xmlData) {
                should.exist(xmlData);

                xmlData.should.not.match(/kg-bookmark-thumbnail/);
                xmlData.should.not.match(/kg-bookmark-icon/);
                xmlData.should.not.match(/kg-bookmark-description/);

                done();
            }).catch(done);
        });

        it('should remove clutter from video card', function (done) {
            // Check if original card content is present
            data.posts[1].html.html.should.match(/kg-video-overlay/);
            data.posts[1].html.html.should.match(/kg-video-player-container/);

            generateFeed(baseUrl, data).then(function (xmlData) {
                should.exist(xmlData);

                xmlData.should.not.match(/kg-video-overlay/);
                xmlData.should.not.match(/kg-video-player-container/);

                done();
            }).catch(done);
        });

        it('should remove clutter from audio card', function (done) {
            // Check if original card content is present
            data.posts[2].html.html.should.match(/kg-audio-thumbnail/);
            data.posts[2].html.html.should.match(/kg-audio-player/);
            data.posts[2].html.html.should.match(/kg-audio-title/);

            generateFeed(baseUrl, data).then(function (xmlData) {
                should.exist(xmlData);

                xmlData.should.not.match(/kg-audio-thumbnail/);
                xmlData.should.not.match(/kg-audio-player/);
                xmlData.should.not.match(/kg-audio-title/);

                done();
            }).catch(done);
        });
    });
});
