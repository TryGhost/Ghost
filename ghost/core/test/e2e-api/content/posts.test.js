const assert = require('assert/strict');
const cheerio = require('cheerio');
const moment = require('moment');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');

const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {anyArray, anyContentVersion, anyErrorId, anyEtag, anyUuid, anyISODateTimeWithTZ} = matchers;

const postMatcher = {
    published_at: anyISODateTimeWithTZ,
    created_at: anyISODateTimeWithTZ,
    updated_at: anyISODateTimeWithTZ,
    uuid: anyUuid
};

const postMatcherShallowIncludes = Object.assign(
    {},
    postMatcher, {
        tags: anyArray,
        authors: anyArray
    }
);

async function trackDb(fn, skip) {
    const db = require('../../../core/server/data/db');
    if (db?.knex?.client?.config?.client !== 'sqlite3') {
        return skip();
    }
    /** @type {import('sqlite3').Database} */
    const database = db.knex.client;

    const queries = [];
    function handler(/** @type {{sql: string}} */ query) {
        queries.push(query);
    }

    database.on('query', handler);

    await fn();

    database.off('query', handler);

    return queries;
}

describe('Posts Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('owner:post', 'users', 'user:inactive', 'posts', 'tags:extra', 'api_keys', 'newsletters', 'members:newsletters');
        await agent.authenticate();

        // Assign a newsletter to one of the posts
        const newsletterId = testUtils.DataGenerator.Content.newsletters[0].id;
        const postId = testUtils.DataGenerator.Content.posts[0].id;
        await models.Post.edit({newsletter_id: newsletterId}, {id: postId});
    });

    it('Can request posts', async function () {
        const res = await agent.get('posts/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(11)
                    .fill(postMatcher)
            });

        assert.equal(res.body.posts[0].slug, 'welcome', 'Default order "published_at desc" check');
        assert.equal(res.body.posts[6].slug, 'integrations', 'Default order "published_at desc" check');

        // kitchen sink
        assert.equal(res.body.posts[9].slug, fixtureManager.get('posts', 1).slug);

        let urlParts = new URL(res.body.posts[9].feature_image);
        assert.equal(urlParts.protocol, 'http:');
        assert.equal(urlParts.host, '127.0.0.1:2369');

        urlParts = new URL(res.body.posts[9].url);
        assert.equal(urlParts.protocol, 'http:');
        assert.equal(urlParts.host, '127.0.0.1:2369');

        const $ = cheerio.load(res.body.posts[9].html);
        urlParts = new URL($('img').attr('src'));
        assert.equal(urlParts.protocol, 'http:');
        assert.equal(urlParts.host, '127.0.0.1:2369');

        assert.equal(res.body.posts[7].slug, 'not-so-short-bit-complex');
        assert.match(res.body.posts[7].html, /<a href="http:\/\/127.0.0.1:2369\/about#nowhere" title="Relative URL/);
        assert.equal(res.body.posts[9].slug, 'ghostly-kitchen-sink');
        assert.match(res.body.posts[9].html, /<img src="http:\/\/127.0.0.1:2369\/content\/images\/lol.jpg"/);
    });

    it('Cannot request mobiledoc or lexical formats', async function () {
        await agent
            .get(`posts/?formats=mobiledoc,lexical`)
            .expectStatus(200)
            .matchBodySnapshot({
                posts: new Array(11).fill(postMatcher)
            });
    });

    it('Cannot request mobiledoc or lexical fields', async function () {
        await agent
            .get(`posts/?fields=mobiledoc,lexical,published_at,created_at,updated_at,uuid`)
            .expectStatus(200)
            .matchBodySnapshot({
                posts: new Array(11).fill(postMatcher)
            });
    });

    it('Errors upon invalid filter value', async function () {
        if (process.env.NODE_ENV !== 'testing-mysql') {
            this.skip();
        }

        await agent
            .get(`posts/?filter=published_at%3A%3C%271715091791890%27`)
            .expectStatus(422)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });

    it('Can filter posts by tag', async function () {
        const res = await agent.get('posts/?filter=tag:kitchen-sink,featured:true&include=tags')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(4)
                    .fill(postMatcher)
            });

        const jsonResponse = res.body;
        const ids = jsonResponse.posts.map(p => p.id);

        assert.equal(jsonResponse.posts.length, 4);
        assert.deepEqual(ids, [
            fixtureManager.get('posts', 4).id,
            fixtureManager.get('posts', 2).id,
            fixtureManager.get('posts', 1).id,
            fixtureManager.get('posts', 0).id
        ], 'Should have content filtered and ordered');

        jsonResponse.posts.forEach((post) => {
            if (post.featured) {
                assert.equal(post.featured, true, `Each post must either be featured or have the tag 'kitchen-sink'`);
            } else {
                const tag = post.tags
                    .map(t => t.slug)
                    .filter(s => s === 'kitchen-sink')
                    .pop();
                assert.equal(tag, 'kitchen-sink', `Each post must either be featured or have the tag 'kitchen-sink'`);
            }
        });
    });

    it('Can filter posts by authors', async function () {
        const res = await agent
            .get('posts/?filter=authors:[joe-bloggs,pat,ghost,slimer-mcectoplasm]&include=authors')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(11)
                    .fill(postMatcher)
            });

        const jsonResponse = res.body;

        assert.equal(jsonResponse.posts[0].slug, 'welcome', 'The API orders by number of matched authors, then by published_at desc, then by id desc');

        const primaryAuthors = jsonResponse.posts.map((post) => {
            return post.primary_author.slug;
        });
        const ghostPrimaryAuthors = primaryAuthors.filter((value) => {
            return value === 'ghost';
        });
        const joePrimaryAuthors = primaryAuthors.filter((value) => {
            return value === 'joe-bloggs';
        });

        assert.equal(ghostPrimaryAuthors.length, 7, `Each post must either have the author 'joe-bloggs' or 'ghost', 'pat' is non existing author`);
        assert.equal(joePrimaryAuthors.length, 4, `Each post must either have the author 'joe-bloggs' or 'ghost', 'pat' is non existing author`);
    });

    it('Can request fields of posts', async function () {
        await agent
            .get('posts/?&fields=url')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot();
    });

    it('Can include relations', async function () {
        await agent
            .get('posts/?include=tags,authors')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(11)
                    .fill(postMatcherShallowIncludes)
            });
    });

    it('Can request posts from different origin', async function () {
        await agent
            .get('posts/')
            .header('Origin', 'https://example.com')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(11)
                    .fill(postMatcher)
            });
    });

    it('Can filter by published date', async function () {
        function createFilter(publishedAt, op) {
            // This line deliberately uses double quotes because GQL cannot handle either double quotes
            // or escaped singles, see TryGhost/GQL#34
            return encodeURIComponent('published_at:' + op + '\'' + publishedAt + '\'');
        }

        const res = await agent
            .get('posts/?limit=1')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(1)
                    .fill(postMatcher)
            });

        const post = res.body.posts[0];
        const publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss');

        const res2 = await agent
            .get(`posts/?limit=1&filter=${createFilter(publishedAt, `<`)}`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(1)
                    .fill(postMatcher)
            });

        const post2 = res2.body.posts[0];
        const publishedAt2 = moment(post2.published_at).format('YYYY-MM-DD HH:mm:ss');

        assert.equal(post2.title, 'Customizing your brand and design settings');

        const res3 = await agent
            .get(`posts/?limit=1&filter=${createFilter(publishedAt2, `>`)}`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(1)
                    .fill(postMatcher)
            });

        const post3 = res3.body.posts[0];
        assert.equal(post3.title, 'Start here for a quick overview of everything you need to know');
    });

    it('Can request a single post', async function () {
        await agent
            .get(`posts/${fixtureManager.get('posts', 0).id}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(1)
                    .fill(postMatcher)
            });
    });

    it('Can include free and paid tiers for public post', async function () {
        const publicPost = testUtils.DataGenerator.forKnex.createPost({
            slug: 'free-to-see',
            visibility: 'public',
            published_at: moment().add(15, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(publicPost, {context: {internal: true}});

        const publicPostRes = await agent
            .get(`posts/${publicPost.id}/?include=tiers`)
            .expectStatus(200);
        const publicPostData = publicPostRes.body.posts[0];
        publicPostData.tiers.length.should.eql(2);
    });

    it('Can include free and paid tiers for members only post', async function () {
        const membersPost = testUtils.DataGenerator.forKnex.createPost({
            slug: 'thou-shalt-not-be-seen',
            visibility: 'members',
            published_at: moment().add(45, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(membersPost, {context: {internal: true}});

        const membersPostRes = await agent
            .get(`posts/${membersPost.id}/?include=tiers`)
            .expectStatus(200);
        const membersPostData = membersPostRes.body.posts[0];
        membersPostData.tiers.length.should.eql(2);
    });

    it('Can include only paid tier for paid post', async function () {
        const paidPost = testUtils.DataGenerator.forKnex.createPost({
            slug: 'thou-shalt-be-paid-for',
            visibility: 'paid',
            published_at: moment().add(30, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(paidPost, {context: {internal: true}});

        const paidPostRes = await agent
            .get(`posts/${paidPost.id}/?include=tiers`)
            .expectStatus(200);
        const paidPostData = paidPostRes.body.posts[0];
        paidPostData.tiers.length.should.eql(1);
    });

    it('Can include specific tier for post with tiers visibility', async function () {
        const res = await agent
            .get(`tiers/`)
            .expectStatus(200);

        const jsonResponse = res.body;
        const paidTier = jsonResponse.tiers.find(p => p.type === 'paid');

        const tiersPost = testUtils.DataGenerator.forKnex.createPost({
            slug: 'thou-shalt-be-for-specific-tiers',
            visibility: 'tiers',
            published_at: moment().add(30, 'seconds').toDate() // here to ensure sorting is not modified
        });

        tiersPost.tiers = [paidTier];

        await models.Post.add(tiersPost, {context: {internal: true}});

        const tiersPostRes = await agent
            .get(`posts/${tiersPost.id}/?include=tiers`)
            .expectStatus(200);

        const tiersPostData = tiersPostRes.body.posts[0];

        tiersPostData.tiers.length.should.eql(1);
    });

    it('Can use post excerpt as field', async function () {
        await agent
            .get(`posts/?fields=excerpt`)
            .expectStatus(200)
            .matchBodySnapshot();
    });

    it('Can use post plaintext as field', async function () {
        await agent
            .get(`posts/?fields=plaintext`)
            .expectStatus(200)
            .matchBodySnapshot();
    });

    it('Adds ?ref tags', async function () {
        const post = await models.Post.add({
            title: 'title',
            status: 'published',
            slug: 'add-ref-tags',
            mobiledoc: JSON.stringify({version: '0.3.1',atoms: [],cards: [['html',{html: '<a href="https://example.com">Link</a><a href="invalid">Test</a>'}]],markups: [],sections: [[10,0],[1,'p',[]]],ghostVersion: '4.0'})
        }, {context: {internal: true}});

        let response = await agent
            .get(`posts/${post.id}/`)
            .expectStatus(200);
        assert(response.body.posts[0].html.includes('<a href="https://example.com/?ref=127.0.0.1">Link</a><a href="invalid">Test</a>'), 'Html not expected (should contain ?ref): ' + response.body.posts[0].html);

        // Disable outbound link tracking
        mockManager.mockSetting('outbound_link_tagging', false);
        response = await agent
            .get(`posts/${post.id}/`)
            .expectStatus(200);
        assert(response.body.posts[0].html.includes('<a href="https://example.com">Link</a><a href="invalid">Test</a>'), 'Html not expected: ' + response.body.posts[0].html);
    });

    it('Does not select * by default', async function () {
        let queries = await trackDb(() => agent.get('posts/?limit=all').expectStatus(200), this.skip.bind(this));
        let postsRelatedQueries = queries.filter(q => q.sql.includes('`posts`'));
        for (const query of postsRelatedQueries) {
            assert(!query.sql.includes('*'), 'Query should not select *');
        }

        queries = await trackDb(() => agent.get('posts/?limit=3').expectStatus(200), this.skip.bind(this));
        postsRelatedQueries = queries.filter(q => q.sql.includes('`posts`'));
        for (const query of postsRelatedQueries) {
            assert(!query.sql.includes('*'), 'Query should not select *');
        }

        queries = await trackDb(() => agent.get('posts/?include=tags,authors').expectStatus(200), this.skip.bind(this));
        postsRelatedQueries = queries.filter(q => q.sql.includes('`posts`'));
        for (const query of postsRelatedQueries) {
            assert(!query.sql.includes('*'), 'Query should not select *');
        }
    });

    it('Strips out gated blocks not viewable by anonymous viewers ', async function () {
        const post = await models.Post.add({
            title: 'title',
            status: 'published',
            slug: 'gated-blocks',
            lexical: JSON.stringify({root: {children: [{type: 'html',version: 1,html: '<p>Visible to free/paid members</p>',visibility: {web: {nonMember: false,memberSegment: 'status:free,status:-free'},email: {memberSegment: ''}}},{type: 'html',version: 1,html: '<p>Visible to anonymous viewers</p>',visibility: {web: {nonMember: true,memberSegment: ''},email: {memberSegment: ''}}},{children: [],direction: null,format: '',indent: 0,type: 'paragraph',version: 1}],direction: null,format: '',indent: 0,type: 'root',version: 1}})
        }, {context: {internal: true}});

        const response = await agent
            .get(`posts/${post.id}/`)
            .expectStatus(200);

        assert.doesNotMatch(response.body.posts[0].html, /Visible to free\/paid members/);
        assert.match(response.body.posts[0].html, /Visible to anonymous viewers/);
    });
});
