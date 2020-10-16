const supertest = require('supertest');
const _ = require('lodash');
const should = require('should');

const testUtils = require('../../utils');
const localUtils = require('../api/canary/admin/utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');
const ghost = testUtils.startGhost;
const authorContext = testUtils.context.owner;
let request;

describe('Stats', function () {
    before(async function () {
        await ghost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
        await request.put(localUtils.API.getApiQuery('themes/test-theme/activate'));
    });

    describe('Post', function () {
        const getPostCount = async function () {
            const res = await request.get('/');
            const result = res.text.match(/Total posts: (\d+)/);

            return result ? parseInt(result[1]) : null;
        };

        it('publish', async function () {
            const initialPostCount = await getPostCount();

            const newPost = testUtils.DataGenerator.forModel.posts[2];

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            // Publish the post
            await models.Post.edit({status: 'published'}, _.extend({}, authorContext, {id: createdPost.id}));

            const postCount = await getPostCount();

            postCount.should.equal(initialPostCount + 1);

            // clean up
            await createdPost.destroy();
        });

        it('unpublish', async function () {
            const initialPostCount = await getPostCount();

            const newPost = testUtils.DataGenerator.forModel.posts[0];

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            // Unpublish the post
            await models.Post.edit({status: 'draft'}, _.extend({}, authorContext, {id: createdPost.id}));

            const postCount = await getPostCount();

            postCount.should.equal(initialPostCount);

            // clean up
            await createdPost.destroy();
        });

        it('delete', async function () {
            const newPost = testUtils.DataGenerator.forModel.posts[0];
            newPost.status = 'published';

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            // Count post
            const initialPostCount = await getPostCount();

            // Delete post
            await models.Post.destroy({id: createdPost.id});

            // Check post count
            const postCount = await getPostCount();

            postCount.should.equal(initialPostCount - 1);
        });
    });

    describe('Member', function () {
        const getMemberCount = async function () {
            const res = await request.get('/');
            const result = res.text.match(/Total members: (\d+)/);

            return result ? parseInt(result[1]) : null;
        };

        it('member added', async function () {
            const initialMemberCount = await getMemberCount();

            const context = testUtils.context.admin;

            const createdMember = await models.Member.add({
                email: 'test@member.com',
                labels: []
            }, context);

            // Check post count
            const memberCount = await getMemberCount();

            memberCount.should.equal(initialMemberCount + 1);
        });

        it('member subscribed', async function () {
            const initialMemberCount = await getMemberCount();

            const context = testUtils.context.admin;

            const createdMember = await models.Member.add({
                email: 'test2@member.com',
                labels: []
            }, context);

            await models.MemberStripeCustomer.add({
                member_id: createdMember.id,
                customer_id: 'fake_customer_id1'
            }, context);

            await models.StripeCustomerSubscription.add({
                customer_id: 'fake_customer_id1',
                subscription_id: 'fake_subscription_id1',
                plan_id: 'fake_plan_id',
                plan_amount: 1337,
                plan_nickname: 'e-LEET',
                plan_interval: 'year',
                plan_currency: 'btc',
                status: 'active',
                start_date: new Date(),
                current_period_end: new Date(),
                cancel_at_period_end: false
            }, context);

            // Check post count
            const memberCount = await getMemberCount();

            memberCount.should.equal(initialMemberCount + 1);
        });

        it('member unsubscribed', async function () {
            const context = testUtils.context.admin;

            const createdMember = await models.Member.add({
                email: 'test3@member.com',
                labels: []
            }, context);

            await models.MemberStripeCustomer.add({
                member_id: createdMember.id,
                customer_id: 'fake_customer_id2'
            }, context);

            const sub = await models.StripeCustomerSubscription.add({
                customer_id: 'fake_customer_id2',
                subscription_id: 'fake_subscription_id2',
                plan_id: 'fake_plan_id',
                plan_amount: 1337,
                plan_nickname: 'e-LEET',
                plan_interval: 'year',
                plan_currency: 'btc',
                status: 'active',
                start_date: new Date(),
                current_period_end: new Date(),
                cancel_at_period_end: false
            }, context);

            const initialMemberCount = await getMemberCount();

            // Unsubscribe
            await sub.destroy();

            // Check post count
            const memberCount = await getMemberCount();

            memberCount.should.equal(initialMemberCount);
        });

        it('member deleted', async function () {
            const context = testUtils.context.admin;

            const createdMember = await models.Member.add({
                email: 'test4@member.com',
                labels: []
            }, context);

            const initialMemberCount = await getMemberCount();

            // delete
            await models.Member.destroy({id: createdMember.id});

            // Check post count
            const memberCount = await getMemberCount();

            memberCount.should.equal(initialMemberCount - 1);
        });
    });
});
