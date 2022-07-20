const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyObjectId, anyISODateTime, anyErrorId, anyEtag, anyLocationFor} = matchers;

const matchLabel = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Labels API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    it('Can browse with no labels', async function () {
        await agent
            .get('labels')
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can add', async function () {
        await agent
            .post('labels')
            .body({labels: [{
                name: 'test'
            }]})
            .expectStatus(201)
            .matchBodySnapshot({
                labels: [matchLabel]
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('labels')
            });
    });

    it('Errors when adding label with the same name', async function () {
        await agent
            .post('labels')
            .body({labels: [{
                name: 'test'
            }]})
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

    it('Can browse with member count', async function () {
        await agent
            .get('labels/?include=count.members')
            .expectStatus(200)
            .matchBodySnapshot({
                labels: [matchLabel]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can read by slug and edit', async function () {
        const {body} = await agent
            .get('labels/slug/test/')
            .expectStatus(200)
            .matchBodySnapshot({
                labels: [matchLabel]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        const id = body.labels[0].id;

        await agent
            .put(`labels/${id}`)
            .body({labels: [{name: 'testing'}]})
            .expectStatus(200)
            .matchBodySnapshot({
                labels: [matchLabel]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can destroy', async function () {
        const {body} = await agent
            .get('labels/slug/test/')
            .expectStatus(200)
            .matchBodySnapshot({
                labels: [matchLabel]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        const id = body.labels[0].id;

        await agent
            .delete(`labels/${id}`)
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});
