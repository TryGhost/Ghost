const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {nullable, anyContentVersion, anyEtag, anyObjectId, anyUuid, anyISODateTime, anyString} = matchers;
const assert = require('assert/strict');
const sinon = require('sinon');
const jobManager = require('../../../core/server/services/jobs/job-service');
const models = require('../../../core/server/models');

const matchEmail = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    submitted_at: anyISODateTime
};

const matchEmailNewsletter = {
    ...matchEmail,
    newsletter_id: anyObjectId
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
        await fixtureManager.init('posts', 'newsletters', 'members', 'members:emails:failed');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockEvents();
        mockManager.mockMailgun();
    });

    afterEach(function () {
        mockManager.restore();
        sinon.restore();
    });

    it('Can browse emails', async function () {
        await agent
            .get('emails')
            .expectStatus(200)
            .matchBodySnapshot({
                emails: new Array(2).fill(matchEmail)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        await jobManager.allSettled();
        mockManager.assert.emittedEvent('email.edited');
    });

    it('Can browse email batches', async function () {
        await agent
            .get(`emails/${fixtureManager.get('emails', 0).id}/batches/`)
            .expectStatus(200)
            .matchBodySnapshot({
                batches: [matchBatch]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    // Older Ghost emails still have a html body and plaintext body set.
    it('Does default replacements on the HTML body of an old email', async function () {
        const html = '<p style="margin: 0 0 1.5em 0; line-height: 1.6em;">Hey %%{first_name, &quot;there&quot;}%%, Hey %%{first_name}%%,</p><a href="%%{unsubscribe_url}%%">Unsubscribe</a>';
        const plaintext = 'Hey %%{first_name, "there"}%%, Hey %%{first_name}%%\nUnsubscribe [%%{unsubscribe_url}%%]';

        // Create this email model in the database
        const email = await models.Email.add({
            post_id: fixtureManager.get('posts', 2).id,
            newsletter_id: fixtureManager.get('newsletters', 0).id,
            status: 'submitted',
            submitted_at: new Date(),
            track_opens: false,
            track_clicks: false,
            feedback_enabled: false,
            recipient_filter: 'all',
            subject: 'Test email',
            from: 'support@example.com',
            replyTo: null,
            email_count: 1,
            source: '{}',
            source_type: 'lexical',
            html,
            plaintext
        });

        const {body} = await agent
            .get(`emails/${email.id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                emails: [matchEmailNewsletter]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Simple check that there are not %%{ leftover (in case the snapshots gets updated without noticing what this test is checking)
        assert.equal(body.emails[0].html.includes('%%{'), false);
        assert.equal(body.emails[0].plaintext.includes('%%{'), false);
    });
});
