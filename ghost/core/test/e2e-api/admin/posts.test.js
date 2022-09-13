const assert = require('assert');
const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {anyArray, anyEtag, anyErrorId, anyLocationFor, anyObject, anyObjectId, anyISODateTime, anyString, anyUuid} = matchers;

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

describe('Posts API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can browse', async function () {
        const res = await agent.get('posts/?limit=2')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(2).fill(matchPostShallowIncludes)
            });
    });

    it('Can browse with formats', async function () {
        const res = await agent.get('posts/?formats=mobiledoc,lexical,html,plaintext&limit=2')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(2).fill(matchPostShallowIncludes)
            });
    });

    describe('Create', function () {
        it('Can create a post with mobiledoc', async function () {
            const post = {
                title: 'Mobiledoc test',
                mobiledoc: JSON.stringify({
                    version: '0.3.1',
                    ghostVersion: '4.0',
                    markups: [],
                    atoms: [],
                    cards: [],
                    sections: [
                        [1, 'p', [
                            [0, [], 0, 'Testing post creation with mobiledoc']
                        ]]
                    ]
                }),
                lexical: null
            };

            await agent
                .post('/posts/?formats=mobiledoc,lexical')
                .body({posts: [post]})
                .expectStatus(201)
                .matchBodySnapshot({
                    posts: [Object.assign(matchPostShallowIncludes, {published_at: null})]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    location: anyLocationFor('posts')
                });
        });

        it('Can create a post with lexical', async function () {
            const post = {
                title: 'Lexical test',
                mobiledoc: null,
                lexical: JSON.stringify({
                    editorState: {
                        root: {
                            children: [
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'Testing post creation with lexical',
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
                    },
                    lastSaved: 1663081361393,
                    source: 'Playground',
                    version: '0.4.1'
                })
            };

            await agent
                .post('/posts/?formats=mobiledoc,lexical')
                .body({posts: [post]})
                .expectStatus(201)
                .matchBodySnapshot({
                    posts: [Object.assign(matchPostShallowIncludes, {published_at: null})]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    location: anyLocationFor('posts')
                });
        });

        it('Errors if both mobiledoc and lexical are present', async function () {
            const post = {
                title: 'Mobiledoc+lexical test',
                mobiledoc: JSON.stringify({
                    version: '0.3.1',
                    ghostVersion: '4.0',
                    markups: [],
                    atoms: [],
                    cards: [],
                    sections: [
                        [1, 'p', [
                            [0, [], 0, 'Testing post creation with mobiledoc']
                        ]]
                    ]
                }),
                lexical: JSON.stringify({
                    editorState: {
                        root: {
                            children: [
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'Testing post creation with lexical',
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
                    },
                    lastSaved: 1663081361393,
                    source: 'Playground',
                    version: '0.4.1'
                })
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
                    etag: anyEtag
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
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });
    });
});
