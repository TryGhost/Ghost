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

        basicTierPost = await createPost({
            slug: 'tiers-post',
            visibility: 'tiers',
            tiers: [{
                slug: 'default-product'
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
