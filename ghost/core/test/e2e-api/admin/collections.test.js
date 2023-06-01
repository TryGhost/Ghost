const assert = require('assert');
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
    anyNumber
} = matchers;

const matchCollection = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
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
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
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

    it('Can browse Collections', async function () {
        await agent
            .get('/collections/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                collections: [matchCollection]
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

    describe('edit', function () {
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

        it('Can add Posts and append Post to a Collection', async function () {
            const postsToAttach = [{
                id: fixtureManager.get('posts', 0).id
            }, {
                id: fixtureManager.get('posts', 2).id
            }, {
                id: fixtureManager.get('posts', 3).id
            }];

            const collectionId = collectionToEdit.id;

            const editResponse = await agent
                .put(`/collections/${collectionId}/`)
                .body({
                    collections: [{
                        posts: postsToAttach
                    }]
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [buildMatcher(3)]
                });

            assert.equal(editResponse.body.collections[0].posts.length, 3, 'Posts should have been added to a Collection');

            // verify the posts are persisted across requests
            let readResponse = await agent
                .get(`/collections/${collectionId}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [buildMatcher(3)]
                });

            assert.equal(readResponse.body.collections[0].posts.length, 3, 'Posts should have been added to a Collection');

            //adds a single Post to existing Posts attached to a Collection
            await agent
                .post(`/collections/${collectionId}/posts`)
                .body({
                    posts: [{
                        id: fixtureManager.get('posts', 4).id
                    }]
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [buildMatcher(4, {withSortOrder: true})]
                });

            // verify the posts are persisted across requests
            readResponse = await agent
                .get(`/collections/${collectionId}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [buildMatcher(4, {withSortOrder: true})]
                });

            assert.equal(readResponse.body.collections[0].posts.length, 4, 'Post should have been added to a Collection');
        });

        it('Can remove a Post from a Collection', async function () {
            const collectionId = collectionToEdit.id;
            const readResponse = await agent
                .get(`/collections/${collectionId}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [buildMatcher(4, {withSortOrder: true})]
                });

            const postIdToRemove = readResponse.body.collections[0].posts[0]?.id;

            await agent
                .delete(`/collections/${collectionId}/posts/${postIdToRemove}`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [buildMatcher(3, {withSortOrder: true})]
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
});
