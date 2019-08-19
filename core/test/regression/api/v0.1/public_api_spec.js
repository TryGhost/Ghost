var should = require('should'),
    supertest = require('supertest'),
    _ = require('lodash'),
    url = require('url'),
    cheerio = require('cheerio'),
    moment = require('moment'),
    testUtils = require('../../../utils/index'),
    localUtils = require('./utils'),
    configUtils = require('../../../utils/configUtils'),
    urlUtils = require('../../../utils/urlUtils'),
    config = require('../../../../server/config/index'),
    models = require('../../../../server/models/index'),
    ghost = testUtils.startGhost,
    request;

describe('Public API', function () {
    var ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'client:trusted-domain');
            })
            .then(function (token) {
                return request.put(localUtils.API.getApiQuery('settings/'))
                    .set('Authorization', 'Bearer ' + token)
                    .send({
                        settings: [{
                            key: 'labs',
                            value: {publicAPI: true}
                        }]
                    })
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then(() => {});
            });
    });

    afterEach(function () {
        configUtils.restore();
        urlUtils.restore();
    });

    it('browse posts', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Origin, Accept-Encoding');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);

                var jsonResponse = res.body;
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(11);
                localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                _.isBoolean(jsonResponse.posts[0].page).should.eql(true);

                // Public API does not return drafts
                _.map(jsonResponse.posts, (post) => {
                    post.status.should.eql('published');
                });

                // Default order check
                jsonResponse.posts[0].slug.should.eql('welcome');
                jsonResponse.posts[10].slug.should.eql('html-ipsum');

                // check meta response for this test
                jsonResponse.meta.pagination.page.should.eql(1);
                jsonResponse.meta.pagination.limit.should.eql(15);
                jsonResponse.meta.pagination.pages.should.eql(1);
                jsonResponse.meta.pagination.total.should.eql(11);
                jsonResponse.meta.pagination.hasOwnProperty('next').should.be.true();
                jsonResponse.meta.pagination.hasOwnProperty('prev').should.be.true();
                should.not.exist(jsonResponse.meta.pagination.next);
                should.not.exist(jsonResponse.meta.pagination.prev);

                done();
            });
    });

    it('browse posts with basic filters', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&filter=tag:kitchen-sink,featured:true&include=tags'))
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

                // API does not return drafts
                jsonResponse.posts.forEach((post) => {
                    post.page.should.be.false();
                    post.status.should.eql('published');
                });

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

    it('read post with filter', function () {
        return request
            .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[0].id}/?client_id=ghost-admin&client_secret=not_available&filter=slug:test`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                // proofs that "filter" does not work for v0.1
                localUtils.API.checkResponse(res.body.posts[0], 'post');
            });
    });

    it('browse posts with inverse filters', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&filter=tag:-[bacon,pollo,getting-started]&include=tags'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                const jsonResponse = res.body;

                should.not.exist(res.headers['x-cache-invalidate']);
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse, 'posts');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                jsonResponse.posts.should.have.length(2);

                jsonResponse.posts[0].slug.should.eql('not-so-short-bit-complex');
                jsonResponse.posts[0].tags.length.should.eql(0);
                jsonResponse.posts[1].slug.should.eql('short-and-sweet');
                jsonResponse.posts[1].tags.length.should.eql(1);
                jsonResponse.posts[1].tags[0].slug.should.eql('chorizo');

                done();
            });
    });

    it('browse posts with author filter', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&filter=authors:[joe-bloggs,pat,ghost]&include=authors'))
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

                // Each post must either have the author 'joe-bloggs' or 'ghost', 'pat' is non existing author
                const authors = _.map(jsonResponse.posts, function (post) {
                    return post.primary_author.slug;
                });

                authors.should.matchAny(/joe-bloggs|ghost'/);
                done();
            });
    });

    it('browse posts with page filter', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&filter=page:true'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                const jsonResponse = res.body;

                should.not.exist(res.headers['x-cache-invalidate']);
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse, 'posts');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                jsonResponse.posts.should.be.an.Array().with.lengthOf(1);

                const page = _.map(jsonResponse.posts, 'page');
                page.should.matchEach(true);

                jsonResponse.posts[0].id.should.equal(testUtils.DataGenerator.Content.posts[5].id);

                done();
            });
    });

    it('browse posts with published and draft status, should not return drafts', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&filter=status:published,status:draft'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                const jsonResponse = res.body;

                jsonResponse.posts.should.be.an.Array().with.lengthOf(11);
                jsonResponse.posts.forEach((post) => {
                    post.page.should.be.false();
                    post.status.should.eql('published');
                });

                done();
            });
    });

    it('[deprecated] browse posts with page non matching filter', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&filter=tag:no-posts'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                const jsonResponse = res.body;

                jsonResponse.posts.should.be.an.Array().with.lengthOf(0);

                jsonResponse.meta.should.have.property('pagination');
                jsonResponse.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                jsonResponse.meta.pagination.page.should.eql(1);
                jsonResponse.meta.pagination.limit.should.eql(15);
                jsonResponse.meta.pagination.pages.should.eql(1);
                jsonResponse.meta.pagination.total.should.eql(0);
                should.equal(jsonResponse.meta.pagination.next, null);
                should.equal(jsonResponse.meta.pagination.prev, null);

                done();
            });
    });

    it('browse posts: request absolute urls', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&absolute_urls=true'))
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

                done();
            });
    });

    it('browse posts: request only url fields', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&fields=url'))
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
                res.body.posts[0].url.should.eql('/welcome/');
                done();
            });
    });

    it('browse posts: request only url fields with include and absolute_urls', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&fields=url&include=tags&absolute_urls=true'))
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

                localUtils.API.checkResponse(jsonResponse.posts[0], 'post', false, false, ['url','tags']);
                jsonResponse.posts[0].url.should.eql('http://127.0.0.1:2369/welcome/');
                jsonResponse.posts[0].tags[0].url.should.eql('http://127.0.0.1:2369/tag/getting-started/');
                done();
            });
    });

    it('browse posts: request to include tags and authors with absolute_urls', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&absolute_urls=true&include=tags,authors'))
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

    it('browse posts: request to include tags and authors without absolute_urls', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&include=tags,authors'))
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
                should.not.exist(res.body.posts[9].tags[0].url);

                should.exist(res.body.posts[9].primary_tag);
                should.not.exist(res.body.posts[9].primary_tag.url);

                should.exist(res.body.posts[9].authors);
                should.not.exist(res.body.posts[9].authors[0].url);

                should.exist(res.body.posts[9].primary_author);
                should.not.exist(res.body.posts[9].primary_author.url);

                done();
            });
    });

    it('browse posts from different origin', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-test&client_secret=not_available'))
            .set('Origin', 'https://example.com')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Origin, Accept-Encoding');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);

                var jsonResponse = res.body;
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(11);
                localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                done();
            });
    });

    it('ensure origin header on redirect is not getting lost', function (done) {
        // NOTE: force a redirect to the admin url
        configUtils.set('admin:url', 'http://localhost:9999');
        urlUtils.stubUrlUtilsFromConfig();

        request.get(localUtils.API.getApiQuery('posts?client_id=ghost-test&client_secret=not_available'))
            .set('Origin', 'https://example.com')
            // 301 Redirects _should_ be cached
            .expect('Cache-Control', testUtils.cacheRules.year)
            .expect(301)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Origin, Accept, Accept-Encoding');
                res.headers.location.should.eql('http://localhost:9999/ghost/api/v0.1/posts/?client_id=ghost-test&client_secret=not_available');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);
                done();
            });
    });

    it('browse posts, ignores staticPages', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&staticPages=true'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(11);
                localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                done();
            });
    });

    it('browse tags without limit defaults to 15', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.tags);
                localUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(15);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags - limit=all should fetch all tags', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?limit=all&client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.tags);
                localUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(56);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags without limit=4 fetches 4 tags', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?limit=4&client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.tags);
                localUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(4);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags: request absolute urls', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?client_id=ghost-admin&client_secret=not_available&absolute_urls=true'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.exist(res.body.tags[0].url);
                should.exist(url.parse(res.body.tags[0].url).protocol);
                should.exist(url.parse(res.body.tags[0].url).host);

                done();
            });
    });

    it('browse tags - limit=all should fetch all tags and include count.posts', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?limit=all&client_id=ghost-admin&client_secret=not_available&include=count.posts'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                const jsonResponse = res.body;

                should.exist(jsonResponse.tags);
                jsonResponse.tags.should.be.an.Array().with.lengthOf(56);

                // Each tag should have the correct count
                _.find(jsonResponse.tags, {name: 'Getting Started'}).count.posts.should.eql(7);
                _.find(jsonResponse.tags, {name: 'kitchen sink'}).count.posts.should.eql(2);
                _.find(jsonResponse.tags, {name: 'bacon'}).count.posts.should.eql(2);
                _.find(jsonResponse.tags, {name: 'chorizo'}).count.posts.should.eql(1);
                _.find(jsonResponse.tags, {name: 'pollo'}).count.posts.should.eql(0);
                _.find(jsonResponse.tags, {name: 'injection'}).count.posts.should.eql(0);

                done();
            });
    });

    it('denies access with invalid client_secret', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=invalid_secret'))
            .set('Origin', testUtils.API.getURL())
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType', 'context']);
                done();
            });
    });

    it('denies access with invalid client_id', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=invalid-id&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType', 'context']);
                done();
            });
    });

    it('does not send CORS headers on an invalid origin', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', 'http://invalid-origin')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                should.not.exist(res.headers['access-control-allow-origin']);

                done();
            });
    });

    it('denies access to settings endpoint', function (done) {
        request.get(localUtils.API.getApiQuery('settings/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                done();
            });
    });

    it('throws version mismatch error when request includes a version', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .set('Accept', 'application/json')
            .set('X-Ghost-Version', '0.3')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(400)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                jsonResponse.errors[0].errorType.should.eql('VersionMismatchError');

                done();
            });
    });

    it('browse users', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.users);
                localUtils.API.checkResponse(jsonResponse, 'users');
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address, status and other attrs.
                localUtils.API.checkResponse(jsonResponse.users[0], 'user', null, null, null, {public: true});

                // Public api returns all users, but no status! Locked/Inactive users can still have written articles.
                models.User.findPage(Object.assign({status: 'all'}, testUtils.context.internal))
                    .then((response) => {
                        _.map(response.data, model => model.toJSON()).length.should.eql(7);
                        done();
                    });
            });
    });

    it('browse users: ignores fetching roles', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&include=roles'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.users);
                localUtils.API.checkResponse(jsonResponse, 'users');
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address.
                localUtils.API.checkResponse(jsonResponse.users[0], 'user', null, null, null, {public: true});
                done();
            });
    });

    it('browse users: request absolute urls', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&absolute_urls=true'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.exist(res.body.users[0].url);
                should.exist(url.parse(res.body.users[0].url).protocol);
                should.exist(url.parse(res.body.users[0].url).host);

                done();
            });
    });

    it('browse user by slug: ignores fetching roles', function (done) {
        request.get(localUtils.API.getApiQuery('users/slug/ghost/?client_id=ghost-admin&client_secret=not_available&include=roles'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                // We don't expose the email address.
                localUtils.API.checkResponse(jsonResponse.users[0], 'user', null, null, null, {public: true});
                done();
            });
    });

    it('browse user by slug: count.posts', function (done) {
        request.get(localUtils.API.getApiQuery('users/slug/ghost/?client_id=ghost-admin&client_secret=not_available&include=count.posts'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                // We don't expose the email address.
                localUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count'], null, null, {public: true});
                done();
            });
    });

    it('browse user by id: count.posts', function (done) {
        request.get(localUtils.API.getApiQuery('users/1/?client_id=ghost-admin&client_secret=not_available&include=count.posts'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                // We don't expose the email address.
                localUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count'], null, null, {public: true});
                done();
            });
    });

    it('browse user with count.posts', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&include=count.posts&order=count.posts ASC'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body;

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address.
                localUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count'], null, null, {public: true});

                // Each user should have the correct count
                _.find(jsonResponse.users, {slug: 'joe-bloggs'}).count.posts.should.eql(4);
                _.find(jsonResponse.users, {slug: 'contributor'}).count.posts.should.eql(0);
                _.find(jsonResponse.users, {slug: 'slimer-mcectoplasm'}).count.posts.should.eql(1);
                _.find(jsonResponse.users, {slug: 'jimothy-bogendath'}).count.posts.should.eql(0);
                _.find(jsonResponse.users, {slug: 'smith-wellingsworth'}).count.posts.should.eql(0);
                _.find(jsonResponse.users, {slug: 'ghost'}).count.posts.should.eql(7);
                _.find(jsonResponse.users, {slug: 'inactive'}).count.posts.should.eql(0);

                const ids = jsonResponse.users
                    .filter(user => (user.slug !== 'ghost'))
                    .filter(user => (user.slug !== 'inactive'))
                    .map(user => user.id);

                ids.should.eql([
                    testUtils.DataGenerator.Content.users[1].id,
                    testUtils.DataGenerator.Content.users[2].id,
                    testUtils.DataGenerator.Content.users[7].id,
                    testUtils.DataGenerator.Content.users[3].id,
                    testUtils.DataGenerator.Content.users[0].id
                ]);

                done();
            });
    });

    it('[unsupported] browse user by email', function (done) {
        request
            .get(localUtils.API.getApiQuery('users/email/ghost-author@ghost.org/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403)
            .end(function (err) {
                if (err) {
                    return done(err);
                }

                done();
            });
    });

    it('browse user by id: ignores fetching roles', function (done) {
        request.get(localUtils.API.getApiQuery('users/1/?client_id=ghost-admin&client_secret=not_available&include=roles'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                localUtils.API.checkResponse(jsonResponse.users[0], 'user', null, null, null, {public: true});
                done();
            });
    });

    it('browse users: post count', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&include=count.posts'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.users);
                localUtils.API.checkResponse(jsonResponse, 'users');
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address.
                localUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count'], null, null, {public: true});
                done();
            });
    });

    it('browse users: wrong data type for include', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&include={}'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.users);
                localUtils.API.checkResponse(jsonResponse, 'users');
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address.
                localUtils.API.checkResponse(jsonResponse.users[0], 'user', null, null, null, {public: true});
                done();
            });
    });

    it('fetch the most recent post, then the prev, then the next should match the first', function (done) {
        function createFilter(publishedAt, op) {
            // This line deliberately uses double quotes because GQL cannot handle either double quotes
            // or escaped singles, see TryGhost/GQL#34
            // eslint-disable-next-line quotes
            return encodeURIComponent("published_at:" + op + "'" + publishedAt + "'");
        }

        request
            .get(localUtils.API.getApiQuery(
                'posts/?client_id=ghost-admin&client_secret=not_available&limit=1'
            ))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then(function (res) {
                should.exist(res.body.posts[0]);
                var post = res.body.posts[0],
                    publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss');

                post.title.should.eql('Welcome to Ghost');

                return request
                    .get(localUtils.API.getApiQuery(
                        'posts/?client_id=ghost-admin&client_secret=not_available&limit=1&filter='
                        + createFilter(publishedAt, '<')
                    ))
                    .set('Origin', testUtils.API.getURL())
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then(function (res) {
                should.exist(res.body.posts[0]);
                var post = res.body.posts[0],
                    publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss');

                post.title.should.eql('Writing posts with Ghost ✍️');

                return request
                    .get(localUtils.API.getApiQuery(
                        'posts/?client_id=ghost-admin&client_secret=not_available&limit=1&filter='
                        + createFilter(publishedAt, '>')
                    ))
                    .set('Origin', testUtils.API.getURL())
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then(function (res) {
                should.exist(res.body.posts[0]);
                var post = res.body.posts[0];

                post.title.should.eql('Welcome to Ghost');

                done();
            })
            .catch(done);
    });
});

