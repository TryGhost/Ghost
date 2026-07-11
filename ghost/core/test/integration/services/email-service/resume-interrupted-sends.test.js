const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const sinon = require('sinon');
const assert = require('node:assert/strict');
const logging = require('@tryghost/logging');
const jobManager = require('../../../../core/server/services/jobs/job-service');
const configUtils = require('../../../utils/config-utils');
const emailService = require('../../../../core/server/services/email-service');
const {sendEmail} = require('../../../utils/batch-email-utils');

describe('Resume interrupted sends', function () {
    let agent;
    let stubbedSend;
    let ghostServer;

    beforeAll(async function () {
        const agents = await agentProvider.getAgentsWithFrontend();
        agent = agents.adminAgent;
        ghostServer = agents.ghostServer;

        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        // Force multiple batches from the 4 default fixture members.
        configUtils.set('bulkEmail:batchSize', 2);

        stubbedSend = sinon.fake.resolves({id: 'stubbed-email-id'});
        mockManager.mockMail();
        mockManager.mockMailgun(function () {
            return stubbedSend.call(this, ...arguments);
        });
        mockManager.mockStripe();
    });

    afterEach(async function () {
        await configUtils.restore();
        mockManager.restore();
        await jobManager.allSettled();
    });

    afterAll(async function () {
        mockManager.restore();
        await ghostServer.stop();
    });

    it('resumes a pending batch and skips an already-submitted batch', async function () {
        // 1. Send a real email to populate the DB with a full set of related rows
        //    (post + email + batches + recipients + members).
        const {emailModel} = await sendEmail(agent);

        // Sanity: 4 fixture members + batchSize=2 = 2 batches, all submitted.
        let batches = (await models.EmailBatch.findAll({filter: `email_id:'${emailModel.id}'`})).models;
        assert.equal(batches.length, 2, 'expected exactly 2 batches after initial send');
        assert.equal(batches[0].get('status'), 'submitted');
        assert.equal(batches[1].get('status'), 'submitted');

        // 2. Mutate the DB to simulate a crash mid-send: one batch never made it to Mailgun,
        //    the other did; the parent email row is stuck in `submitting`.
        const [batchA, batchB] = batches;
        await batchB.save({status: 'pending', provider_id: null}, {patch: true, autoRefresh: false});
        await emailModel.save({status: 'submitting'}, {patch: true, autoRefresh: false});

        // 3. Reset the Mailgun stub so we only count calls produced by the resume.
        const mailgunStub = mockManager.getMailgunCreateMessageStub();
        mailgunStub.resetHistory();

        // 4. Run the scanner. It will flip email -> pending and call scheduleEmail; the job
        //    that fires re-enters the normal emailJob -> sendBatches path.
        const completedPromise = jobManager.awaitCompletion('batch-sending-service-job');
        await emailService.service.resumeInterruptedSends();
        await completedPromise;

        // 5. Final state.
        await emailModel.refresh();
        assert.equal(emailModel.get('status'), 'submitted', 'email should re-promote to submitted after resume');

        batches = (await models.EmailBatch.findAll({filter: `email_id:'${emailModel.id}'`})).models;
        const refreshedA = batches.find(b => b.id === batchA.id);
        const refreshedB = batches.find(b => b.id === batchB.id);
        assert.equal(refreshedA.get('status'), 'submitted', 'already-submitted batch remains submitted');
        assert.equal(refreshedB.get('status'), 'submitted', 'previously-pending batch is now submitted');

        // Mailgun called exactly once (for batchB only — batchA was short-circuited).
        sinon.assert.calledOnce(mailgunStub);
    });

    it('marks email as failed when an orphan submitting batch is encountered', async function () {
        // Same setup, but this time one of the batches is left as `submitting` — the orphan
        // state a crashed worker leaves behind. The (b) short-circuit fix should refuse to
        // re-send it (Mailgun-side state unknown) and the parent email should land in `failed`
        // for operator reconciliation.
        const {emailModel} = await sendEmail(agent);

        let batches = (await models.EmailBatch.findAll({filter: `email_id:'${emailModel.id}'`})).models;
        assert.equal(batches.length, 2);

        const [batchA, batchB] = batches;
        // batchA: stays submitted (already accepted by Mailgun on the original run)
        // batchB: flipped to submitting (orphan from crash) — provider_id intentionally preserved
        //          so the breadcrumb in the runbook still cross-references against Mailgun.
        await batchB.save({status: 'submitting'}, {patch: true, autoRefresh: false});
        await emailModel.save({status: 'submitting'}, {patch: true, autoRefresh: false});

        const mailgunStub = mockManager.getMailgunCreateMessageStub();
        mailgunStub.resetHistory();

        // The orphan batch is an expected, deliberately-triggered failure path (see the
        // "orphan from a crashed worker" guard in batch-sending-service.js) — stub the
        // logger so we can assert that guard fired instead of spamming stdout.
        const errorLog = sinon.stub(logging, 'error');

        const completedPromise = jobManager.awaitCompletion('batch-sending-service-job');
        await emailService.service.resumeInterruptedSends();
        await completedPromise;

        // The orphan batch causes sendBatches' partial-failure throw; emailJob catches and
        // marks the email failed. The orphan batch row is intentionally left in `submitting`
        // so an operator can reconcile it against the Mailgun dashboard before retrying.
        await emailModel.refresh();
        assert.equal(emailModel.get('status'), 'failed', 'email should promote to failed when an orphan submitting batch is present');

        // The orphan-batch guard logs a string; the outer emailJob catch (which also fires,
        // since the partial failure propagates up) logs an EmailError object — only check
        // for the specific guard message we're testing here, not every call's shape.
        const orphanLogs = errorLog.getCalls().filter(call => typeof call.args[0] === 'string' && /is stuck in status=submitting \(orphan from a crashed worker\)/.test(call.args[0]));
        assert.ok(orphanLogs.length > 0, 'expected the "orphan from a crashed worker" guard to log an error');

        batches = (await models.EmailBatch.findAll({filter: `email_id:'${emailModel.id}'`})).models;
        const refreshedA = batches.find(b => b.id === batchA.id);
        const refreshedB = batches.find(b => b.id === batchB.id);
        assert.equal(refreshedA.get('status'), 'submitted', 'already-submitted batch remains submitted');
        assert.equal(refreshedB.get('status'), 'submitting', 'orphan submitting batch is preserved for operator review');

        // No batches were `pending`, so no new Mailgun calls should fire.
        sinon.assert.notCalled(mailgunStub);
    });

    it('marks email as failed when the parent post is no longer published', async function () {
        // Scanner check: post.status !== 'published'/'sent' -> flip email to failed and skip the resume.
        const {emailModel} = await sendEmail(agent);
        await emailModel.save({status: 'submitting'}, {patch: true, autoRefresh: false});

        // Unpublish the post by setting it back to draft.
        const post = await emailModel.getLazyRelation('post');
        await post.save({status: 'draft'}, {patch: true, autoRefresh: false});

        const mailgunStub = mockManager.getMailgunCreateMessageStub();
        mailgunStub.resetHistory();

        await emailService.service.resumeInterruptedSends();
        // No job should be enqueued for this email, so no awaitCompletion — we use allSettled
        // in afterEach to drain anything else.

        await emailModel.refresh();
        assert.equal(emailModel.get('status'), 'failed', 'email should be flipped to failed when post is no longer published');
        sinon.assert.notCalled(mailgunStub);
    });
});
