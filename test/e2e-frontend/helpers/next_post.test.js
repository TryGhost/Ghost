const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const models = require('../../../core/server/models/index');

const next_post = require('../../../core/frontend/helpers/prev_post');

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

describe('e2e {{#next_post}} helper', function () {
    let fn;
    let inverse;
    let publicPost, membersPost, paidPost, basicTierPost, publicPost2;

    before(async function () {
        await testUtils.startGhost({
            backend: true,
            frontend: false
        });

        publicPost = await createPost({
            slug: 'free-to-see',
            visibility: 'public',
            published_at: new Date(2020, 0, 1) // here to ensure sorting is not modified
        });

        membersPost = await createPost({
            slug: 'members-post',
            visibility: 'members',
            published_at: new Date(2020, 0, 2) // here to ensure sorting is not modified
        });

        paidPost = await createPost({
            slug: 'paid-to-see',
            visibility: 'paid',
            published_at: new Date(2020, 0, 3) // here to ensure sorting is not modified
        });

        basicTierPost = await createPost({
            slug: 'tiers-post',
            visibility: 'tiers',
            tiers: [{
                slug: 'default-product'
            }],
            published_at: new Date(2020, 0, 4) // here to ensure sorting is not modified
        });

        publicPost2 = await createPost({
            slug: 'free-to-see',
            visibility: 'public',
            published_at: new Date(2020, 0, 5) // here to ensure sorting is not modified
        });
    });

    // Assert fixtures are correct
    it('has valid fixtures', function () {
        publicPost.visibility.should.eql('public');
        membersPost.visibility.should.eql('members');
        paidPost.visibility.should.eql('paid');
        basicTierPost.visibility.should.eql('tiers');
        publicPost2.visibility.should.eql('public');
    });

    beforeEach(function () {
        fn = sinon.spy();
        inverse = sinon.spy();
    });

    describe('{{access}} property', function () {
        describe('not authenticated member', function () {
            const member = null;
            const locals = {
                root: {
                    context: ['post']
                },
                member
            };
            let optionsData;

            beforeEach(function () {
                optionsData = {name: 'next_post', data: locals, fn, inverse};
            });

            it('next members post', async function () {
                await next_post
                    .call(publicPost, optionsData);

                fn.firstCall.args[0].should.match({id: membersPost.id, access: false});
            });

            it('next paid post', async function () {
                await next_post
                    .call(membersPost, optionsData);

                fn.firstCall.args[0].should.match({id: paidPost.id, access: false});
            });

            it('next tiers post', async function () {
                await next_post
                    .call(paidPost, optionsData);

                fn.firstCall.args[0].should.match({id: basicTierPost.id, access: false});
            });

            it('next public post', async function () {
                await next_post
                    .call(basicTierPost, optionsData);

                fn.firstCall.args[0].should.match({id: publicPost2.id, access: true});
            });
        });

        describe('free member', function () {
            const member = buildMember('free');
            const locals = {
                root: {
                    context: ['post']
                },
                member
            };
            let optionsData;

            beforeEach(function () {
                optionsData = {name: 'next_post', data: locals, fn, inverse};
            });

            it('next members post', async function () {
                await next_post
                    .call(publicPost, optionsData);

                fn.firstCall.args[0].should.match({id: membersPost.id, access: true});
            });

            it('next paid post', async function () {
                await next_post
                    .call(membersPost, optionsData);

                fn.firstCall.args[0].should.match({id: paidPost.id, access: false});
            });

            it('next tiers post', async function () {
                await next_post
                    .call(paidPost, optionsData);

                fn.firstCall.args[0].should.match({id: basicTierPost.id, access: false});
            });

            it('next public post', async function () {
                await next_post
                    .call(basicTierPost, optionsData);

                fn.firstCall.args[0].should.match({id: publicPost2.id, access: true});
            });
        });

        describe('paid member', function () {
            const member = buildMember('paid');
            const locals = {
                root: {
                    context: ['post']
                },
                member
            };
            let optionsData;

            beforeEach(function () {
                optionsData = {name: 'next_post', data: locals, fn, inverse};
            });

            it('next members post', async function () {
                await next_post
                    .call(publicPost, optionsData);

                fn.firstCall.args[0].should.match({id: membersPost.id, access: true});
            });

            it('next paid post', async function () {
                await next_post
                    .call(membersPost, optionsData);

                fn.firstCall.args[0].should.match({id: paidPost.id, access: true});
            });

            it('next tiers post', async function () {
                await next_post
                    .call(paidPost, optionsData);

                fn.firstCall.args[0].should.match({id: basicTierPost.id, access: false});
            });

            it('next public post', async function () {
                await next_post
                    .call(basicTierPost, optionsData);

                fn.firstCall.args[0].should.match({id: publicPost2.id, access: true});
            });
        });

        describe('tiers member', function () {
            const member = buildMember('tiers', [{
                name: 'Default Product',
                slug: 'default-product',
                type: 'paid',
                active: true
            }]);

            const locals = {
                root: {
                    context: ['post']
                },
                member
            };
            let optionsData;

            beforeEach(function () {
                optionsData = {name: 'next_post', data: locals, fn, inverse};
            });

            it('next members post', async function () {
                await next_post
                    .call(publicPost, optionsData);

                fn.firstCall.args[0].should.match({id: membersPost.id, access: true});
            });

            it('next paid post', async function () {
                await next_post
                    .call(membersPost, optionsData);

                fn.firstCall.args[0].should.match({id: paidPost.id, access: true});
            });

            it('next tiers post', async function () {
                await next_post
                    .call(paidPost, optionsData);

                fn.firstCall.args[0].should.match({id: basicTierPost.id, access: true});
            });

            it('next public post', async function () {
                await next_post
                    .call(basicTierPost, optionsData);

                fn.firstCall.args[0].should.match({id: publicPost2.id, access: true});
            });
        });

        describe('tiers member with different product', function () {
            const member = buildMember('tiers', [{
                name: 'Default Product',
                slug: 'pro-product',
                type: 'paid',
                active: true
            }]);

            const locals = {
                root: {
                    context: ['post']
                },
                member
            };
            let optionsData;

            beforeEach(function () {
                optionsData = {name: 'next_post', data: locals, fn, inverse};
            });

            it('next members post', async function () {
                await next_post
                    .call(publicPost, optionsData);

                fn.firstCall.args[0].should.match({id: membersPost.id, access: true});
            });

            it('next paid post', async function () {
                await next_post
                    .call(membersPost, optionsData);

                fn.firstCall.args[0].should.match({id: paidPost.id, access: true});
            });

            it('next tiers post', async function () {
                await next_post
                    .call(paidPost, optionsData);

                fn.firstCall.args[0].should.match({id: basicTierPost.id, access: false});
            });

            it('next public post', async function () {
                await next_post
                    .call(basicTierPost, optionsData);

                fn.firstCall.args[0].should.match({id: publicPost2.id, access: true});
            });
        });
    });
});
