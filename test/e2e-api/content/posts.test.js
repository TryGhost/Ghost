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

describe('Posts Content API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('owner:post', 'users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
    });

    afterEach(function () {
        configUtils.restore();
    });

    const validKey = localUtils.getValidKey();

    it('Can request posts', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

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
    });

    it('Can filter posts by tag', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&filter=tag:kitchen-sink,featured:true&include=tags`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

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
    });

    it('Can filter posts by authors', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&filter=authors:[joe-bloggs,pat,ghost,slimer-mcectoplasm]&include=authors`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

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
    });

    it('Can request fields of posts', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&fields=url`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const jsonResponse = res.body;

        should.exist(jsonResponse.posts);

        localUtils.API.checkResponse(jsonResponse.posts[0], 'post', false, false, ['url']);
        res.body.posts[0].url.should.eql('http://127.0.0.1:2369/welcome/');
    });

    it('Can include relations', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}&include=tags,authors`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

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
    });

    it('Can request posts from different origin', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`posts/?key=${validKey}`))
            .set('Origin', 'https://example.com')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

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
    });

    it('Can filter by published date', async function () {
        function createFilter(publishedAt, op) {
            // This line deliberately uses double quotes because GQL cannot handle either double quotes
            // or escaped singles, see TryGhost/GQL#34
            return encodeURIComponent('published_at:' + op + '\'' + publishedAt + '\'');
        }

        const res = await request
            .get(localUtils.API.getApiQuery(`posts/?key=${validKey}&limit=1`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.exist(res.body.posts[0]);
        const post = res.body.posts[0];
        const publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss');

        post.title.should.eql('Start here for a quick overview of everything you need to know');

        const res2 = await request
            .get(localUtils.API.getApiQuery(`posts/?key=${validKey}&limit=1&filter=${createFilter(publishedAt, `<`)}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.exist(res2.body.posts[0]);
        const post2 = res2.body.posts[0];
        const publishedAt2 = moment(post2.published_at).format('YYYY-MM-DD HH:mm:ss');

        post2.title.should.eql('Customizing your brand and design settings');

        const res3 = await request
            .get(localUtils.API.getApiQuery(`posts/?key=${validKey}&limit=1&filter=${createFilter(publishedAt2, `>`)}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.exist(res3.body.posts[0]);
        const post3 = res3.body.posts[0];

        post3.title.should.eql('Start here for a quick overview of everything you need to know');
    });

    it('Can request a single post', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[0].id}/?key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.posts);
        should.not.exist(jsonResponse.meta);
        jsonResponse.posts.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
    });
});
