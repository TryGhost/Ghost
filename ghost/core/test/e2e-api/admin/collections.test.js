const assert = require('assert/strict');
const DomainEvents = require('@tryghost/domain-events');
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
    anyString,
    anyUuid,
    anyArray,
    anyObject
} = matchers;

const matchCollection = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const tagSnapshotMatcher = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const matchPostShallowIncludes = {
    id: anyObjectId,
    uuid: anyUuid,
    comment_id: anyString,
    url: anyString,
    authors: anyArray,
    primary_author: anyObject,
    tags: anyArray,
    primary_tag: anyObject,
    tiers: anyArray,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    published_at: anyISODateTime
};

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
                        matchCollection,
                        matchCollection
                    ]
                });
        });

        it('Makes limited DB queries when browsing', async function () {
            const queries = await trackDb(async () => {
                await agent
                    .get('/collections/')
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        collections: [
                            matchCollection,
                            matchCollection
                        ]
                    });
            }, this.skip.bind(this));
            const collectionRelatedQueries = queries.filter(query => query.sql.includes('collection'));
            assert(collectionRelatedQueries.length === 3);
        });

        it('Can browse Collections and include the posts count', async function () {
            await agent
                .get('/collections/?include=count.posts')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [
                        {...matchCollection, count: {posts: 13}},
                        {...matchCollection, count: {posts: 2}}
                    ]
                });
        });
    });

    describe('Read', function () {
        it('Can read a Collection by id and slug', async function () {
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

            const collectionSlug = addResponse.body.collections[0].slug;
            const readBySlugResponse = await agent
                .get(`/collections/slug/${collectionSlug}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [matchCollection]
                });

            assert.equal(readBySlugResponse.body.collections[0].title, 'Test Collection to Read');

            await agent
                .delete(`/collections/${collectionId}/`)
                .expectStatus(204);
        });

        it('Can read a Collection by id and slug and include the post counts', async function () {
            const {body: {collections: [collection]}} = await agent.get(`/collections/slug/featured/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 2
                        }
                    }]
                });

            await agent.get(`/collections/${collection.id}/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 2
                        }
                    }]
                });
        });
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

    describe('Add', function () {
        it('Can add a Collection', async function () {
            const collection = {
                title: 'Test Collection',
                description: 'Test Collection Description'
            };

            const {body: {collections: [{id: collectionId}]}} = await agent
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

            await agent
                .delete(`/collections/${collectionId}/`)
                .expectStatus(204);
        });
    });

    describe('Delete', function () {
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
    });

    describe('Automatic Collection Filtering', function () {
        it('Creates an automatic Collection with a featured filter', async function () {
            const collection = {
                title: 'Test Featured Collection',
                slug: 'featured-filter',
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
                    collections: [matchCollection]
                });

            await agent.get(`posts/?collection=${collection.slug}`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    posts: new Array(2).fill(matchPostShallowIncludes)
                });
        });

        it('Creates an automatic Collection with a published_at filter', async function () {
            const collection = {
                title: 'Test Collection with published_at filter',
                slug: 'published-at-filter',
                description: 'Test Collection Description with published_at filter',
                type: 'automatic',
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
                    collections: [matchCollection]
                });

            await agent.get(`posts/?collection=${collection.slug}`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    posts: new Array(9).fill(matchPostShallowIncludes)
                });
        });

        it('Creates an automatic Collection with a tags filter', async function () {
            const collection = {
                title: 'Test Collection with tag filter',
                slug: 'tag-filter',
                description: 'BACON!',
                type: 'automatic',
                filter: 'tags:[\'bacon\']'
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

            await agent.get(`posts/?collection=${collection.slug}`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    posts: new Array(2).fill({
                        ...matchPostShallowIncludes,
                        tags: new Array(2).fill(tagSnapshotMatcher)
                    })
                });
        });

        it('Creates an automatic Collection with a tag filter, checking filter aliases', async function () {
            const collection = {
                title: 'Test Collection with tag filter alias',
                slug: 'bacon-tag-expansion',
                description: 'BACON!',
                type: 'automatic',
                filter: 'tag:[\'bacon\']'
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

            await agent.get(`posts/?collection=${collection.slug}`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    posts: new Array(2).fill({
                        ...matchPostShallowIncludes,
                        tags: new Array(2).fill(tagSnapshotMatcher)
                    })
                });
        });
    });

    describe('Collection Posts updates automatically', function () {
        it('Makes limited DB queries when updating due to post changes', async function () {
            await agent
                .get(`/collections/slug/featured/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 2
                        }
                    }]
                });

            const postToAdd = {
                title: 'Collection update test',
                featured: false
            };

            let post;

            {
                const queries = await trackDb(async () => {
                    const {body: {posts: [createdPost]}} = await agent
                        .post('/posts/')
                        .body({
                            posts: [postToAdd]
                        })
                        .expectStatus(201);

                    await DomainEvents.allSettled();

                    post = createdPost;
                }, this.skip.bind(this));

                const collectionRelatedQueries = queries.filter(query => query.sql.includes('collection'));
                assert.equal(collectionRelatedQueries.length, 7);
            }

            await agent
                .get(`/collections/slug/featured/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 2
                        }
                    }]
                });

            {
                const queries = await trackDb(async () => {
                    await agent
                        .put(`/posts/${post.id}/`)
                        .body({
                            posts: [Object.assign({}, post, {featured: true})]
                        })
                        .expectStatus(200);

                    await DomainEvents.allSettled();
                }, this.skip.bind(this));

                const collectionRelatedQueries = queries.filter(query => query.sql.includes('collection'));
                assert.equal(collectionRelatedQueries.length, 16);
            }

            await agent
                .get(`/collections/slug/featured/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 3
                        }
                    }]
                });

            {
                const queries = await trackDb(async () => {
                    await agent
                        .delete(`/posts/${post.id}/`)
                        .expectStatus(204);

                    await DomainEvents.allSettled();
                }, this.skip.bind(this));
                const collectionRelatedQueries = queries.filter(query => query.sql.includes('collection'));

                // deletion is handled on the DB layer through Cascade Delete,
                // so collections should not execute any additional queries
                assert.equal(collectionRelatedQueries.length, 0);
            }

            await agent
                .get(`/collections/slug/featured/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 2
                        }
                    }]
                });
        });
        it('Updates collections when a Post is added/edited/deleted', async function () {
            await agent
                .get(`/collections/slug/featured/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 2
                        }
                    }]
                });

            const postToAdd = {
                title: 'Collection update test',
                featured: false
            };

            const {body: {posts: [post]}} = await agent
                .post('/posts/')
                .body({
                    posts: [postToAdd]
                })
                .expectStatus(201);

            await agent
                .get(`/collections/slug/featured/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 2
                        }
                    }]
                });

            await agent
                .put(`/posts/${post.id}/`)
                .body({
                    posts: [Object.assign({}, post, {featured: true})]
                })
                .expectStatus(200);

            await DomainEvents.allSettled();

            await agent
                .get(`/collections/slug/featured/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 3
                        }
                    }]
                });

            await agent
                .delete(`/posts/${post.id}/`)
                .expectStatus(204);

            await DomainEvents.allSettled();

            await agent
                .get(`/collections/slug/featured/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 2
                        }
                    }]
                });
        });

        it('Updates a collection with tag filter when tag is added to posts in bulk and when tag is removed', async function (){
            const collection = {
                title: 'Papaya madness',
                type: 'automatic',
                filter: 'tags:[\'papaya\']'
            };

            const {body: {collections: [{id: collectionId}]}} = await agent
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

            // should contain no posts
            await agent
                .get(`/collections/${collectionId}/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 0
                        }
                    }]
                });

            const tag = {
                name: 'Papaya',
                slug: 'papaya'
            };

            const {body: {tags: [{id: tagId}]}} = await agent
                .post('/tags/')
                .body({
                    tags: [tag]
                })
                .expectStatus(201);

            // add papaya tag to all posts
            await agent
                .put('/posts/bulk/?filter=' + encodeURIComponent('status:[published]'))
                .body({
                    bulk: {
                        action: 'addTag',
                        meta: {
                            tags: [
                                {
                                    id: tagId
                                }
                            ]
                        }
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot();

            await DomainEvents.allSettled();

            // should contain posts with papaya tags
            await agent
                .get(`/collections/${collectionId}/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 11
                        }
                    }]
                });

            await agent
                .delete(`/tags/${tagId}/`)
                .expectStatus(204);

            await DomainEvents.allSettled();

            // should contain ZERO posts with papaya tags
            await agent
                .get(`/collections/${collectionId}/?include=count.posts`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    collections: [{
                        ...matchCollection,
                        count: {
                            posts: 0
                        }
                    }]
                });
        });
    });
});
