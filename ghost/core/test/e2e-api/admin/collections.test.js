const assert = require('assert/strict');
const {
    agentProvider,
    fixtureManager,
    mockManager,
    matchers
} = require('../../utils/e2e-framework');
const {
    anyContentVersion,
    anyEtag,
    anyErrorId,
    anyLocationFor,
    anyObjectId,
    anyISODateTime,
    anyISODateTimeWithTZ,
    anyNumber,
    anyUuid,
    anyString
} = matchers;

const matchCollection = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const matchCollectionPost = {
    id: anyObjectId,
    created_at: anyISODateTimeWithTZ,
    updated_at: anyISODateTimeWithTZ,
    published_at: anyISODateTimeWithTZ,
    uuid: anyUuid
};

/**
 *
 * @param {number} postCount
 */
const buildMatcher = (postCount, opts = {}) => {
    let obj = {
        id: anyObjectId
    };
    if (opts.withSortOrder) {
        obj.sort_order = anyNumber;
    }
    return {
        ...matchCollection,
        posts: Array(postCount).fill(obj)
    };
};

describe('Collections API', function () {
    let agent;

    before(async function () {
        mockManager.mockLabsEnabled('collections');
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'posts');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can add a Collection', async function () {
        const collection = {
            title: 'Test Collection',
            description: 'Test Collection Description'
        };

        await agent
            .post('/collections/')
            .body({
                collections: [collection]
            })
            .expectStatus(201)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('collections')
            })
            .matchBodySnapshot({
                collections: [matchCollection]
            });
    });

    describe('Browse', function () {
        it('Can browse Collections', async function () {
            await agent
                .get('/collections/')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [
                        buildMatcher(11, {withSortOrder: true}),
                        buildMatcher(2, {withSortOrder: true}),
                        buildMatcher(0),
                        buildMatcher(0)
                    ]
                });
        });
    });

    describe('Browse Posts', function () {
        it('Can browse Collections Posts', async function () {
            const collections = await agent.get('/collections/');
            const indexCollection = collections.body.collections.find(c => c.slug === 'index');

            await agent
                .get(`/collections/${indexCollection.id}/posts/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collection_posts: Array(11).fill(matchCollectionPost)
                });
        });

        it('Can browse Collections Posts using paging parameters', async function () {
            const collections = await agent.get('/collections/');
            const indexCollection = collections.body.collections.find(c => c.slug === 'index');

            await agent
                .get(`/collections/${indexCollection.id}/posts/?limit=2&page=2`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collection_posts: Array(2).fill(matchCollectionPost)
                });
        });
    });

    it('Can read a Collection', async function () {
        const collection = {
            title: 'Test Collection to Read'
        };

        const addResponse = await agent
            .post('/collections/')
            .body({
                collections: [collection]
            })
            .expectStatus(201)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('collections')
            })
            .matchBodySnapshot({
                collections: [matchCollection]
            });

        const collectionId = addResponse.body.collections[0].id;

        const readResponse = await agent
            .get(`/collections/${collectionId}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                collections: [matchCollection]
            });

        assert.equal(readResponse.body.collections[0].title, 'Test Collection to Read');
    });

    describe('Edit', function () {
        let collectionToEdit;

        before(async function () {
            const collection = {
                title: 'Test Collection to Edit'
            };

            const addResponse = await agent
                .post('/collections/')
                .body({
                    collections: [collection]
                })
                .expectStatus(201);

            collectionToEdit = addResponse.body.collections[0];
        });

        it('Can edit a Collection', async function () {
            const editResponse = await agent
                .put(`/collections/${collectionToEdit.id}/`)
                .body({
                    collections: [{
                        title: 'Test Collection Edited'
                    }]
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [matchCollection]
                });

            assert.equal(editResponse.body.collections[0].title, 'Test Collection Edited');
        });

        it('Fails to edit unexistent Collection', async function () {
            const unexistentID = '5951f5fca366002ebd5dbef7';
            await agent
                .put(`/collections/${unexistentID}/`)
                .body({
                    collections: [{
                        id: unexistentID,
                        title: 'Editing unexistent Collection'
                    }]
                })
                .expectStatus(404)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    it('Can delete a Collection', async function () {
        const collection = {
            title: 'Test Collection to Delete'
        };

        const addResponse = await agent
            .post('/collections/')
            .body({
                collections: [collection]
            })
            .expectStatus(201)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('collections')
            })
            .matchBodySnapshot({
                collections: [matchCollection]
            });

        const collectionId = addResponse.body.collections[0].id;

        await agent
            .delete(`/collections/${collectionId}/`)
            .expectStatus(204)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot();

        await agent
            .get(`/collections/${collectionId}/`)
            .expectStatus(404)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });

    it('Cannot delete a built in collection', async function () {
        const builtInCollection = await agent
            .get('/collections/?filter=slug:featured')
            .expectStatus(200);

        assert.ok(builtInCollection.body.collections);
        assert.equal(builtInCollection.body.collections.length, 1);

        await agent
            .delete(`/collections/${builtInCollection.body.collections[0].id}/`)
            .expectStatus(405)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId,
                    context: anyString
                }]
            });
    });

    describe('Automatic Collection Filtering', function () {
        it('Creates an automatic Collection with a featured filter', async function () {
            const collection = {
                title: 'Test Featured Collection',
                description: 'Test Collection Description',
                type: 'automatic',
                filter: 'featured:true'
            };

            await agent
                .post('/collections/')
                .body({
                    collections: [collection]
                })
                .expectStatus(201)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('collections')
                })
                .matchBodySnapshot({
                    collections: [buildMatcher(2)]
                });
        });

        it('Creates an automatic Collection with a published_at filter', async function () {
            const collection = {
                title: 'Test Collection with published_at filter',
                description: 'Test Collection Description with published_at filter',
                type: 'automatic',
                // should return all available posts
                filter: 'published_at:>=2022-05-25'
            };

            await agent
                .post('/collections/')
                .body({
                    collections: [collection]
                })
                .expectStatus(201)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('collections')
                })
                .matchBodySnapshot({
                    collections: [buildMatcher(7)]
                });
        });
    });
});
