const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyISODateTime, anyErrorId} = matchers;

const matchEmail = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    submitted_at: anyISODateTime
};

describe('Emails API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'emails');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockEvents();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can browse emails', async function () {
        await agent
            .get('emails')
            .expectStatus(200)
            .matchBodySnapshot({
                emails: new Array(2).fill(matchEmail)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can read an email', async function () {
        await agent
            .get(`emails/${fixtureManager.get('emails', 0).id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                emails: [matchEmail]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can retry a failed email', async function () {
        await agent
            .put(`emails/${fixtureManager.get('emails', 1).id}/retry`)
            .expectStatus(200)
            .matchBodySnapshot({
                emails: [matchEmail]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        mockManager.assert.emittedEvent('email.edited');
    });

    it('Errors when retrying an email that was successful', async function () {
        await agent
            .put(`emails/${fixtureManager.get('emails', 0).id}/retry`)
            .expectStatus(400)
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
