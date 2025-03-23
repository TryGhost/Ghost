const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert/strict');

const forcePageFilter = (filter) => {
    if (filter) {
        return `(${filter})+type:page`;
    } else {
        return 'type:page';
    }
};

describe('Pages Bulk API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();

        // Note that we generate lots of fixtures here to test the bulk deletion correctly
        await fixtureManager.init('posts', 'newsletters', 'members:newsletters', 'emails', 'redirects', 'clicks', 'comments', 'feedback', 'links', 'mentions');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('Edit', function () {
        it('Can feature multiple pages', async function () {
            const filter = 'status:[published,draft,scheduled,sent]';

            // Check all the pages that should be affected
            const changedPages = await models.Post.findPage({filter: forcePageFilter(filter), limit: 1, status: 'all'});
            const amount = changedPages.meta.pagination.total;

            assert(amount > 0, 'Expect at least one page to be affected for this test to work');

            const response = await agent
                .put('/pages/bulk/?filter=' + encodeURIComponent(filter))
                .body({
                    bulk: {
                        action: 'feature'
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching pages (${amount}) to be changed`);

            // Fetch all pages and check if they are featured
            const pages = await models.Post.findAll({filter: forcePageFilter(filter), status: 'all'});
            assert.equal(pages.length, amount, `Expect all matching pages (${amount}) to be changed`);

            for (const page of pages) {
                assert(page.get('featured') === true, `Expect page ${page.id} to be featured`);
            }
        });

        it('Can unfeature multiple pages', async function () {
            const filter = 'status:[published,draft,scheduled,sent]';

            // Check all the pages that should be affected
            const changedPages = await models.Post.findPage({filter: forcePageFilter(filter), limit: 1, status: 'all'});
            const amount = changedPages.meta.pagination.total;

            assert(amount > 0, 'Expect at least one page to be affected for this test to work');

            const response = await agent
                .put('/pages/bulk/?filter=' + encodeURIComponent(filter))
                .body({
                    bulk: {
                        action: 'unfeature'
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching pages (${amount}) to be changed`);

            // Fetch all pages and check if they are featured
            const pages = await models.Post.findAll({filter: forcePageFilter(filter), status: 'all'});
            assert.equal(pages.length, amount, `Expect all matching pages (${amount}) to be changed`);

            for (const page of pages) {
                assert(page.get('featured') === false, `Expect page ${page.id} to be unfeatured`);
            }
        });

        it('Can change access of pages', async function () {
            const filter = 'status:[published,draft,scheduled,sent]';

            // Check all the pages that should be affected
            const changedPages = await models.Post.findPage({filter: forcePageFilter(filter), limit: 1, status: 'all'});
            const amount = changedPages.meta.pagination.total;

            assert(amount > 0, 'Expect at least one page to be affected for this test to work');

            const response = await agent
                .put('/pages/bulk/?filter=' + encodeURIComponent(filter))
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

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching pages (${amount}) to be changed`);

            // Fetch all pages and check if they have the correct access
            const pages = await models.Post.findAll({filter: forcePageFilter(filter), status: 'all'});
            assert.equal(pages.length, amount, `Expect all matching pages (${amount}) to be changed`);

            for (const page of pages) {
                assert(page.get('visibility') === 'paid', `Expect page ${page.id} to have access 'paid'`);
            }
        });

        it('Can change access of pages to tiers', async function () {
            const filter = 'status:[published,draft,scheduled,sent]';

            const products = await models.Product.findAll();

            const tier1 = products.models[0];
            const tier2 = products.models[1];

            assert(tier1.id && tier2.id);

            // Check all the pages that should be affected
            const changedPages = await models.Post.findPage({filter: forcePageFilter(filter), limit: 1, status: 'all'});
            const amount = changedPages.meta.pagination.total;

            assert(amount > 0, 'Expect at least one page to be affected for this test to work');

            const response = await agent
                .put('/pages/bulk/?filter=' + encodeURIComponent(filter))
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

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching pages (${amount}) to be changed`);

            // Fetch all pages and check if they have the correct access
            const pages = await models.Post.findAll({filter: forcePageFilter(filter), status: 'all', withRelated: ['tiers']});
            assert.equal(pages.length, amount, `Expect all matching pages (${amount}) to be changed`);

            for (const page of pages) {
                assert(page.get('visibility') === 'tiers', `Expect page ${page.id} to have access 'tiers'`);
                assert.equal(page.related('tiers').length, 2);
            }
        });

        it('Can add a single tag to pages', async function () {
            const filter = 'status:[published]';
            const tag = await models.Tag.findOne({slug: fixtureManager.get('tags', 0).slug});
            assert(tag);

            // Check all the pages that should be affected
            const changedPages = await models.Post.findPage({filter: forcePageFilter(filter), limit: 1, status: 'all'});
            const amount = changedPages.meta.pagination.total;

            assert(amount > 0, 'Expect at least one page to be affected for this test to work');

            const response = await agent
                .put('/pages/bulk/?filter=' + encodeURIComponent(filter))
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

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching pages (${amount}) to be changed, got ${response.body.bulk.meta.stats.successful} instead`);

            // Fetch all pages and check if they have the tag
            const pages = await models.Post.findAll({filter: forcePageFilter(filter), status: 'all', withRelated: ['tags']});
            assert.equal(pages.length, amount, `Expect all matching pages (${amount}) to be changed`);

            for (const page of pages) {
                const tags = page.related('tags');
                // Check tag is in the list
                assert(tags.find(t => t.id === tag.id), `Expect page ${page.id} to have tag ${tag.id}`);
            }
        });

        it('Can add multiple tags to pages and create new tags', async function () {
            const filter = 'status:[draft]';
            const tag = await models.Tag.findOne({id: fixtureManager.get('tags', 1).id});
            assert(tag);

            const newTag = {
                name: 'Just a random new tag'
            };

            // Check all the pages that should be affected
            const changedPages = await models.Post.findPage({filter: forcePageFilter(filter), limit: 1, status: 'all'});
            const amount = changedPages.meta.pagination.total;

            assert(amount > 0, 'Expect at least one page to be affected for this test to work');

            const response = await agent
                .put('/pages/bulk/?filter=' + encodeURIComponent(filter))
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

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching pages (${amount}) to be changed, got ${response.body.bulk.meta.stats.successful} instead`);

            // Check if the new tag was created
            const newTags = await models.Tag.findAll({filter: `name:'${newTag.name}'`});
            assert.equal(newTags.length, 1, `Expect tag to be created`);

            const newTagModel = newTags.models[0];

            // Fetch all pages and check if they have the tag
            const pages = await models.Post.findAll({filter: forcePageFilter(filter), status: 'all', withRelated: ['tags']});
            assert.equal(pages.length, amount, `Expect all matching pages (${amount}) to be changed`);

            for (const page of pages) {
                const tags = page.related('tags');
                // Check tag is in the list
                assert(tags.find(t => t.id === tag.id), `Expect page ${page.id} to have tag ${tag.id}`);
                assert(tags.find(t => t.id === newTagModel.id), `Expect page ${page.id} to have new tag ${newTagModel.id}`);
            }
        });

        it('Can unpublish pages', async function () {
            const filter = 'status:[published]';
            const changedPages = await models.Post.findPage({filter: forcePageFilter(filter), limit: 1, status: 'all'});
            const amount = changedPages.meta.pagination.total;

            assert(amount > 0, 'Expect at least one page to be affected for this test to work');

            const response = await agent
                .put('/pages/bulk/?filter=' + encodeURIComponent(filter))
                .body({
                    bulk: {
                        action: 'unpublish'
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching pages (${amount}) to be unpublished, got ${response.body.bulk.meta.stats.successful} instead`);

            // Fetch all pages and check if they are unpublished
            const pages = await models.Post.findAll({filter: forcePageFilter(filter), status: 'all'});
            assert.equal(pages.length, 0, `Expect all matching pages (${amount}) to be unpublished`);
        });
    });

    describe('Delete', function () {
        it('Can delete pages that match a tag', async function () {
            const tag = await models.Tag.findOne({id: fixtureManager.get('tags', 0).id});
            const filter = 'tag:' + tag.get('slug');

            // Check all the pages that should be affected
            const changedPages = await models.Post.findPage({filter: forcePageFilter(filter), limit: 1, status: 'all'});
            const amount = changedPages.meta.pagination.total;

            assert(amount > 0, 'Expect at least one page to be affected for this test to work');

            const response = await agent
                .delete('/pages/?filter=' + encodeURIComponent(filter))
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching pages (${amount}) to be deleted, got ${response.body.bulk.meta.stats.successful} instead`);

            // Check if all pages were deleted
            const pages = await models.Post.findPage({filter: forcePageFilter(filter), status: 'all'});
            assert.equal(pages.meta.pagination.total, 0, `Expect all matching pages (${amount}) to be deleted`);
        });

        it('Can delete all pages', async function () {
            const filter = 'status:[published,draft,scheduled,sent]';

            // Check all the pages that should be affected
            const changedPages = await models.Post.findPage({filter: forcePageFilter(filter), limit: 1, status: 'all'});
            const amount = changedPages.meta.pagination.total;

            assert(amount > 0, 'Expect at least one page to be affected for this test to work');

            const response = await agent
                .delete('/pages/?filter=' + encodeURIComponent(filter))
                .expectStatus(200)
                .matchBodySnapshot();

            assert.equal(response.body.bulk.meta.stats.successful, amount, `Expect all matching pages (${amount}) to be deleted, got ${response.body.bulk.meta.stats.successful} instead`);

            // Check if all pages were deleted
            const pages = await models.Post.findPage({filter: forcePageFilter(filter), status: 'all'});
            assert.equal(pages.meta.pagination.total, 0, `Expect all matching pages (${amount}) to be deleted`);
        });
    });
});
