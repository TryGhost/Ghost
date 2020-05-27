const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const url = require('url');
const cheerio = require('cheerio');
const moment = require('moment');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;
let request;

describe('Posts Content API', function () {
    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.initFixtures('owner:post', 'users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
            });
    });

    afterEach(function () {
        configUtils.restore();
    });

    const validKey = localUtils.getValidKey();

    it('Can request posts', function (done) {
        request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Accept-Encoding');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);

                const jsonResponse = res.body;
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(11);
                localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);

                // Default order 'published_at desc' check
                jsonResponse.posts[0].slug.should.eql('welcome');
                jsonResponse.posts[6].slug.should.eql('themes');

                // check meta response for this test
                jsonResponse.meta.pagination.page.should.eql(1);
                jsonResponse.meta.pagination.limit.should.eql(15);
                jsonResponse.meta.pagination.pages.should.eql(1);
                jsonResponse.meta.pagination.total.should.eql(11);
                jsonResponse.meta.pagination.hasOwnProperty('next').should.be.true();
                jsonResponse.meta.pagination.hasOwnProperty('prev').should.be.true();
                should.not.exist(jsonResponse.meta.pagination.next);
                should.not.exist(jsonResponse.meta.pagination.prev);

                // kitchen sink
                res.body.posts[9].slug.should.eql(testUtils.DataGenerator.Content.posts[1].slug);

                let urlParts = url.parse(res.body.posts[9].feature_image);
                should.exist(urlParts.protocol);
                should.exist(urlParts.host);

                urlParts = url.parse(res.body.posts[9].url);
                should.exist(urlParts.protocol);
                should.exist(urlParts.host);

                const $ = cheerio.load(res.body.posts[9].html);
                urlParts = url.parse($('img').attr('src'));
                should.exist(urlParts.protocol);
                should.exist(urlParts.host);

                res.body.posts[7].slug.should.eql('not-so-short-bit-complex');
                res.body.posts[7].html.should.match(/<a href="http:\/\/127.0.0.1:2369\/about#nowhere" title="Relative URL/);
                res.body.posts[9].slug.should.eql('ghostly-kitchen-sink');
                res.body.posts[9].html.should.match(/<img src="http:\/\/127.0.0.1:2369\/content\/images\/lol.jpg"/);

                done();
            });
    });

    it('Can filter posts by tag', function (done) {
        request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&filter=tag:kitchen-sink,featured:true&include=tags`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                const jsonResponse = res.body;
                const ids = _.map(jsonResponse.posts, 'id');

                should.not.exist(res.headers['x-cache-invalidate']);
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse, 'posts');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                // should content filtered data and order
                jsonResponse.posts.should.have.length(4);
                ids.should.eql([
                    testUtils.DataGenerator.Content.posts[4].id,
                    testUtils.DataGenerator.Content.posts[2].id,
                    testUtils.DataGenerator.Content.posts[1].id,
                    testUtils.DataGenerator.Content.posts[0].id
                ]);

                // Each post must either be featured or have the tag 'kitchen-sink'
                _.each(jsonResponse.posts, (post) => {
                    if (post.featured) {
                        post.featured.should.equal(true);
                    } else {
                        const tags = _.map(post.tags, 'slug');
                        tags.should.containEql('kitchen-sink');
                    }
                });

                // The meta object should contain the right detail
                jsonResponse.meta.should.have.property('pagination');
                jsonResponse.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                jsonResponse.meta.pagination.page.should.eql(1);
                jsonResponse.meta.pagination.limit.should.eql(15);
                jsonResponse.meta.pagination.pages.should.eql(1);
                jsonResponse.meta.pagination.total.should.eql(4);
                should.equal(jsonResponse.meta.pagination.next, null);
                should.equal(jsonResponse.meta.pagination.prev, null);
                done();
            });
    });

    it('Can filter posts by authors', function (done) {
        request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&filter=authors:[joe-bloggs,pat,ghost,slimer-mcectoplasm]&include=authors`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                const jsonResponse = res.body;
                const ids = _.map(jsonResponse.posts, 'id');

                should.not.exist(res.headers['x-cache-invalidate']);
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse, 'posts');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                // 2. The data part of the response should be correct
                // We should have 2 matching items
                jsonResponse.posts.should.be.an.Array().with.lengthOf(11);

                // The API orders by number of matched authors.
                jsonResponse.posts[0].slug.should.eql('not-so-short-bit-complex');

                // Each post must either have the author 'joe-bloggs' or 'ghost', 'pat' is non existing author
                const primaryAuthors = _.map(jsonResponse.posts, function (post) {
                    return post.primary_author.slug;
                });

                primaryAuthors.should.matchAny(/joe-bloggs|ghost'/);
                _.filter(primaryAuthors, (value) => {
                    return value === 'ghost';
                }).length.should.eql(7);

                _.filter(primaryAuthors, (value) => {
                    return value === 'joe-bloggs';
                }).length.should.eql(4);

                done();
            });
    });

    it('Can request fields of posts', function (done) {
        request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&fields=url`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                const jsonResponse = res.body;

                should.exist(jsonResponse.posts);

                localUtils.API.checkResponse(jsonResponse.posts[0], 'post', false, false, ['url']);
                res.body.posts[0].url.should.eql('http://127.0.0.1:2369/welcome/');
                done();
            });
    });

    it('Can include relations', function (done) {
        request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&include=tags,authors`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.exist(res.body.posts);

                // kitchen sink
                res.body.posts[9].slug.should.eql(testUtils.DataGenerator.Content.posts[1].slug);

                should.exist(res.body.posts[9].tags);
                should.exist(res.body.posts[9].tags[0].url);
                should.exist(url.parse(res.body.posts[9].tags[0].url).protocol);
                should.exist(url.parse(res.body.posts[9].tags[0].url).host);

                should.exist(res.body.posts[9].primary_tag);
                should.exist(res.body.posts[9].primary_tag.url);
                should.exist(url.parse(res.body.posts[9].primary_tag.url).protocol);
                should.exist(url.parse(res.body.posts[9].primary_tag.url).host);

                should.exist(res.body.posts[9].authors);
                should.exist(res.body.posts[9].authors[0].url);
                should.exist(url.parse(res.body.posts[9].authors[0].url).protocol);
                should.exist(url.parse(res.body.posts[9].authors[0].url).host);

                should.exist(res.body.posts[9].primary_author);
                should.exist(res.body.posts[9].primary_author.url);
                should.exist(url.parse(res.body.posts[9].primary_author.url).protocol);
                should.exist(url.parse(res.body.posts[9].primary_author.url).host);

                done();
            });
    });

    it('Can request posts from different origin', function (done) {
        request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}`))
            .set('Origin', 'https://example.com')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Accept-Encoding');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);

                const jsonResponse = res.body;
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(11);
                localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                done();
            });
    });

    it('Can filter by published date', function (done) {
        function createFilter(publishedAt, op) {
            // This line deliberately uses double quotes because GQL cannot handle either double quotes
            // or escaped singles, see TryGhost/GQL#34
            return encodeURIComponent('published_at:' + op + '\'' + publishedAt + '\'');
        }

        request
            .get(localUtils.API.getApiQuery(`posts/?key=${validKey}&limit=1`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then(function (res) {
                should.exist(res.body.posts[0]);
                const post = res.body.posts[0];
                const publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss');

                post.title.should.eql('Welcome to Ghost');

                return request
                    .get(localUtils.API.getApiQuery(`posts/?key=${validKey}&limit=1&filter=${createFilter(publishedAt, `<`)}`))
                    .set('Origin', testUtils.API.getURL())
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then(function (res) {
                should.exist(res.body.posts[0]);
                const post = res.body.posts[0];
                const publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss');

                post.title.should.eql('Writing posts with Ghost ✍️');

                return request
                    .get(localUtils.API.getApiQuery(`posts/?key=${validKey}&limit=1&filter=${createFilter(publishedAt, `>`)}`))
                    .set('Origin', testUtils.API.getURL())
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then(function (res) {
                should.exist(res.body.posts[0]);
                const post = res.body.posts[0];

                post.title.should.eql('Welcome to Ghost');

                done();
            })
            .catch(done);
    });

    it('Can request a single post', function () {
        return request
            .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[0].id}/?key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse.posts);
                should.not.exist(jsonResponse.meta);
                jsonResponse.posts.should.have.length(1);
                localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
            });
    });
});
