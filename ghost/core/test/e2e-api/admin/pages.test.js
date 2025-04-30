const {mobiledocToLexical} = require('@tryghost/kg-converters');
const models = require('../../../core/server/models');
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
    show_title_and_feature_image: anyBoolean
};

describe('Pages API', function () {
    let agent;

    before(async function () {
        mockManager.mockLabsEnabled('collectionsCard');
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('Read', function () {
        it('Re-renders html when null', async function () {
            // "queue" an existing page for re-render as happens when a published page is updated/destroyed
            const page = await models.Post.findOne({slug: 'static-page-test'});
            // NOTE: re-rendering only occurs for lexical pages
            const lexical = mobiledocToLexical(page.get('mobiledoc'));
            await models.Base.knex.raw('UPDATE posts set html=NULL, mobiledoc=NULL, lexical=? WHERE id=?', [lexical, page.id]);

            await agent
                .get(`/pages/${page.id}/?formats=mobiledoc,lexical,html`)
                .expectStatus(200)
                .matchBodySnapshot({
                    pages: [Object.assign({}, matchPageShallowIncludes)]
                });
        });
    });

    describe('Browse', function () {
        it('Re-renders html when null', async function () {
            // convert inserted pages to lexical and set html=null so we can test re-render
            const pages = await models.Post.where('type', 'page').fetchAll();
            for (const page of pages) {
                if (!page.get('mobiledoc')) {
                    continue;
                }
                const lexical = mobiledocToLexical(page.get('mobiledoc'));
                await models.Base.knex.raw('UPDATE posts set html=NULL, mobiledoc=NULL, lexical=? WHERE id=?', [lexical, page.id]);
            }

            await agent
                .get('/pages/?formats=mobiledoc,lexical,html')
                .expectStatus(200)
                .matchBodySnapshot({
                    pages: Array(pages.length).fill(Object.assign({}, matchPageShallowIncludes))
                });
        });
    });

    describe('Create', function () {
        it('Can create a page with html', async function () {
            const page = {
                title: 'HTML test',
                html: '<p>Testing page creation with html</p>'
            };

            await agent
                .post('/pages/?source=html&formats=mobiledoc,lexical,html')
                .body({pages: [page]})
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

        describe('Access', function () {
            describe('Visibility is set to tiers', function () {
                it('Saves only paid tiers', async function () {
                    const page = {
                        title: 'Test Page',
                        status: 'draft'
                    };

                    // @ts-ignore
                    const products = await models.Product.findAll();

                    const freeTier = products.models[0];
                    const paidTier = products.models[1];

                    const {body: pageBody} = await agent
                        .post('/pages/', {
                            headers: {
                                'content-type': 'application/json'
                            }
                        })
                        .body({pages: [page]})
                        .expectStatus(201);

                    const [pageResponse] = pageBody.pages;

                    await agent
                        .put(`/pages/${pageResponse.id}`)
                        .body({
                            pages: [{
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
                            'x-cache-invalidate': anyString
                        })
                        .matchBodySnapshot({
                            pages: [Object.assign({}, matchPageShallowIncludes, {
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

            const convertedResponse = await agent
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

            // rerunning the conversion against a converted post should not change it
            const convertedPage = convertedResponse.body.pages[0];
            const expectedConvertedLexical = convertedPage.lexical;
            await agent
                .put(`/pages/${pageResponse.id}/?formats=mobiledoc,lexical,html&convert_to_lexical=true`)
                .body({pages: [Object.assign({}, convertedPage)]})
                .expectStatus(200)
                .matchBodySnapshot({
                    pages: [Object.assign({}, matchPageShallowIncludes, {lexical: expectedConvertedLexical, mobiledoc: null})]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });
});
