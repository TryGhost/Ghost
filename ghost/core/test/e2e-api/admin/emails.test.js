const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {nullable, anything, anyEtag, anyObjectId, anyUuid, anyISODateTime, anyErrorId, anyString} = matchers;
const assert = require('assert');

const matchEmail = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    submitted_at: anyISODateTime
};

const matchBatch = {
    id: anyObjectId,
    provider_id: anyString,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const matchFailure = {
    id: anyObjectId,
    failed_at: anyISODateTime,
    event_id: anyString
};

describe('Emails API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'members', 'members:emails:failed');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockEvents();
        mockManager.mockLabsDisabled('emailStability');
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

    it('Can browse email batches', async function () {
        await agent
            .get(`emails/${fixtureManager.get('emails', 0).id}/batches/`)
            .expectStatus(200)
            .matchBodySnapshot({
                batches: [matchBatch]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can browse email batches with recipient count', async function () {
        const {body} = await agent
            .get(`emails/${fixtureManager.get('emails', 0).id}/batches/?include=count.recipients`)
            .expectStatus(200)
            .matchBodySnapshot({
                batches: [matchBatch]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
        assert.equal(body.batches[0].count.recipients, 6);
    });

    it('Can browse all email failures', async function () {
        await agent
            .get(`emails/${fixtureManager.get('emails', 0).id}/recipient-failures/?order=failed_at%20DESC`)
            .expectStatus(200)
            .matchBodySnapshot({
                failures: new Array(5).fill(matchFailure)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can browse permanent email failures', async function () {
        await agent
            .get(`emails/${fixtureManager.get('emails', 0).id}/recipient-failures/?filter=severity:permanent&order=failed_at%20DESC`)
            .expectStatus(200)
            .matchBodySnapshot({
                failures: new Array(1).fill(matchFailure)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can browse temporary email failures', async function () {
        await agent
            .get(`emails/${fixtureManager.get('emails', 0).id}/recipient-failures/?filter=severity:temporary&order=failed_at%20DESC`)
            .expectStatus(200)
            .matchBodySnapshot({
                failures: new Array(4).fill(matchFailure)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can browse email failures with includes', async function () {
        await agent
            .get(`emails/${fixtureManager.get('emails', 0).id}/recipient-failures/?order=failed_at%20DESC&include=member,email_recipient`)
            .expectStatus(200)
            .matchBodySnapshot({
                failures: new Array(5).fill({
                    ...matchFailure,
                    member: {
                        id: anyObjectId,
                        uuid: anyUuid
                    },
                    email_recipient: {
                        id: anyObjectId,
                        member_uuid: anyUuid,
                        opened_at: nullable(anyISODateTime), // Can be null or string
                        delivered_at: nullable(anyISODateTime), // Can be null or string
                        failed_at: nullable(anyISODateTime), // Can be null or string
                        processed_at: anyISODateTime,
                        batch_id: anyObjectId
                    }
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});
