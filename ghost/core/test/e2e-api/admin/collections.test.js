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
    anyLocationFor,
    anyObjectId
} = matchers;

const matchCollection = {
    id: anyObjectId
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

    it('Can edit a Collection', async function () {
        const collection = {
            title: 'Test Collection to Edit'
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

        const editResponse = await agent
            .put(`/collections/${collectionId}/`)
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
});
