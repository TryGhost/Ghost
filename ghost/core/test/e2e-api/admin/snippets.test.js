const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyLocationFor, anyObjectId, anyISODateTime, anyErrorId} = matchers;

const matchSnippet = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Snippets API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('snippets');
        await agent.loginAsOwner();
    });

    it('Can add', async function () {
        const snippet = {
            name: 'test',
            mobiledoc: JSON.stringify({})
        };

        await agent
            .post('snippets/')
            .body({snippets: [snippet]})
            .expectStatus(201)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('snippets')
            });
    });

    it('Can browse', async function () {
        await agent
            .get('snippets')
            .expectStatus(200)
            .matchBodySnapshot({
                snippets: new Array(2).fill(matchSnippet)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can read', async function () {
        await agent
            .get(`snippets/${fixtureManager.get('snippets', 0).id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can edit', async function () {
        const snippetToChange = {
            name: 'change me',
            mobiledoc: '{}'
        };

        const snippetChanged = {
            name: 'changed',
            mobiledoc: '{}'
        };

        const {body} = await agent
            .post(`snippets/`)
            .body({snippets: [snippetToChange]})
            .expectStatus(201)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('snippets')
            });

        const newsnippet = body.snippets[0];

        await agent
            .put(`snippets/${newsnippet.id}/`)
            .body({snippets: [snippetChanged]})
            .expectStatus(200)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can destroy', async function () {
        const snippet = {
            name: 'destroy test',
            mobiledoc: '{}'
        };

        const {body} = await agent
            .post(`snippets/`)
            .body({snippets: [snippet]})
            .expectStatus(201)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('snippets')
            });

        const newSnippet = body.snippets[0];

        await agent
            .delete(`snippets/${newSnippet.id}`)
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        await agent
            .get(`snippets/${newSnippet.id}/`)
            .expectStatus(404)
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
