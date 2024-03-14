const assert = require('assert/strict');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const models = require('../../../core/server/models/index');

const DEFAULT_POST_FIXTURE_COUNT = 7;

const get = require('../../../core/frontend/helpers/get');

async function createPost(data) {
    const post = testUtils.DataGenerator.forKnex.createPost(data);
    await models.Post.add(post, {context: {internal: true}});
    return post;
}

function buildMember(status, products = []) {
    return {
        uuid: '1234',
        email: 'test@example.com',
        name: 'John Doe',
        firstname: 'John',
        avatar_image: null,
        subscriptions: [],
        paid: status !== 'free',
        status: status,
        products
    };
}

function testPosts(posts, map) {
    posts.should.be.an.Array();
    posts.length.should.eql(DEFAULT_POST_FIXTURE_COUNT + Object.keys(map).length);

    // Free post
    for (const postID in map) {
        const expectData = map[postID];

        const post = posts.find(p => p.id === postID);
        should.exist(post);

        post.should.match(expectData);
    }
}

describe('e2e {{#get}} helper', function () {
    let fn;
    let inverse;
    let locals = {};
    let publicPost, membersPost, paidPost, basicTierPost;

    before(async function () {
        await testUtils.startGhost({
            backend: true,
            frontend: false
        });

        publicPost = await createPost({
            slug: 'free-to-see',
            visibility: 'public',
            published_at: new Date() // here to ensure sorting is not modified
        });

        membersPost = await createPost({
            slug: 'members-post',
            visibility: 'members',
            published_at: new Date() // here to ensure sorting is not modified
        });

        paidPost = await createPost({
            slug: 'paid-to-see',
            visibility: 'paid',
            published_at: new Date() // here to ensure sorting is not modified
        });

        const defaultTier = await models.Product.findOne({slug: 'default-product'});

        basicTierPost = await createPost({
            slug: 'tiers-post',
            visibility: 'tiers',
            tiers: [{
                id: defaultTier.get('id')
            }],
            published_at: new Date() // here to ensure sorting is not modified
        });
    });

    // Assert fixtures are correct
    it('has valid fixtures', function () {
        publicPost.visibility.should.eql('public');
        membersPost.visibility.should.eql('members');
        paidPost.visibility.should.eql('paid');
        basicTierPost.visibility.should.eql('tiers');
    });

    beforeEach(function () {
        fn = sinon.spy();
        inverse = sinon.spy();
        locals = {root: {_locals: {}}};
    });

    describe('Filter optimisation', function () {
        it('Does not do filter optimisation on OR queries', async function () {
            await get.call({}, 'posts', {
                hash: {
                    filter: `tag:-hash-hidden,id:-${publicPost.id}`,
                    limit: '5'
                },
                data: {},
                locals,
                fn,
                inverse
            });
            assert.notEqual(fn.firstCall.args[0].meta.cacheabilityOptimisation, true);
        });
        it('Does not do filter optimisation on nested id queries', async function () {
            await get.call({}, 'posts', {
                hash: {
                    filter: `tag:-hash-hidden+(id:-${publicPost.id},id:-${membersPost.id})`,
                    limit: '5'
                },
                data: {},
                locals,
                fn,
                inverse
            });
            assert.notEqual(fn.firstCall.args[0].meta.cacheabilityOptimisation, true);
        });
        it('Does not do filter optimisation on multiple negated id queries', async function () {
            await get.call({}, 'posts', {
                hash: {
                    filter: `id:-${publicPost.id}+id:-${membersPost.id}`,
                    limit: '5'
                },
                data: {},
                locals,
                fn,
                inverse
            });
            assert.notEqual(fn.firstCall.args[0].meta.cacheabilityOptimisation, true);
        });
        it('Returns the correct posts with limit as a string', async function () {
            await get.call({}, 'posts', {
                hash: {
                    limit: '5'
                },
                data: {},
                locals,
                fn,
                inverse
            });
            const firstPostUsually = fn.firstCall.args[0].posts[0];
            const firstLimit = fn.firstCall.args[0].meta.pagination.limit;
            assert.equal(firstLimit, 5);
            await get.call({}, 'posts', {
                hash: {
                    filter: `id:-${firstPostUsually.id}`,
                    limit: '5'
                },
                data: {},
                locals,
                fn,
                inverse
            });
            assert.equal(fn.secondCall.args[0].meta.cacheabilityOptimisation, true);
            const foundFilteredPost = fn.secondCall.args[0].posts.find(post => post.id === firstPostUsually.id);
            assert.equal(foundFilteredPost, undefined);
        });
        it('Returns the correct posts with default limit', async function () {
            await get.call({}, 'posts', {
                hash: {},
                data: {},
                locals,
                fn,
                inverse
            });
            const firstPostUsually = fn.firstCall.args[0].posts[0];
            const defaultLimit = fn.firstCall.args[0].meta.pagination.limit;
            await get.call({}, 'posts', {
                hash: {
                    filter: `id:-${firstPostUsually.id}`
                },
                data: {},
                locals,
                fn,
                inverse
            });
            assert.equal(fn.secondCall.args[0].meta.pagination.limit, defaultLimit);
            assert.equal(fn.secondCall.args[0].meta.cacheabilityOptimisation, true);
            const foundFilteredPost = fn.secondCall.args[0].posts.find(post => post.id === firstPostUsually.id);
            assert.equal(foundFilteredPost, undefined);
        });
        it('Returns the correct posts with a limit all', async function () {
            await get.call({}, 'posts', {
                hash: {
                    limit: 'all'
                },
                data: {},
                locals,
                fn,
                inverse
            });
            const firstPostUsually = fn.firstCall.args[0].posts[0];
            const initialCount = fn.firstCall.args[0].posts.length;
            await get.call({}, 'posts', {
                hash: {
                    filter: `id:-${firstPostUsually.id}`,
                    limit: 'all'
                },
                data: {},
                locals,
                fn,
                inverse
            });
            assert.equal(fn.secondCall.args[0].posts.length, initialCount - 1);
            assert.equal(fn.secondCall.args[0].meta.pagination.limit, 'all');
            assert.equal(fn.secondCall.args[0].meta.cacheabilityOptimisation, true);
            const foundFilteredPost = fn.secondCall.args[0].posts.find(post => post.id === firstPostUsually.id);
            assert.equal(foundFilteredPost, undefined);
        });
        it('Returns the correct posts with a solo negative filter', async function () {
            await get.call({}, 'posts', {
                hash: {
                    limit: 1
                },
                data: {},
                locals,
                fn,
                inverse
            });
            const firstPostUsually = fn.firstCall.args[0].posts[0];
            await get.call({}, 'posts', {
                hash: {
                    filter: `id:-${firstPostUsually.id}`,
                    limit: 5
                },
                data: {},
                locals,
                fn,
                inverse
            });
            assert.equal(fn.secondCall.args[0].posts.length, 5);
            assert.equal(fn.secondCall.args[0].meta.pagination.limit, 5);
            assert.equal(fn.secondCall.args[0].meta.cacheabilityOptimisation, true);
            const foundFilteredPost = fn.secondCall.args[0].posts.find(post => post.id === firstPostUsually.id);
            assert.equal(foundFilteredPost, undefined);
        });
        it('Returns the correct posts with a sandwiched negative filter', async function () {
            await get.call({}, 'posts', {
                hash: {
                    filter: `tag:-hash-hidden+visibility:public`,
                    limit: 1
                },
                data: {},
                locals,
                fn,
                inverse
            });
            const firstPostUsually = fn.firstCall.args[0].posts[0];
            await get.call({}, 'posts', {
                hash: {
                    filter: `visibility:public+id:-${firstPostUsually.id}+tag:-hash-hidden`,
                    limit: 5
                },
                data: {},
                locals,
                fn,
                inverse
            });
            assert.equal(fn.secondCall.args[0].posts.length, 5);
            assert.equal(fn.secondCall.args[0].meta.pagination.limit, 5);
            assert.equal(fn.secondCall.args[0].meta.cacheabilityOptimisation, true);
            const foundFilteredPost = fn.secondCall.args[0].posts.find(post => post.id === firstPostUsually.id);
            assert.equal(foundFilteredPost, undefined);
        });
        it('Returns the correct posts with a prefix negative filter', async function () {
            await get.call({}, 'posts', {
                hash: {
                    filter: `tag:-hash-hidden`,
                    limit: 1
                },
                data: {},
                locals,
                fn,
                inverse
            });
            const firstPostUsually = fn.firstCall.args[0].posts[0];
            await get.call({}, 'posts', {
                hash: {
                    filter: `id:-${firstPostUsually.id}+tag:-hash-hidden`,
                    limit: 5
                },
                data: {},
                locals,
                fn,
                inverse
            });
            assert.equal(fn.secondCall.args[0].posts.length, 5);
            assert.equal(fn.secondCall.args[0].meta.pagination.limit, 5);
            assert.equal(fn.secondCall.args[0].meta.cacheabilityOptimisation, true);
            const foundFilteredPost = fn.secondCall.args[0].posts.find(post => post.id === firstPostUsually.id);
            assert.equal(foundFilteredPost, undefined);
        });
        it('Returns the correct posts with a suffix negative filter', async function () {
            await get.call({}, 'posts', {
                hash: {
                    filter: `tag:-hash-hidden`,
                    limit: 1
                },
                data: {},
                locals,
                fn,
                inverse
            });
            const firstPostUsually = fn.firstCall.args[0].posts[0];
            await get.call({}, 'posts', {
                hash: {
                    filter: `tag:-hash-hidden+id:-${firstPostUsually.id}`,
                    limit: 5
                },
                data: {},
                locals,
                fn,
                inverse
            });
            assert.equal(fn.secondCall.args[0].posts.length, 5);
            assert.equal(fn.secondCall.args[0].meta.pagination.limit, 5);
            assert.equal(fn.secondCall.args[0].meta.cacheabilityOptimisation, true);
            const foundFilteredPost = fn.secondCall.args[0].posts.find(post => post.id === firstPostUsually.id);
            assert.equal(foundFilteredPost, undefined);
        });
    });

    describe('{{access}} property', function () {
        let member;

        it('not authenticated member', async function () {
            member = null;
            locals = {root: {_locals: {}}, member};
            await get.call(
                {},
                'posts',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            );
            testPosts(fn.firstCall.args[0].posts, {
                [publicPost.id]: {
                    access: true
                },
                [membersPost.id]: {
                    access: false
                },
                [paidPost.id]: {
                    access: false
                },
                [basicTierPost.id]: {
                    access: false
                }
            });
        });

        it('free member', async function () {
            member = buildMember('free');
            locals = {root: {_locals: {}}, member};
            await get.call(
                {},
                'posts',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            );
            testPosts(fn.firstCall.args[0].posts, {
                [publicPost.id]: {
                    access: true
                },
                [membersPost.id]: {
                    access: true
                },
                [paidPost.id]: {
                    access: false
                },
                [basicTierPost.id]: {
                    access: false
                }
            });
        });

        it('paid member', async function () {
            member = buildMember('paid');
            locals = {root: {_locals: {}}, member};
            await get.call(
                {},
                'posts',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            );
            testPosts(fn.firstCall.args[0].posts, {
                [publicPost.id]: {
                    access: true
                },
                [membersPost.id]: {
                    access: true
                },
                [paidPost.id]: {
                    access: true
                },
                [basicTierPost.id]: {
                    access: false
                }
            });
        });

        it('comped member', async function () {
            member = buildMember('comped');
            locals = {root: {_locals: {}}, member};
            await get.call(
                {},
                'posts',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            );
            testPosts(fn.firstCall.args[0].posts, {
                [publicPost.id]: {
                    access: true
                },
                [membersPost.id]: {
                    access: true
                },
                [paidPost.id]: {
                    access: true
                },
                [basicTierPost.id]: {
                    access: false
                }
            });
        });

        /**
         * When using the get helper, you need to include tiers to properly determine {{access}} for posts with specific tiers
         */
        it('tiers member not including tiers', async function () {
            member = buildMember('paid', [{
                name: 'Default Product',
                slug: 'default-product',
                type: 'paid',
                active: true
            }]);

            locals = {root: {_locals: {}}, member};
            await get.call(
                {},
                'posts',
                {hash: {}, data: locals, fn: fn, inverse: inverse}
            );
            testPosts(fn.firstCall.args[0].posts, {
                [publicPost.id]: {
                    access: true
                },
                [membersPost.id]: {
                    access: true
                },
                [paidPost.id]: {
                    access: true
                },
                [basicTierPost.id]: {
                    access: false
                }
            });
        });

        it('tiers member including tiers', async function () {
            member = buildMember('paid', [{
                name: 'Default Product',
                slug: 'default-product',
                type: 'paid',
                active: true
            }]);

            locals = {root: {_locals: {}}, member};
            await get.call(
                {},
                'posts',
                {hash: {include: 'tiers'}, data: locals, fn: fn, inverse: inverse}
            );
            testPosts(fn.firstCall.args[0].posts, {
                [publicPost.id]: {
                    access: true
                },
                [membersPost.id]: {
                    access: true
                },
                [paidPost.id]: {
                    access: true
                },
                [basicTierPost.id]: {
                    access: true
                }
            });
        });

        it('tiers member with different product', async function () {
            member = buildMember('paid', [{
                name: 'Default Product',
                slug: 'pro-product',
                type: 'paid',
                active: true
            }]);

            locals = {root: {_locals: {}}, member};
            await get.call(
                {},
                'posts',
                {hash: {include: 'tiers'}, data: locals, fn: fn, inverse: inverse}
            );
            testPosts(fn.firstCall.args[0].posts, {
                [publicPost.id]: {
                    access: true
                },
                [membersPost.id]: {
                    access: true
                },
                [paidPost.id]: {
                    access: true
                },
                [basicTierPost.id]: {
                    access: false
                }
            });
        });
    });
});
