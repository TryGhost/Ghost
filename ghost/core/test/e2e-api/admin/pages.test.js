const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {anyArray, anyBoolean, anyContentVersion, anyEtag, anyLocationFor, anyObject, anyObjectId, anyISODateTime, anyString, anyUuid} = matchers;

const tierSnapshot = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const matchPageShallowIncludes = {
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
    post_revisions: anyArray,
    show_title_and_feature_image: anyBoolean
};

describe('Pages API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('Update', function () {
        it('Can modify show_title_and_feature_image property', async function () {
            const page = {
                title: 'Test Page',
                status: 'draft'
            };

            const {body: pageBody} = await agent
                .post('/pages/?formats=mobiledoc,lexical,html', {
                    headers: {
                        'content-type': 'application/json'
                    }
                })
                .body({pages: [page]})
                .expectStatus(201);

            const [pageResponse] = pageBody.pages;

            await agent
                .put(`/pages/${pageResponse.id}/?formats=mobiledoc,lexical,html`)
                .body({
                    pages: [{
                        id: pageResponse.id,
                        show_title_and_feature_image: false, // default is true
                        updated_at: pageResponse.updated_at // satisfy collision detection
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    pages: [Object.assign({}, matchPageShallowIncludes, {
                        published_at: null,
                        show_title_and_feature_image: false
                    })]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'x-cache-invalidate': anyString
                });
        });
    });

    describe('Copy', function () {
        it('Can copy a page', async function () {
            const page = {
                title: 'Test Page',
                status: 'published'
            };

            const {body: pageBody} = await agent
                .post('/pages/?formats=mobiledoc,lexical,html', {
                    headers: {
                        'content-type': 'application/json'
                    }
                })
                .body({pages: [page]})
                .expectStatus(201)
                .matchBodySnapshot({
                    pages: [Object.assign({}, matchPageShallowIncludes)]
                });

            const [pageResponse] = pageBody.pages;

            await agent
                .post(`/pages/${pageResponse.id}/copy?formats=mobiledoc,lexical`)
                .expectStatus(201)
                .matchBodySnapshot({
                    pages: [Object.assign({}, matchPageShallowIncludes, {published_at: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('pages')
                });
        });
    });

    describe('Convert', function () {
        it('can convert a mobiledoc page to lexical', async function () { 
            const mobiledoc = JSON.stringify({
                version: '0.3.1',
                ghostVersion: '4.0',
                markups: [],
                atoms: [],
                cards: [],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'This is some great content.']
                    ]]
                ]
            });
            const expectedLexical = JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'This is some great content.',
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
            const pageData = {
                title: 'Test Post',
                status: 'published',
                mobiledoc: mobiledoc,
                lexical: null
            };

            const {body: pageBody} = await agent
                .post('/pages/?formats=mobiledoc,lexical,html', {
                    headers: {
                        'content-type': 'application/json'
                    }
                })
                .body({pages: [pageData]})
                .expectStatus(201);

            const [pageResponse] = pageBody.pages;

            await agent
                .put(`/pages/${pageResponse.id}/?formats=mobiledoc,lexical,html&convert_to_lexical=true`)
                .body({pages: [Object.assign({}, pageResponse)]})
                .expectStatus(200)
                .matchBodySnapshot({
                    pages: [Object.assign({}, matchPageShallowIncludes, {lexical: expectedLexical, mobiledoc: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });
});
