const should = require('should');
const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {anyArray, anyContentVersion, anyEtag, anyErrorId, anyLocationFor, anyObject, anyObjectId, anyISODateTime, anyString, anyStringNumber, anyUuid, stringMatching} = matchers;
const models = require('../../../core/server/models');
const escapeRegExp = require('lodash/escapeRegExp');
const {mobiledocToLexical} = require('@tryghost/kg-converters');

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
    published_at: anyISODateTime
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
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts');
        await agent.loginAsOwner();

        // convert inserted pages to lexical so we can test page.html reset/re-render
        const pages = await models.Post.where('type', 'page').fetchAll();
        for (const page of pages) {
            const lexical = mobiledocToLexical(page.get('mobiledoc'));
            await models.Base.knex.raw('UPDATE posts SET mobiledoc=NULL, lexical=? where id=?', [lexical, page.id]);
        }
    });

    afterEach(async function () {
        // gives pages some HTML back to alleviate test interdependence when pages are reset on create/update/delete
        await models.Base.knex.raw('update posts set html = "<p>Testing</p>" where type = \'page\'');

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

        it('Can create a post with html', async function () {
            const post = {
                title: 'HTML test',
                html: '<p>Testing post creation with html</p>'
            };

            await agent
                .post('/posts/?source=html&formats=mobiledoc,lexical,html')
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

        it('Errors if feature_image_alt is too long', async function () {
            const post = {
                title: 'Feature image alt too long',
                feature_image_alt: 'a'.repeat(201)
            };

            await agent
                .post('/posts/?formats=mobiledoc,lexical,html')
                .body({posts: [post]})
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId,
                        // TODO: this should be `posts.feature_image_alt` but we're hitting revision errors first
                        context: stringMatching(/.*post_revisions\.feature_image_alt] exceeds maximum length of 191 characters.*/)
                    }]
                });
        });

        it('invalidates preview cache when updating a draft post', async function () {
            const post = {
                title: 'Cache invalidation test',
                status: 'draft'
            };

            const {body: postBody} = await agent
                .post('/posts/?formats=mobiledoc,lexical,html')
                .body({posts: [post]})
                .expectStatus(201);

            const [postResponse] = postBody.posts;

            // check that header contains the correct cache invalidation pattern which is the post url and the post url with member_status=anonymous, free, paid
            await agent
                .put(`/posts/${postResponse.id}/?formats=mobiledoc,lexical,html`)
                .body({posts: [Object.assign({}, postResponse, {status: 'draft'})]})
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'x-cache-invalidate': stringMatching(/^\/p\/[a-z0-9-]+\/, \/p\/[a-z0-9-]+\/\?member_status=anonymous, \/p\/[a-z0-9-]+\/\?member_status=free, \/p\/[a-z0-9-]+\/\?member_status=paid$/)
                });
        });

        // update when updating a scheduled post
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
                    'x-cache-invalidate': stringMatching(/^\/p\/[a-z0-9-]+\/, \/p\/[a-z0-9-]+\/\?member_status=anonymous, \/p\/[a-z0-9-]+\/\?member_status=free, \/p\/[a-z0-9-]+\/\?member_status=paid$/)
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
                    'x-cache-invalidate': stringMatching(/^\/p\/[a-z0-9-]+\/, \/p\/[a-z0-9-]+\/\?member_status=anonymous, \/p\/[a-z0-9-]+\/\?member_status=free, \/p\/[a-z0-9-]+\/\?member_status=paid$/)
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

        describe('Access', function () {
            describe('Visibility is set to tiers', function () {
                it('Saves only paid tiers', async function () {
                    const post = {
                        title: 'Test Page',
                        status: 'draft'
                    };

                    // @ts-ignore
                    const products = await models.Product.findAll();

                    const freeTier = products.models[0];
                    const paidTier = products.models[1];

                    const {body: pageBody} = await agent
                        .post('/posts/', {
                            headers: {
                                'content-type': 'application/json'
                            }
                        })
                        .body({posts: [post]})
                        .expectStatus(201);

                    const [pageResponse] = pageBody.posts;

                    await agent
                        .put(`/posts/${pageResponse.id}`)
                        .body({
                            posts: [{
                                id: pageResponse.id,
                                updated_at: pageResponse.updated_at,
                                visibility: 'tiers',
                                tiers: [
                                    {id: freeTier.id},
                                    {id: paidTier.id}
                                ]
                            }]
                        })
                        .expectStatus(200)
                        .matchHeaderSnapshot({
                            'content-version': anyContentVersion,
                            etag: anyEtag,
                            'x-cache-invalidate': stringMatching(/^\/p\/[a-z0-9-]+\/, \/p\/[a-z0-9-]+\/\?member_status=anonymous, \/p\/[a-z0-9-]+\/\?member_status=free, \/p\/[a-z0-9-]+\/\?member_status=paid$/)
                        })
                        .matchBodySnapshot({
                            posts: [Object.assign({}, matchPostShallowIncludes, {
                                published_at: null,
                                tiers: [
                                    {type: paidTier.get('type'), ...tierSnapshot}
                                ]
                            })]
                        });
                });
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

    describe('Convert', function () {
        it('can convert a mobiledoc post to lexical', async function () {
            const mobiledoc = createMobiledoc('This is some great content.');
            const expectedLexical = createLexical('This is some great content.');
            const postData = {
                title: 'Test Post',
                status: 'published',
                mobiledoc: mobiledoc,
                lexical: null
            };

            const {body} = await agent
                .post('/posts/?formats=mobiledoc,lexical,html', {
                    headers: {
                        'content-type': 'application/json'
                    }
                })
                .body({posts: [postData]})
                .expectStatus(201);

            const [postResponse] = body.posts;

            const conversionResponse = await agent
                .put(`/posts/${postResponse.id}/?formats=mobiledoc,lexical,html&convert_to_lexical=true`)
                .body({posts: [Object.assign({}, postResponse)]})
                .expectStatus(200)
                .matchBodySnapshot({
                    posts: [Object.assign({}, matchPostShallowIncludes, {lexical: expectedLexical, mobiledoc: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            const convertedPost = conversionResponse.body.posts[0];
            const expectedConvertedLexical = convertedPost.lexical;
            await agent
                .put(`/posts/${postResponse.id}/?formats=mobiledoc,lexical,html&convert_to_lexical=true`)
                .body({posts: [Object.assign({}, convertedPost)]})
                .expectStatus(200)
                .matchBodySnapshot({
                    posts: [Object.assign({}, matchPostShallowIncludes, {lexical: expectedConvertedLexical, mobiledoc: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('With integration auth', function () {
        it('can create and update a post with revisions', async function () {
            // Use Zapier integration to test integration auth scenario
            await agent.useZapierAdminAPIKey();

            const lexical = createLexical('This is content for revision testing.');
            const postData = {
                title: 'Integration Auth Test Post',
                status: 'published',
                lexical: lexical,
                mobiledoc: null
            };

            // Create post using integration auth - this should trigger the revision creation
            // with author fallback to owner user when contextUser returns integration context
            const {body} = await agent
                .post('/posts/?formats=lexical')
                .body({posts: [postData]})
                .expectStatus(201);

            const [postResponse] = body.posts;
            postResponse.title.should.equal('Integration Auth Test Post');
            postResponse.status.should.equal('published');
            postResponse.lexical.should.equal(lexical);

            // Verify the post revision was created with owner user as author
            const ownerUser = await models.User.getOwnerUser();
            const postRevisions = await models.PostRevision
                .where('post_id', postResponse.id)
                .fetchAll();

            postRevisions.length.should.equal(1);
            const revision = postRevisions.at(0);
            revision.get('lexical').should.equal(lexical);
            revision.get('author_id').should.equal(ownerUser.get('id'));

            // Update the post to ensure revision creation works properly
            const updatedLexical = createLexical('Updated content for revision testing.');
            await agent
                .put(`/posts/${postResponse.id}/?formats=lexical&save_revision=true`)
                .body({posts: [{
                    ...postResponse,
                    lexical: updatedLexical
                }]})
                .expectStatus(200);

            // Verify updated revision also has owner user as author
            const updatedRevisions = await models.PostRevision
                .where('post_id', postResponse.id)
                .orderBy('created_at_ts', 'desc')
                .fetchAll();

            updatedRevisions.length.should.equal(2);
            const latestRevision = updatedRevisions.at(0);
            latestRevision.get('lexical').should.equal(updatedLexical);
            latestRevision.get('author_id').should.equal(ownerUser.get('id'));

            // Verify the post was updated successfully
            await agent
                .get(`/posts/${postResponse.id}/?formats=lexical`)
                .expectStatus(200)
                .matchBodySnapshot({
                    posts: [Object.assign({}, matchPostShallowIncludes, {
                        lexical: updatedLexical
                    })]
                });
        });
    });
});
