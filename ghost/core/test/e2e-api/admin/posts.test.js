const should = require('should');
const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {anyArray, anyContentVersion, anyEtag, anyErrorId, anyLocationFor, anyObject, anyObjectId, anyISODateTime, anyString, anyStringNumber, anyUuid, stringMatching} = matchers;
const models = require('../../../core/server/models');
const escapeRegExp = require('lodash/escapeRegExp');

const tierSnapshot = {
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
    tiers: Array(2).fill(tierSnapshot),
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    published_at: anyISODateTime,
    post_revisions: anyArray
};

const buildMatchPostShallowIncludes = (tiersCount = 2) => {
    return {
        id: anyObjectId,
        uuid: anyUuid,
        comment_id: anyString,
        url: anyString,
        authors: anyArray,
        primary_author: anyObject,
        tags: anyArray,
        primary_tag: anyObject,
        tiers: Array(tiersCount).fill(tierSnapshot),
        created_at: anyISODateTime,
        updated_at: anyISODateTime,
        published_at: anyISODateTime,
        post_revisions: anyArray
    };
};

function testCleanedSnapshot(text, ignoreReplacements) {
    for (const {match, replacement} of ignoreReplacements) {
        if (match instanceof RegExp) {
            text = text.replace(match, replacement);
        } else {
            text = text.replace(new RegExp(escapeRegExp(match), 'g'), replacement);
        }
    }
    should({text}).matchSnapshot();
}

const createLexical = (text) => {
    return JSON.stringify({
        root: {
            children: [
                {
                    children: [
                        {
                            detail: 0,
                            format: 0,
                            mode: 'normal',
                            style: '',
                            text,
                            type: 'text',
                            version: 1
                        }
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                }
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'root',
            version: 1
        }
    });
};

const createMobiledoc = (text) => {
    return JSON.stringify({
        version: '0.3.1',
        ghostVersion: '4.0',
        markups: [],
        atoms: [],
        cards: [],
        sections: [
            [1, 'p', [
                [0, [], 0, text]
            ]]
        ]
    });
};

describe('Posts API', function () {
    let agent;

    before(async function () {
        mockManager.mockLabsEnabled('collections', true);
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can browse', async function () {
        await agent.get('posts/?limit=2')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(2).fill(matchPostShallowIncludes)
            });
    });

    it('Can browse with formats', async function () {
        await agent.get('posts/?formats=mobiledoc,lexical,html,plaintext&limit=2')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(2).fill(matchPostShallowIncludes)
            });
    });

    it('Can browse filtering by a collection', async function () {
        await agent.get('posts/?collection=featured')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(2).fill(matchPostShallowIncludes)
            });
    });

    it('Can browse filtering by collection using paging parameters', async function () {
        await agent
            .get(`posts/?collection=latest&limit=1&page=7`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: Array(1).fill(buildMatchPostShallowIncludes(2))
            });
    });

    describe('Export', function () {
        it('Can export', async function () {
            const {text} = await agent.get('posts/export')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'content-disposition': stringMatching(/^Attachment; filename="post-analytics.\d{4}-\d{2}-\d{2}.csv"$/)
                });

            // body snapshot doesn't work with text/csv
            testCleanedSnapshot(text, [
                {
                    match: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/g,
                    replacement: '2050-01-01T00:00:00.000Z'
                }
            ]);
        });

        it('Can export with order', async function () {
            const {text} = await agent.get('posts/export?order=published_at%20ASC')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'content-disposition': stringMatching(/^Attachment; filename="post-analytics.\d{4}-\d{2}-\d{2}.csv"$/)
                });

            // body snapshot doesn't work with text/csv
            testCleanedSnapshot(text, [
                {
                    match: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/g,
                    replacement: '2050-01-01T00:00:00.000Z'
                }
            ]);
        });

        it('Can export with limit', async function () {
            const {text} = await agent.get('posts/export?limit=1')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'content-disposition': stringMatching(/^Attachment; filename="post-analytics.\d{4}-\d{2}-\d{2}.csv"$/)
                });

            // body snapshot doesn't work with text/csv
            testCleanedSnapshot(text, [
                {
                    match: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/g,
                    replacement: '2050-01-01T00:00:00.000Z'
                }
            ]);
        });

        it('Can export with filter', async function () {
            const {text} = await agent.get('posts/export?filter=featured:true')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'content-disposition': stringMatching(/^Attachment; filename="post-analytics.\d{4}-\d{2}-\d{2}.csv"$/)
                });

            // body snapshot doesn't work with text/csv
            testCleanedSnapshot(text, [
                {
                    match: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/g,
                    replacement: '2050-01-01T00:00:00.000Z'
                }
            ]);
        });
    });

    describe('Create', function () {
        it('Can create a post with mobiledoc', async function () {
            const post = {
                title: 'Mobiledoc test',
                mobiledoc: createMobiledoc('Testing post creation with mobiledoc'),
                lexical: null
            };

            await agent
                .post('/posts/?formats=mobiledoc,lexical,html', {
                    headers: {
                        'content-type': 'application/json'
                    }
                })
                .body({posts: [post]})
                .expectStatus(201)
                .matchBodySnapshot({
                    posts: [Object.assign({}, matchPostShallowIncludes, {published_at: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('posts')
                });
        });

        it('Can create a post with lexical', async function () {
            const lexical = createLexical('Testing post creation with lexical');

            const post = {
                title: 'Lexical test',
                mobiledoc: null,
                lexical
            };

            const {body} = await agent
                .post('/posts/?formats=mobiledoc,lexical,html')
                .body({posts: [post]})
                .expectStatus(201)
                .matchBodySnapshot({
                    posts: [Object.assign({}, matchPostShallowIncludes, {published_at: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('posts')
                });

            const [postResponse] = body.posts;

            // post revision is created
            const postRevisions = await models.PostRevision
                .where('post_id', postResponse.id)
                .orderBy('created_at_ts', 'desc')
                .fetchAll();

            postRevisions.length.should.equal(1);
            postRevisions.at(0).get('lexical').should.equal(lexical);

            // mobiledoc revision is not created
            const mobiledocRevisions = await models.MobiledocRevision
                .where('post_id', postResponse.id)
                .orderBy('created_at_ts', 'desc')
                .fetchAll();

            mobiledocRevisions.length.should.equal(0);
        });

        it('Errors if both mobiledoc and lexical are present', async function () {
            const post = {
                title: 'Mobiledoc+lexical test',
                mobiledoc: createMobiledoc('Testing post creation with mobiledoc'),
                lexical: createLexical('Testing post creation with lexical')
            };

            await agent
                .post('/posts/?formats=mobiledoc,lexical')
                .body({posts: [post]})
                .expectStatus(422)
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

        it('Errors with an invalid lexical state object', async function () {
            const post = {
                title: 'Invalid lexical state',
                lexical: JSON.stringify({
                    notLexical: true
                })
            };

            await agent
                .post('/posts/?formats=mobiledoc,lexical,html')
                .body({posts: [post]})
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId,
                        context: stringMatching(/Invalid lexical structure\..*/)
                    }]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyStringNumber
                });
        });
    });

    describe('Update', function () {
        it('Can update a post with mobiledoc', async function () {
            const originalMobiledoc = createMobiledoc('Original text');
            const updatedMobiledoc = createMobiledoc('Updated text');

            const {body: postBody} = await agent
                .post('/posts/?formats=mobiledoc,lexical,html')
                .body({posts: [{
                    title: 'Mobiledoc update test',
                    mobiledoc: originalMobiledoc
                }]})
                .expectStatus(201)
                .matchBodySnapshot({
                    posts: [Object.assign({}, matchPostShallowIncludes, {published_at: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('posts')
                });

            const [postResponse] = postBody.posts;

            await agent
                .put(`/posts/${postResponse.id}/?formats=mobiledoc,lexical,html`)
                .body({posts: [Object.assign({}, postResponse, {mobiledoc: updatedMobiledoc})]})
                .expectStatus(200)
                .matchBodySnapshot({
                    posts: [Object.assign({}, matchPostShallowIncludes, {published_at: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'x-cache-invalidate': anyString
                });

            // mobiledoc revisions are created
            const mobiledocRevisions = await models.MobiledocRevision
                .where('post_id', postResponse.id)
                .orderBy('created_at_ts', 'desc')
                .fetchAll();

            mobiledocRevisions.length.should.equal(2);
            mobiledocRevisions.at(0).get('mobiledoc').should.equal(updatedMobiledoc);
            mobiledocRevisions.at(1).get('mobiledoc').should.equal(originalMobiledoc);

            // post revisions are not created
            const postRevisions = await models.PostRevision
                .where('post_id', postResponse.id)
                .orderBy('created_at_ts', 'desc')
                .fetchAll();

            postRevisions.length.should.equal(0);
        });

        it('Can update a post with lexical', async function () {
            const originalLexical = createLexical('Original text');
            const updatedLexical = createLexical('Updated text');

            const {body: postBody} = await agent
                .post('/posts/?formats=mobiledoc,lexical,html')
                .body({posts: [{
                    title: 'Lexical update test',
                    lexical: originalLexical
                }]})
                .expectStatus(201)
                .matchBodySnapshot({
                    posts: [Object.assign({}, matchPostShallowIncludes, {published_at: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('posts')
                });

            const [postResponse] = postBody.posts;

            await agent
                .put(`/posts/${postResponse.id}/?formats=mobiledoc,lexical,html&save_revision=true`)
                .body({posts: [Object.assign({}, postResponse, {lexical: updatedLexical})]})
                .expectStatus(200)
                .matchBodySnapshot({
                    posts: [Object.assign({}, matchPostShallowIncludes, {published_at: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'x-cache-invalidate': anyString
                });

            // post revisions are created
            const postRevisions = await models.PostRevision
                .where('post_id', postResponse.id)
                .orderBy('created_at_ts', 'desc')
                .fetchAll();

            postRevisions.length.should.equal(2);
            postRevisions.at(0).get('lexical').should.equal(updatedLexical);
            postRevisions.at(1).get('lexical').should.equal(originalLexical);

            // mobiledoc revisions are not created
            const mobiledocRevisions = await models.MobiledocRevision
                .where('post_id', postResponse.id)
                .orderBy('created_at_ts', 'desc')
                .fetchAll();

            mobiledocRevisions.length.should.equal(0);
        });

        it('Can add and remove collections', async function () {
            const {body: postBody} = await agent
                .post('/posts/')
                .body({
                    posts: [{
                        title: 'Collection update test'
                    }]
                })
                .expectStatus(201)
                .matchBodySnapshot({
                    posts: [Object.assign({}, matchPostShallowIncludes, {published_at: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('posts')
                });

            const [postResponse] = postBody.posts;

            const {body: {
                collections: [collectionToAdd]
            }} = await agent
                .post('/collections/')
                .body({
                    collections: [{
                        title: 'Collection to add.'
                    }]
                });

            const {body: {
                collections: [collectionToRemove]
            }} = await agent
                .post('/collections/')
                .body({
                    collections: [{
                        title: 'Collection to remove.'
                    }]
                });

            const collectionPostMatcher = {
                id: anyObjectId
            };
            const collectionMatcher = {
                id: anyObjectId,
                created_at: stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
                updated_at: stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
                posts: [{
                    id: anyObjectId
                }]
            };
            const buildCollectionMatcher = (postsCount) => {
                return {
                    id: anyObjectId,
                    created_at: stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
                    updated_at: stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
                    posts: Array(postsCount).fill(collectionPostMatcher)
                };
            };

            await agent.put(`/posts/${postResponse.id}/`)
                .body({posts: [Object.assign({}, postResponse, {collections: [collectionToRemove.id]})]})
                .expectStatus(200)
                .matchBodySnapshot({
                    posts: [
                        Object.assign({}, matchPostShallowIncludes, {published_at: null}, {collections: [
                            // collectionToRemove
                            collectionMatcher,
                            // automatic "latest" collection which cannot be removed
                            buildCollectionMatcher(18)
                        ]})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'x-cache-invalidate': stringMatching(/\/p\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
                });

            await agent.put(`/posts/${postResponse.id}/`)
                .body({posts: [Object.assign({}, postResponse, {collections: [collectionToAdd.id]})]})
                .expectStatus(200)
                .matchBodySnapshot({
                    posts: [
                        Object.assign({}, matchPostShallowIncludes, {published_at: null}, {collections: [
                            // collectionToAdd
                            collectionMatcher,
                            // automatic "latest" collection which cannot be removed
                            buildCollectionMatcher(18)
                        ]})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'x-cache-invalidate': stringMatching(/\/p\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
                });
        });
    });

    describe('Delete', function () {
        it('Can destroy a post', async function () {
            await agent
                .delete(`posts/${fixtureManager.get('posts', 0).id}/`)
                .expectStatus(204)
                .expectEmptyBody()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot delete a non-existent posts', async function () {
            // This error message from the API is not really what I would expect
            // Adding this as a guard to demonstrate how future refactoring improves the output
            await agent
                .delete('/posts/abcd1234abcd1234abcd1234/')
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

    describe('Copy', function () {
        it('Can copy a post', async function () {
            const post = {
                title: 'Test Post',
                status: 'published'
            };

            const {body: postBody} = await agent
                .post('/posts/?formats=mobiledoc,lexical,html', {
                    headers: {
                        'content-type': 'application/json'
                    }
                })
                .body({posts: [post]})
                .expectStatus(201);

            const [postResponse] = postBody.posts;

            await agent
                .post(`/posts/${postResponse.id}/copy?formats=mobiledoc,lexical`)
                .expectStatus(201)
                .matchBodySnapshot({
                    posts: [Object.assign({}, matchPostShallowIncludes, {published_at: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('posts')
                });
        });
    });
});
