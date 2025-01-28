const should = require('should');
const DomainEvents = require('@tryghost/domain-events');
const {mobiledocToLexical} = require('@tryghost/kg-converters');
const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert/strict');

describe('Posts Bulk API', function () {
    let agent;

    before(async function () {
        mockManager.mockLabsEnabled('collectionsCard');

        agent = await agentProvider.getAdminAPIAgent();

        // Note that we generate lots of fixtures here to test the bulk deletion correctly
        await fixtureManager.init('posts', 'newsletters', 'members:newsletters', 'emails', 'redirects', 'clicks', 'comments', 'feedback', 'links', 'mentions');
        await agent.loginAsOwner();

        // convert inserted pages to lexical so we can test page.html reset/re-render
        const pages = await models.Post.where('type', 'page').fetchAll();
        for (const page of pages) {
            const lexical = mobiledocToLexical(page.get('mobiledoc'));
            await models.Base.knex.raw('UPDATE posts SET mobiledoc=NULL, lexical=? where id=?', [lexical, page.id]);
        }
    });

    afterEach(async function () {
        // give pages some HTML back to alleviate test interdependence when pages are reset on create/update/delete
        await models.Base.knex.raw('UPDATE posts SET html = "<p>Testing</p>" WHERE type = \'page\' AND html IS NULL');

        mockManager.restore();
    });

    describe('Edit', function () {
        it('Can feature multiple posts', async function () {
            const filter = 'status:[published,draft,scheduled,sent]';

            // Check all the posts that should be affected
            const changedPosts = await models.Post.findPage({filter, limit: 1, status: 'all'});
            const amount = changedPosts.meta.pagination.total;

            assert(amount > 0, 'Expect at least one post to be affected for this test to work');

            const response = await agent
                .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
                .body({
                    bulk: {
                        action: 'feature'
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot();

            await DomainEvents.allSettled();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching posts (${amount}) to be changed`);

            // Check page HTML was reset to enable re-render of collection cards
            // Must be done before fetch all posts otherwise they will be re-rendered
            const totalPageCount = await models.Post.where({type: 'page'}).count();
            const emptyPageCount = await models.Post.where({html: null, type: 'page'}).count();
            should.exist(emptyPageCount);
            emptyPageCount.should.equal(totalPageCount, 'no. of render-queued pages after bulk edit');

            // Fetch all posts and check if they are featured
            const posts = await models.Post.findAll({filter, status: 'all'});
            assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

            for (const post of posts) {
                assert(post.get('featured') === true, `Expect post ${post.id} to be featured`);
            }
        });

        it('Can unfeature multiple posts', async function () {
            const filter = 'status:[published,draft,scheduled,sent]';

            // Check all the posts that should be affected
            const changedPosts = await models.Post.findPage({filter, limit: 1, status: 'all'});
            const amount = changedPosts.meta.pagination.total;

            assert(amount > 0, 'Expect at least one post to be affected for this test to work');

            const response = await agent
                .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
                .body({
                    bulk: {
                        action: 'unfeature'
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot();

            await DomainEvents.allSettled();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching posts (${amount}) to be changed`);

            // Fetch all posts and check if they are featured
            const posts = await models.Post.findAll({filter, status: 'all'});
            assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

            for (const post of posts) {
                assert(post.get('featured') === false, `Expect post ${post.id} to be unfeatured`);
            }
        });

        it('Can change access of posts', async function () {
            const filter = 'status:[published,draft,scheduled,sent]';

            // Check all the posts that should be affected
            const changedPosts = await models.Post.findPage({filter, limit: 1, status: 'all'});
            const amount = changedPosts.meta.pagination.total;

            assert(amount > 0, 'Expect at least one post to be affected for this test to work');

            const response = await agent
                .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
                .body({
                    bulk: {
                        action: 'access',
                        meta: {
                            visibility: 'paid'
                        }
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching posts (${amount}) to be changed`);

            // Fetch all posts and check if they have the correct access
            const posts = await models.Post.findAll({filter, status: 'all'});
            assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

            for (const post of posts) {
                assert(post.get('visibility') === 'paid', `Expect post ${post.id} to have access 'paid'`);
            }
        });

        it('Can change access of posts to tiers', async function () {
            const filter = 'status:[published,draft,scheduled,sent]';

            const products = await models.Product.findAll();

            const tier1 = products.models[0];
            const tier2 = products.models[1];

            assert(tier1.id && tier2.id);

            // Check all the posts that should be affected
            const changedPosts = await models.Post.findPage({filter, limit: 1, status: 'all'});
            const amount = changedPosts.meta.pagination.total;

            assert(amount > 0, 'Expect at least one post to be affected for this test to work');

            const response = await agent
                .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
                .body({
                    bulk: {
                        action: 'access',
                        meta: {
                            visibility: 'tiers',
                            tiers: [
                                {
                                    id: tier1.id
                                },
                                {
                                    id: tier2.id
                                }
                            ]
                        }
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching posts (${amount}) to be changed`);

            // Fetch all posts and check if they have the correct access
            const posts = await models.Post.findAll({filter, status: 'all', withRelated: ['tiers']});
            assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

            for (const post of posts) {
                assert(post.get('visibility') === 'tiers', `Expect post ${post.id} to have access 'tiers'`);
                assert.equal(post.related('tiers').length, 2);
            }
        });

        it('Can add a single tag to posts', async function () {
            const filter = 'status:[published]';
            const tag = await models.Tag.findOne({slug: fixtureManager.get('tags', 0).slug});
            assert(tag);

            // Check all the posts that should be affected
            const changedPosts = await models.Post.findPage({filter, limit: 1, status: 'all'});
            const amount = changedPosts.meta.pagination.total;

            assert(amount > 0, 'Expect at least one post to be affected for this test to work');

            const response = await agent
                .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
                .body({
                    bulk: {
                        action: 'addTag',
                        meta: {
                            tags: [
                                {
                                    id: tag.id
                                }
                            ]
                        }
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching posts (${amount}) to be changed, got ${response.body.bulk.meta.stats.successful} instead`);

            // Fetch all posts and check if they have the tag
            const posts = await models.Post.findAll({filter, status: 'all', withRelated: ['tags']});
            assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

            for (const post of posts) {
                const tags = post.related('tags');
                // Check tag is in the list
                assert(tags.find(t => t.id === tag.id), `Expect post ${post.id} to have tag ${tag.id}`);
            }
        });

        it('Can add multiple tags to posts and create new tags', async function () {
            const filter = 'status:[draft]';
            const tag = await models.Tag.findOne({id: fixtureManager.get('tags', 1).id});
            assert(tag);

            const newTag = {
                name: 'Just a random new tag'
            };

            // Check all the posts that should be affected
            const changedPosts = await models.Post.findPage({filter, limit: 1, status: 'all'});
            const amount = changedPosts.meta.pagination.total;

            assert(amount > 0, 'Expect at least one post to be affected for this test to work');

            const response = await agent
                .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
                .body({
                    bulk: {
                        action: 'addTag',
                        meta: {
                            tags: [
                                {
                                    id: tag.id
                                },
                                {
                                    name: newTag.name
                                }
                            ]
                        }
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching posts (${amount}) to be changed, got ${response.body.bulk.meta.stats.successful} instead`);

            // Check if the new tag was created
            const newTags = await models.Tag.findAll({filter: `name:'${newTag.name}'`});
            assert.equal(newTags.length, 1, `Expect tag to be created`);

            const newTagModel = newTags.models[0];

            // Fetch all posts and check if they have the tag
            const posts = await models.Post.findAll({filter, status: 'all', withRelated: ['tags']});
            assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

            for (const post of posts) {
                const tags = post.related('tags');
                // Check tag is in the list
                assert(tags.find(t => t.id === tag.id), `Expect post ${post.id} to have tag ${tag.id}`);
                assert(tags.find(t => t.id === newTagModel.id), `Expect post ${post.id} to have new tag ${newTagModel.id}`);
            }
        });

        it('Can unpublish posts', async function () {
            const filter = 'status:[published]';
            const changedPosts = await models.Post.findPage({filter, status: 'published'});
            const amount = changedPosts.meta.pagination.total;

            assert(amount > 0, 'Expect at least one post to be affected for this test to work');

            const response = await agent
                .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
                .body({
                    bulk: {
                        action: 'unpublish'
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching posts (${amount}) to be unpublished, got ${response.body.bulk.meta.stats.successful} instead`);

            // Fetch all posts and check if they are unpublished
            const posts = await models.Post.findAll({filter, status: 'all'});
            assert.equal(posts.length, 0, `Expect all matching posts (${amount}) to be unpublished`);

            // Re-publish the posts so we don't affect later tests
            const postIds = changedPosts.data.map(post => post.id);
            await models.Base.knex.raw(`UPDATE posts SET status = \'published\' WHERE id IN (${postIds.map(() => '?').join(',')})`, [...postIds]);
        });
    });

    describe('Delete', function () {
        it('Can delete posts that match a tag', async function () {
            const tag = await models.Tag.findOne({id: fixtureManager.get('tags', 0).id});
            const filter = 'tag:' + tag.get('slug');

            // Check all the posts that should be affected
            const changedPosts = await models.Post.findPage({filter, limit: 1, status: 'all'});
            const amount = changedPosts.meta.pagination.total;

            assert(amount > 0, 'Expect at least one post to be affected for this test to work');

            const response = await agent
                .delete('/posts/?filter=' + encodeURIComponent(filter))
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching posts (${amount}) to be deleted, got ${response.body.bulk.meta.stats.successful} instead`);

            // Check if all posts were deleted
            const posts = await models.Post.findPage({filter, status: 'all'});
            assert.equal(posts.meta.pagination.total, 0, `Expect all matching posts (${amount}) to be deleted`);

            // Check page HTML was reset to enable re-render of collection cards
            const totalPageCount = await models.Post.where({type: 'page'}).count();
            const emptyPageCount = await models.Post.where({html: null, type: 'page'}).count();
            should.exist(emptyPageCount);
            emptyPageCount.should.equal(totalPageCount, 'no. of render-queued pages after bulk delete');
        });

        it('Can delete all posts', async function () {
            const filter = 'status:[published,draft,scheduled,sent]';

            // Check all the posts that should be affected
            const changedPosts = await models.Post.findPage({filter, limit: 1, status: 'all'});
            const amount = changedPosts.meta.pagination.total;

            assert(amount > 0, 'Expect at least one post to be affected for this test to work');

            const response = await agent
                .delete('/posts/?filter=' + encodeURIComponent(filter))
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching posts (${amount}) to be deleted, got ${response.body.bulk.meta.stats.successful} instead`);

            // Check if all posts were deleted
            const posts = await models.Post.findPage({filter, status: 'all'});
            assert.equal(posts.meta.pagination.total, 0, `Expect all matching posts (${amount}) to be deleted`);
        });
    });
});
