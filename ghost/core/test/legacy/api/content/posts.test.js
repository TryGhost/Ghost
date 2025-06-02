const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const configUtils = require('../../../utils/configUtils');
const urlUtils = require('../../../utils/urlUtils');
const config = require('../../../../core/shared/config');

describe('api/endpoints/content/posts', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('users', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
    });

    afterEach(async function () {
        await configUtils.restore();
        urlUtils.restore();
    });

    const validKey = localUtils.getValidKey();

    it('can not filter posts by author.password or authors.password', async function () {
        const hashedPassword = '$2a$10$FxFlCsNBgXw42cBj0l1GFu39jffibqTqyAGBz7uCLwetYAdBYJEe6';
        const userId = '644fd18ca1f0b764b0279b2d';

        await testUtils.knex('users').insert({
            id: userId,
            slug: 'brute-force-password-test-user',
            name: 'Brute Force Password Test User',
            email: 'bruteforcepasswordtestuseremail@example.com',
            password: hashedPassword,
            status: 'active',
            created_at: '2019-01-01 00:00:00',
            created_by: '1'
        });

        const {id: postId} = await testUtils.knex('posts').first('id').where('slug', 'welcome');

        await testUtils.knex('posts_authors').insert({
            id: '644fd18ca1f0b764b0279b2f',
            post_id: postId,
            author_id: userId
        });

        const res = await request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&filter=authors.password:'${hashedPassword}'`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        const data = JSON.parse(res.text);

        await testUtils.knex('posts_authors').where('id', '644fd18ca1f0b764b0279b2f').del();
        await testUtils.knex('users').where('id', userId).del();

        if (data.posts.length === 1) {
            throw new Error('fuck');
        }
    });

    it('can not filter posts by author.email or authors.email', async function () {
        const hashedPassword = '$2a$10$FxFlCsNBgXw42cBj0l1GFu39jffibqTqyAGBz7uCLwetYAdBYJEe6';
        const userEmail = 'bruteforcepasswordtestuseremail@example.com';
        const userId = '644fd18ca1f0b764b0279b2d';

        await testUtils.knex('users').insert({
            id: userId,
            slug: 'brute-force-password-test-user',
            name: 'Brute Force Password Test User',
            email: userEmail,
            password: hashedPassword,
            status: 'active',
            created_at: '2019-01-01 00:00:00',
            created_by: '1'
        });

        const {id: postId} = await testUtils.knex('posts').first('id').where('slug', 'welcome');

        await testUtils.knex('posts_authors').insert({
            id: '644fd18ca1f0b764b0279b2f',
            post_id: postId,
            author_id: userId
        });

        const res = await request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&filter=authors.email:'${userEmail}'`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        const data = JSON.parse(res.text);

        await testUtils.knex('posts_authors').where('id', '644fd18ca1f0b764b0279b2f').del();
        await testUtils.knex('users').where('id', userId).del();

        if (data.posts.length === 1) {
            throw new Error('fuck');
        }
    });

    it('browse posts', function (done) {
        request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Accept-Version, Accept-Encoding');
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
                jsonResponse.posts[6].slug.should.eql('integrations');

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

    it('browse posts with related authors/tags also returns primary_author/primary_tag', function (done) {
        request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&include=authors,tags`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Accept-Version, Accept-Encoding');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);

                const jsonResponse = res.body;
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(11);
                localUtils.API.checkResponse(
                    jsonResponse.posts[0],
                    'post',
                    ['authors', 'tags', 'primary_tag', 'primary_author'],
                    null
                );

                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);

                // Default order 'published_at desc' check
                jsonResponse.posts[0].slug.should.eql('welcome');
                jsonResponse.posts[6].slug.should.eql('integrations');

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

    it('browse posts with unsupported "page" filter returns a request validation error', function () {
        return request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&filter=page:true,featured:true`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(400);
    });

    it('browse posts with published and draft status, should not return drafts', function (done) {
        request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&filter=status:published,status:draft`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                const jsonResponse = res.body;

                jsonResponse.posts.should.be.an.Array().with.lengthOf(11);

                done();
            });
    });

    it('browse posts with slug filter, should order in slug order', function () {
        return request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&filter=slug:[write,ghostly-kitchen-sink,grow]`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;

                jsonResponse.posts.should.be.an.Array().with.lengthOf(3);
                jsonResponse.posts[0].slug.should.equal('write');
                jsonResponse.posts[1].slug.should.equal('ghostly-kitchen-sink');
                jsonResponse.posts[2].slug.should.equal('grow');
            });
    });

    it('browse posts with slug filter should order taking order parameter into account', function () {
        return request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&order=slug%20DESC&filter=slug:[write,ghostly-kitchen-sink,grow]`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;

                jsonResponse.posts.should.be.an.Array().with.lengthOf(3);
                jsonResponse.posts[0].slug.should.equal('write');
                jsonResponse.posts[1].slug.should.equal('grow');
                jsonResponse.posts[2].slug.should.equal('ghostly-kitchen-sink');
            });
    });

    it('ensure origin header on redirect is not getting lost', function (done) {
        // NOTE: force a redirect to the admin url
        configUtils.set('admin:url', 'http://localhost:9999');
        urlUtils.stubUrlUtilsFromConfig();

        request.get(localUtils.API.getApiQuery(`posts?key=${validKey}`))
            .set('Origin', 'https://example.com')
            // 301 Redirects _should_ be cached
            .expect('Cache-Control', testUtils.cacheRules.year)
            .expect(301)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Accept-Version, Accept, Accept-Encoding');
                res.headers.location.should.eql(`http://localhost:9999/ghost/api/content/posts/?key=${validKey}`);
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);
                done();
            });
    });

    it('can\'t read page', function () {
        return request
            .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[5].id}/?key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.noCache)
            .expect(404);
    });

    it('can read post with fields', function () {
        const complexPostId = testUtils.DataGenerator.Content.posts.find(p => p.slug === 'not-so-short-bit-complex').id;

        return request
            .get(localUtils.API.getApiQuery(`posts/${complexPostId}/?key=${validKey}&fields=title,slug,excerpt&formats=plaintext`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .then((res) => {
                localUtils.API.checkResponse(res.body.posts[0], 'post', null, null, ['id', 'title', 'slug', 'excerpt', 'plaintext']);

                // excerpt should transform links to absolute URLs
                res.body.posts[0].excerpt.should.match(/\* Aliquam/);
            });
    });

    describe('content gating', function () {
        let publicPost;
        let membersPost;
        let paidPost;
        let membersPostWithPaywallCard;

        before (function () {
            publicPost = testUtils.DataGenerator.forKnex.createPost({
                slug: 'free-to-see',
                visibility: 'public',
                published_at: new Date('2023-07-15T04:20:30.000+00:00')
            });

            membersPost = testUtils.DataGenerator.forKnex.createPost({
                slug: 'thou-shalt-not-be-seen',
                visibility: 'members',
                published_at: new Date('2023-07-20T04:20:30.000+00:00')
            });

            paidPost = testUtils.DataGenerator.forKnex.createPost({
                slug: 'thou-shalt-be-paid-for',
                visibility: 'paid',
                published_at: new Date('2023-07-25T04:20:30.000+00:00')
            });

            membersPostWithPaywallCard = testUtils.DataGenerator.forKnex.createPost({
                slug: 'thou-shalt-have-a-taste',
                visibility: 'members',
                mobiledoc: '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["paywall",{}]],"sections":[[1,"p",[[0,[],0,"Free content"]]],[10,0],[1,"p",[[0,[],0,"Members content"]]]]}',
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                published_at: new Date('2023-07-30T04:20:30.000+00:00')
            });

            return testUtils.fixtures.insertPosts([
                publicPost,
                membersPost,
                paidPost,
                membersPostWithPaywallCard
            ]);
        });

        it('public post fields are always visible', function () {
            return request
                .get(localUtils.API.getApiQuery(`posts/${publicPost.id}/?key=${validKey}&fields=slug,html,plaintext&formats=html,plaintext`))
                .set('Origin', testUtils.API.getURL())
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .then((res) => {
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.posts);
                    const post = jsonResponse.posts[0];

                    localUtils.API.checkResponse(post, 'post', null, null, ['id', 'slug', 'html', 'plaintext']);
                    post.slug.should.eql('free-to-see');
                    post.html.should.not.eql('');
                    post.plaintext.should.not.eql('');
                });
        });

        it('cannot read members only post content', function () {
            return request
                .get(localUtils.API.getApiQuery(`posts/${membersPost.id}/?key=${validKey}`))
                .set('Origin', testUtils.API.getURL())
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .then((res) => {
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.posts);
                    const post = jsonResponse.posts[0];

                    localUtils.API.checkResponse(post, 'post', null, null);
                    post.slug.should.eql('thou-shalt-not-be-seen');
                    post.html.should.eql('');
                    post.excerpt.should.eql('');
                });
        });

        it('cannot read paid only post content', function () {
            return request
                .get(localUtils.API.getApiQuery(`posts/${paidPost.id}/?key=${validKey}`))
                .set('Origin', testUtils.API.getURL())
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .then((res) => {
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.posts);
                    const post = jsonResponse.posts[0];

                    localUtils.API.checkResponse(post, 'post', null, null);
                    post.slug.should.eql('thou-shalt-be-paid-for');
                    post.html.should.eql('');
                    post.excerpt.should.eql('');
                });
        });

        it('cannot read members only post plaintext', function () {
            return request
                .get(localUtils.API.getApiQuery(`posts/${membersPost.id}/?key=${validKey}&formats=html,plaintext&fields=html,plaintext`))
                .set('Origin', testUtils.API.getURL())
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .then((res) => {
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.posts);
                    const post = jsonResponse.posts[0];

                    localUtils.API.checkResponse(post, 'post', null, null, ['id', 'html', 'plaintext']);
                    post.html.should.eql('');
                    post.plaintext.should.eql('');
                });
        });

        it('can read "free" html and plaintext content of members post when using paywall card', function () {
            return request
                .get(localUtils.API.getApiQuery(`posts/${membersPostWithPaywallCard.id}/?key=${validKey}&formats=html,plaintext`))
                .set('Origin', testUtils.API.getURL())
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .then((res) => {
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.posts);
                    const post = jsonResponse.posts[0];

                    localUtils.API.checkResponse(post, 'post', ['plaintext']);
                    post.html.should.eql('<p>Free content</p>');
                    post.plaintext.should.eql('Free content');
                    post.excerpt.should.eql('Free content');
                });
        });

        it('cannot browse members only posts content', function () {
            return request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}`))
                .set('Origin', testUtils.API.getURL())
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .then((res) => {
                    res.headers.vary.should.eql('Accept-Version, Accept-Encoding');
                    should.exist(res.headers['access-control-allow-origin']);
                    should.not.exist(res.headers['x-cache-invalidate']);

                    const jsonResponse = res.body;
                    should.exist(jsonResponse.posts);
                    localUtils.API.checkResponse(jsonResponse, 'posts');
                    jsonResponse.posts.should.have.length(15);
                    localUtils.API.checkResponse(jsonResponse.posts[0], 'post', null, null);
                    localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                    _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);

                    const membersOnlySlugs = [
                        'thou-shalt-not-be-seen',
                        'thou-shalt-be-paid-for'
                    ];

                    const freeToSeeSlugs = [
                        'free-to-see',
                        'thou-shalt-have-a-taste',
                        'sell'
                    ];

                    let seen = 0;

                    jsonResponse.posts.forEach((post) => {
                        if (membersOnlySlugs.indexOf(post.slug) > -1) {
                            post.html.should.eql('');
                            post.excerpt.should.eql('');
                            seen += 1;
                        } else if (freeToSeeSlugs.indexOf(post.slug) > -1) {
                            post.html.should.not.eql('');
                            post.excerpt.should.not.eql('');
                            seen += 1;
                        }
                    });

                    seen.should.eql(membersOnlySlugs.length + freeToSeeSlugs.length);

                    // check meta response for this test
                    jsonResponse.meta.pagination.page.should.eql(1);
                    jsonResponse.meta.pagination.limit.should.eql(15);
                    jsonResponse.meta.pagination.pages.should.eql(1);
                    jsonResponse.meta.pagination.total.should.eql(15);
                    jsonResponse.meta.pagination.hasOwnProperty('next').should.be.true();
                    jsonResponse.meta.pagination.hasOwnProperty('prev').should.be.true();
                    should.not.exist(jsonResponse.meta.pagination.next);
                    should.not.exist(jsonResponse.meta.pagination.prev);
                });
        });
    });
});
