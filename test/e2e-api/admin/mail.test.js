const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {anyEtag} = matchers;

describe('Mail API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('invites');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockMail({message: 'sent'});
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can send mail', async function () {
        await agent
            .post('mail/')
            .body({
                mail: [{
                    message: {
                        to: 'joe@example.com',
                        subject: 'testemail',
                        html: '<p>This</p>'
                    }
                }]
            })
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        mockManager.assert.sentEmail({
            to: 'joe@example.com',
            subject: 'testemail'
        });
    });

    it('Can send a test mail', async function () {
        // @TODO: either remove this endpoint or fix its response body
        await agent
            .post('mail/test')
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        mockManager.assert.sentEmail({
            to: 'jbloggs@example.com',
            subject: 'Test Ghost Email'
        });
    });
});
