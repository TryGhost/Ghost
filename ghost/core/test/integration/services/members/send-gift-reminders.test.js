const assert = require('node:assert/strict');
const sinon = require('sinon');
const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// This test exercises the gift reminder polling path end-to-end against a real
// database and the real GiftService/Repository wiring. It calls
// `giftService.service.processReminders()` directly rather than spawning the
// worker thread — the worker script is a thin wrapper and spawning it in-process
// means we can't intercept the email transport on the parent thread.

describe('Gift reminder processing', function () {
    let giftService;
    let emailMockReceiver;
    let paidTier;
    let redeemerMember;
    let giftSequence = 0;

    before(async function () {
        const agent = await agentProvider.getAdminAPIAgent();

        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();

        giftService = require('../../../../core/server/services/gifts');
        await giftService.init();

        paidTier = await models.Product.findOne({type: 'paid'}, {require: true});
    });

    beforeEach(async function () {
        mockManager.mockLabsEnabled('giftSubscriptions');
        emailMockReceiver = mockManager.mockMail();

        redeemerMember = await models.Member.add({
            email: `gift-redeemer-${Date.now()}-${Math.random()}@example.com`,
            name: 'Gift Redeemer',
            status: 'gift',
            email_disabled: false
        });
    });

    afterEach(async function () {
        await models.Gift.query().del();

        if (redeemerMember) {
            await models.Member.destroy({id: redeemerMember.id});
        }

        mockManager.restore();
        sinon.restore();
    });

    async function createRedeemedGift(options = {}) {
        const {
            consumesAt,
            consumesSoonReminderSentAt = null,
            redeemerId = redeemerMember.id,
            overrides = {}
        } = options;

        giftSequence += 1;
        const sequence = giftSequence;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 365 * MS_PER_DAY);

        return await models.Gift.add({
            token: `reminder-test-token-${sequence}-${Date.now()}`,
            buyer_email: `gift-buyer-${sequence}@example.com`,
            buyer_member_id: null,
            redeemer_member_id: redeemerId,
            tier_id: paidTier.id,
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripe_checkout_session_id: `cs_reminder_${sequence}_${Date.now()}`,
            stripe_payment_intent_id: `pi_reminder_${sequence}_${Date.now()}`,
            consumes_at: consumesAt,
            expires_at: expiresAt,
            status: 'redeemed',
            purchased_at: now,
            redeemed_at: now,
            consumed_at: null,
            expired_at: null,
            refunded_at: null,
            consumes_soon_reminder_sent_at: consumesSoonReminderSentAt,
            ...overrides
        });
    }

    it('sends a reminder email for gifts with consumes_at in (now+3d, now+7d] and records the reminder', async function () {
        const now = new Date();
        const inWindow = new Date(now.getTime() + 5 * MS_PER_DAY);
        const gift = await createRedeemedGift({consumesAt: inWindow});

        const result = await giftService.service.processReminders();

        assert.equal(result.remindedCount, 1);
        assert.equal(result.skippedCount, 0);
        assert.equal(result.failedCount, 0);

        emailMockReceiver.assertSentEmailCount(1);

        const sent = emailMockReceiver.getSentEmail(0);

        assert.equal(sent.to, redeemerMember.get('email'));
        assert.match(sent.subject, /ending soon/);

        const reloaded = await models.Gift.findOne({token: gift.get('token')}, {require: true});

        assert.ok(reloaded.get('consumes_soon_reminder_sent_at'), 'Gift should be marked as reminded');
    });

    it('does not send a reminder for gifts that consume too soon (inside the floor)', async function () {
        const now = new Date();
        const tooSoon = new Date(now.getTime() + 2 * MS_PER_DAY);
        const gift = await createRedeemedGift({consumesAt: tooSoon});

        const result = await giftService.service.processReminders();

        assert.equal(result.remindedCount, 0);
        assert.equal(result.skippedCount, 0);
        assert.equal(result.failedCount, 0);

        emailMockReceiver.assertSentEmailCount(0);

        const reloaded = await models.Gift.findOne({token: gift.get('token')}, {require: true});

        assert.equal(reloaded.get('consumes_soon_reminder_sent_at'), null);
    });

    it('does not send a reminder for gifts that consume too far in the future', async function () {
        const now = new Date();
        const tooFar = new Date(now.getTime() + 30 * MS_PER_DAY);
        const gift = await createRedeemedGift({consumesAt: tooFar});

        const result = await giftService.service.processReminders();

        assert.equal(result.remindedCount, 0);
        assert.equal(result.skippedCount, 0);
        assert.equal(result.failedCount, 0);

        emailMockReceiver.assertSentEmailCount(0);

        const reloaded = await models.Gift.findOne({token: gift.get('token')}, {require: true});

        assert.equal(reloaded.get('consumes_soon_reminder_sent_at'), null);
    });

    it('does not re-send a reminder for gifts that have already been reminded', async function () {
        const now = new Date();
        const inWindow = new Date(now.getTime() + 5 * MS_PER_DAY);
        const alreadyStamped = new Date(now.getTime() - MS_PER_DAY);

        await createRedeemedGift({consumesAt: inWindow, consumesSoonReminderSentAt: alreadyStamped});

        const result = await giftService.service.processReminders();

        // findPendingReminder's NQL filter excludes gifts that have already been
        // reminded, so the gift never enters the per-gift loop — counts stay at
        // zero.
        assert.equal(result.remindedCount, 0);
        assert.equal(result.skippedCount, 0);
        assert.equal(result.failedCount, 0);
        emailMockReceiver.assertSentEmailCount(0);
    });

    it('marks the gift as reminded but does not email when the redeemer has email_disabled', async function () {
        await models.Member.edit({email_disabled: true}, {id: redeemerMember.id});

        const now = new Date();
        const inWindow = new Date(now.getTime() + 5 * MS_PER_DAY);
        const gift = await createRedeemedGift({consumesAt: inWindow});

        const result = await giftService.service.processReminders();

        assert.equal(result.remindedCount, 0);
        assert.equal(result.skippedCount, 1);
        assert.equal(result.failedCount, 0);
        emailMockReceiver.assertSentEmailCount(0);

        const reloaded = await models.Gift.findOne({token: gift.get('token')}, {require: true});

        assert.ok(reloaded.get('consumes_soon_reminder_sent_at'), 'Gift should still be marked as reminded to prevent retries');
    });

    it('only sends one email across consecutive runs', async function () {
        const now = new Date();
        const inWindow = new Date(now.getTime() + 5 * MS_PER_DAY);

        await createRedeemedGift({consumesAt: inWindow});

        await giftService.service.processReminders();
        await giftService.service.processReminders();

        emailMockReceiver.assertSentEmailCount(1);
    });
});
