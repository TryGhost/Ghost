const supertest = require('supertest');
const _ = require('lodash');
const moment = require('moment');
const should = require('should');

const testUtils = require('../../utils');
const localUtils = require('../api/canary/admin/utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');
const ghost = testUtils.startGhost;
const authorContext = testUtils.context.owner;
let request;

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function post() {
    return _.clone(testUtils.DataGenerator.forModel.posts[0]);
}

describe('Stats', function () {
    before(async function () {
        await ghost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
        await request.put(localUtils.API.getApiQuery('themes/test-theme/activate'));
    });

    describe('Post', function () {
        const getPostCount = async function () {
            // wait for global template update.
            await sleep(200);

            const res = await request.get('/');
            const total = res.text.match(/Total posts: (\d+)/);
            const members = res.text.match(/Total members posts: (\d+)/);
            const paid = res.text.match(/Total paid members posts: (\d+)/);

            return {
                total: total ? parseInt(total[1]) : null,
                members: members ? parseInt(members[1]) : null,
                paid: paid ? parseInt(paid[1]) : null
            };
        };

        it('counts only published posts', async function () {
            const initialPostCount = await getPostCount();

            const newPost = post();

            // Create post by saving it. + Don't publish it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            const postCount = await getPostCount();

            postCount.total.should.equal(initialPostCount.total);

            // clean up
            await createdPost.destroy();
        });

        it('publish', async function () {
            const initialPostCount = await getPostCount();

            const newPost = post();

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            // Publish the post
            await models.Post.edit({status: 'published'}, _.extend({}, authorContext, {id: createdPost.id}));

            const postCount = await getPostCount();

            postCount.total.should.equal(initialPostCount.total + 1);
            postCount.members.should.equal(initialPostCount.members);
            postCount.paid.should.equal(initialPostCount.paid);

            // clean up
            await createdPost.destroy();
        });

        it('unpublish', async function () {
            const newPost = post();
            newPost.status = 'published';

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            const initialPostCount = await getPostCount();

            // Unpublish the post
            await models.Post.edit({status: 'draft'}, _.extend({}, authorContext, {id: createdPost.id}));

            const postCount = await getPostCount();

            postCount.total.should.equal(initialPostCount.total - 1);
            postCount.members.should.equal(initialPostCount.members);
            postCount.paid.should.equal(initialPostCount.paid);

            // clean up
            await createdPost.destroy();
        });

        it('delete', async function () {
            const newPost = post();
            newPost.status = 'published';

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            // Count post
            const initialPostCount = await getPostCount();

            // Delete post
            await models.Post.destroy({id: createdPost.id});

            // Check post count
            const postCount = await getPostCount();

            postCount.total.should.equal(initialPostCount.total - 1);
            postCount.members.should.equal(initialPostCount.members);
            postCount.paid.should.equal(initialPostCount.paid);
        });

        it('publishes a members post', async function () {
            const initialPostCount = await getPostCount();

            const newPost = post();

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            // Publish the post
            await models.Post.edit({status: 'published', visibility: 'members'}, _.extend({}, authorContext, {id: createdPost.id}));

            const postCount = await getPostCount();

            postCount.total.should.equal(initialPostCount.total + 1);
            postCount.members.should.equal(initialPostCount.members + 1);
            postCount.paid.should.equal(initialPostCount.paid);

            // clean up
            await models.Post.destroy({id: createdPost.id});
        });

        it('publishes a paid post', async function () {
            const initialPostCount = await getPostCount();

            const newPost = post();

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            // Publish the post
            await models.Post.edit({status: 'published', visibility: 'paid'}, _.extend({}, authorContext, {id: createdPost.id}));

            const postCount = await getPostCount();

            postCount.total.should.equal(initialPostCount.total + 1);
            postCount.members.should.equal(initialPostCount.members);
            postCount.paid.should.equal(initialPostCount.paid + 1);

            // clean up
            await createdPost.destroy();
        });

        it('changes a members post to a paid post', async function () {
            const newPost = post();
            newPost.status = 'published';
            newPost.visibility = 'members';

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            const initialPostCount = await getPostCount();

            // Publish the post
            await models.Post.edit({visibility: 'paid'}, _.extend({}, authorContext, {id: createdPost.id}));

            const postCount = await getPostCount();

            postCount.total.should.equal(initialPostCount.total);
            postCount.members.should.equal(initialPostCount.members - 1);
            postCount.paid.should.equal(initialPostCount.paid + 1);

            // clean up
            await createdPost.destroy();
        });
    });

    describe('Member', function () {
        const getMemberCount = async function () {
            // wait for global template update.
            await sleep(200);

            const res = await request.get('/');
            const total = res.text.match(/Total members: (\d+)/);
            const free = res.text.match(/Total free members: (\d+)/);
            const paid = res.text.match(/Total paid members: (\d+)/);

            return {
                total: total ? parseInt(total[1]) : null,
                free: free ? parseInt(free[1]) : null,
                paid: paid ? parseInt(paid[1]) : null
            };
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

            memberCount.total.should.equal(initialMemberCount.total + 1);
            memberCount.free.should.equal(initialMemberCount.free + 1);
            memberCount.paid.should.equal(initialMemberCount.paid);

            // clean up
            await models.Member.destroy({id: createdMember.id});
        });

        it('member subscribed', async function () {
            // Add a member first.
            const context = testUtils.context.admin;

            const createdMember = await models.Member.add({
                email: 'test2@member.com',
                labels: []
            }, context);

            // Count current members.
            const initialMemberCount = await getMemberCount();

            // Subscribe.
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

            // Check post count change.
            const memberCount = await getMemberCount();

            memberCount.total.should.equal(initialMemberCount.total);
            memberCount.free.should.equal(initialMemberCount.free - 1);
            memberCount.paid.should.equal(initialMemberCount.paid + 1);

            // clean up
            await models.Member.destroy({id: createdMember.id});
        });

        it('member unsubscribed', async function () {
            // Add a member and subscribe.
            const context = testUtils.context.admin;

            const createdMember = await models.Member.add({
                email: 'test3@member.com',
                labels: []
            }, context);

            const rel = await models.MemberStripeCustomer.add({
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

            // Count current members.
            const initialMemberCount = await getMemberCount();

            // Unsubscribe
            await models.StripeCustomerSubscription.destroy({id: sub.id});
            await models.MemberStripeCustomer.destroy({id: rel.id});

            // Check post count
            const memberCount = await getMemberCount();

            memberCount.total.should.equal(initialMemberCount.total);
            memberCount.free.should.equal(initialMemberCount.free + 1);
            memberCount.paid.should.equal(initialMemberCount.paid - 1);

            // clean up
            await models.Member.destroy({id: createdMember.id});
        });

        it('member deleted', async function () {
            // Add a member.
            const context = testUtils.context.admin;

            const createdMember = await models.Member.add({
                email: 'test4@member.com',
                labels: []
            }, context);

            // Count current members.
            const initialMemberCount = await getMemberCount();

            // delete
            await models.Member.destroy({id: createdMember.id});

            // Check post count
            const memberCount = await getMemberCount();

            memberCount.total.should.equal(initialMemberCount.total - 1);
            memberCount.free.should.equal(initialMemberCount.free - 1);
            memberCount.paid.should.equal(initialMemberCount.paid);
        });
    });

    describe('Tag', function () {
        const getTagCount = async function () {
            // wait for global template update.
            await sleep(200);

            const res = await request.get('/');
            const total = res.text.match(/Total tags: (\d+)/);

            return total ? parseInt(total[1]) : null;
        };

        it('does not count unused tags', async function () {
            const initialTagCount = await getTagCount();

            const createdTag = await models.Tag.add({
                name: 'test tag',
                slug: 'test-tag'
            });

            const newPost = post();
            newPost.status = 'published';

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            const tagCount = await getTagCount();

            tagCount.should.equal(initialTagCount);

            // clean up
            await models.Tag.destroy({id: createdTag.id});
            await models.Post.destroy({id: createdPost.id});
        });

        it('tag added to a post', async function () {
            const initialTagCount = await getTagCount();

            const createdTag = await models.Tag.add({
                name: 'test tag',
                slug: 'test-tag'
            });

            const newPost = post();
            newPost.status = 'published';
            newPost.tags = [
                {id: createdTag.id}
            ];

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            const tagCount = await getTagCount();

            tagCount.should.equal(initialTagCount + 1);

            // clean up
            await models.Tag.destroy({id: createdTag.id});
            await models.Post.destroy({id: createdPost.id});
        });

        it('tag deleted', async function () {
            const createdTag = await models.Tag.add({
                name: 'test tag',
                slug: 'test-tag'
            });

            const newPost = post();
            newPost.status = 'published';
            newPost.tags = [
                {id: createdTag.id}
            ];

            // Create post by saving it.
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            const initialTagCount = await getTagCount();

            await models.Tag.destroy({id: createdTag.id});

            const tagCount = await getTagCount();

            tagCount.should.equal(initialTagCount - 1);

            // clean up
            await models.Post.destroy({id: createdPost.id});
        });
    });

    describe('Author', function () {
        const getAuthorCount = async function () {
            // wait for global template update.
            await sleep(200);

            const res = await request.get('/');
            const total = res.text.match(/Total authors: (\d+)/);

            return total ? parseInt(total[1]) : null;
        };

        it('does not count users with no published post', async function () {
            // Count authors
            const initialTagCount = await getAuthorCount();

            // Create user
            const createdUser = await models.User.add({
                name: 'Hello Worlder',
                slug: 'hello-worlder',
                email: 'helloworlder@gmail.com',
                password: '1234aa56789'
            });

            // Publish a post without using that user.
            const ghostUser = await models.User.findOne({email: 'ghost-author@example.com'});
            const testAuthorContext = {
                context: {
                    user: ghostUser.id
                }
            };

            const newPost = post();
            newPost.status = 'published';

            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, testAuthorContext));

            // Check count
            const authorCount = await getAuthorCount();

            authorCount.should.equal(initialTagCount);

            // clean up
            await models.User.destroy({id: createdUser.id});
            await models.Post.destroy({id: createdPost.id});
            await db.knex('posts_authors').where({author_id: createdUser.id}).del();
        });

        it('a user wrote a post', async function () {
            // Count authors
            const initialAuthorCount = await getAuthorCount();

            // Create user and publish post with that user.
            const createdUser = await models.User.add({
                name: 'Hello Worlder 2',
                slug: 'hello-worlder',
                email: 'helloworlder-2@gmail.com',
                password: '1234aa56789'
            });

            const newPost = post();
            newPost.status = 'published';

            const testAuthorContext = {
                context: {
                    user: createdUser.id
                }
            };

            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, testAuthorContext));

            // Check count
            const authorCount = await getAuthorCount();

            authorCount.should.equal(initialAuthorCount + 1);

            // Clean up
            await models.User.destroy({id: createdUser.id});
            await models.Post.destroy({id: createdPost.id});
            await db.knex('posts_authors').where({author_id: createdUser.id}).del();
        });

        it('user deleted', async function () {
            // Create user and publish post
            const createdUser = await models.User.add({
                name: 'Hello Worlder 3',
                slug: 'hello-worlder',
                email: 'helloworlder-3@gmail.com',
                password: '1234aa56789'
            });

            const newPost = post();
            newPost.status = 'published';

            const testAuthorContext = {
                context: {
                    user: createdUser.id
                }
            };

            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, testAuthorContext));

            // Count authors
            const initialAuthorCount = await getAuthorCount();

            // Delete the user.
            await db.knex('posts_authors').where({author_id: createdUser.id}).del();
            await models.User.destroy({id: createdUser.id});

            // Check count.
            const authorCount = await getAuthorCount();

            authorCount.should.equal(initialAuthorCount - 1);

            // Clean up
            await models.Post.destroy({id: createdPost.id});
        });
    });

    describe('Age', function () {
        const getSiteAge = async function () {
            // wait for global template update.
            await sleep(200);

            const res = await request.get('/');
            const age = res.text.match(/Site age: (\d+)/);
            const years = res.text.match(/Site age years: (\d+)/);

            return {
                site_age: age ? parseInt(age[1]) : null,
                site_age_years: years ? parseInt(years[1]) : null
            };
        };

        it('no post', async function () {
            await testUtils.truncate('posts');

            await request.get('/'); // Load handlebars. Without this, UnhandledPromiseRejectionWarning is thrown.

            // Create and remove a post to update global template options.
            const newPost = post();
            newPost.status = 'published';
            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));
            await models.Post.destroy({id: createdPost.id});

            const {site_age, site_age_years} = await getSiteAge();

            site_age.should.equal(0);
            site_age_years.should.equal(0);
        });

        it('a post', async function () {
            // Add a post.
            const newPost = post();
            newPost.status = 'published';
            newPost.created_at = moment().subtract(3, 'years');

            const createdPost = await models.Post.add(newPost, _.merge({withRelated: ['author']}, authorContext));

            const {site_age, site_age_years} = await getSiteAge();

            // 94694400000 = 3 years.
            site_age.should.be.greaterThan(94694400000).lessThan(94694430000);
            site_age_years.should.equal(3);

            // clean up
            await createdPost.destroy();
        });
    });
});
