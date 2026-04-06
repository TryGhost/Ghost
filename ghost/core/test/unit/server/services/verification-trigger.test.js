const sinon = require('sinon');
const assert = require('node:assert/strict');
const DomainEvents = require('@tryghost/domain-events');

const VerificationTrigger = require('../../../../core/server/services/verification-trigger');
const {MemberCreatedEvent} = require('../../../../core/shared/events');

const createEventsPage = ({total, limit = total, dataLength = total}) => {
    return {
        data: Array.from({length: dataLength}, () => ({})),
        meta: {
            pagination: {
                total,
                limit
            }
        }
    };
};

const createEventRepositoryStub = ({memberTotal = 0, sourceTotal = 0, sourceLimit = sourceTotal, sourceDataLength = sourceTotal} = {}) => {
    return sinon.stub().callsFake(async (_unused, {source}) => {
        if (source === 'member') {
            return createEventsPage({total: memberTotal});
        }

        return createEventsPage({
            total: sourceTotal,
            limit: sourceLimit,
            dataLength: sourceDataLength
        });
    });
};

const assertRecentSourceQuery = (call, source) => {
    assert('source' in call.lastArg);
    assert.equal(call.lastArg.source, source);
    assert('created_at' in call.lastArg);
    assert('$gt' in call.lastArg.created_at);
    assert.match(call.lastArg.created_at.$gt, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
};

/**
 * @typedef {object} CreateVerificationTriggerOptions
 * @property {() => number} [getApiTriggerThreshold]
 * @property {() => number} [getAdminTriggerThreshold]
 * @property {() => number} [getImportTriggerThreshold]
 * @property {boolean | (() => boolean)} [isVerified]
 * @property {boolean | (() => boolean)} [isVerificationRequired]
 * @property {import('sinon').SinonStub} [webhookStub]
 * @property {import('sinon').SinonStub} [settingsStub]
 * @property {import('sinon').SinonStub} [setVerificationRequired]
 * @property {import('sinon').SinonStub} [eventStub]
 */

/**
 * @typedef {object} CreateVerificationTriggerResult
 * @property {VerificationTrigger} trigger
 * @property {import('sinon').SinonStub} webhookStub
 * @property {import('sinon').SinonStub} settingsStub
 * @property {import('sinon').SinonStub} setVerificationRequired
 * @property {import('sinon').SinonStub} eventStub
 */

/**
 * @param {CreateVerificationTriggerOptions} [options={}]
 * @returns {CreateVerificationTriggerResult}
 */
const createVerificationTrigger = ({
    getApiTriggerThreshold,
    getAdminTriggerThreshold,
    getImportTriggerThreshold,
    isVerified = false,
    isVerificationRequired = false,
    webhookStub = sinon.stub().resolves(true),
    settingsStub = sinon.stub().resolves(null),
    setVerificationRequired = sinon.stub(),
    eventStub = sinon.stub()
} = {}) => {
    const trigger = new VerificationTrigger({
        getApiTriggerThreshold,
        getAdminTriggerThreshold,
        getImportTriggerThreshold,
        isVerified: typeof isVerified === 'function' ? isVerified : () => isVerified,
        isVerificationRequired: typeof isVerificationRequired === 'function' ? isVerificationRequired : () => isVerificationRequired,
        setVerificationRequired,
        sendVerificationWebhook: webhookStub,
        Settings: {
            edit: settingsStub
        },
        eventRepository: {
            getSignupEvents: eventStub
        }
    });

    return {
        trigger,
        webhookStub,
        settingsStub,
        setVerificationRequired,
        eventStub
    };
};

const createMemberCreatedEvent = source => MemberCreatedEvent.create({
    memberId: 'member-id',
    source,
    batchId: 'batch-id'
}, new Date());

describe('Import threshold', function () {
    beforeEach(function () {
        sinon.stub(DomainEvents, 'subscribe');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Creates a threshold based on config', async function () {
        const {trigger} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            eventStub: createEventRepositoryStub({memberTotal: 1}),
            isVerified: false
        });

        const result = await trigger.getImportThreshold();

        assert.equal(result, 2);
    });

    it('Increases the import threshold to the number of members', async function () {
        const {trigger} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            eventStub: createEventRepositoryStub({memberTotal: 3}),
            isVerified: false
        });

        const result = await trigger.getImportThreshold();

        assert.equal(result, 3);
    });

    it('Does not check members count when config threshold is infinite', async function () {
        const eventStub = sinon.stub();
        const {trigger} = createVerificationTrigger({
            getImportTriggerThreshold: () => Infinity,
            eventStub,
            isVerified: false
        });

        const result = await trigger.getImportThreshold();

        assert.equal(result, Infinity);
        sinon.assert.notCalled(eventStub);
    });
});

describe('Email verification flow', function () {
    let domainEventsStub;

    beforeEach(function () {
        domainEventsStub = sinon.stub(DomainEvents, 'subscribe');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Triggers verification process', async function () {
        const {trigger, webhookStub, settingsStub} = createVerificationTrigger();

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, true);
        sinon.assert.calledOnce(webhookStub);
        sinon.assert.calledOnce(settingsStub);
    });

    it('Does not trigger verification when already verified', async function () {
        const {trigger, webhookStub, settingsStub} = createVerificationTrigger({
            isVerified: true
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, false);
        sinon.assert.notCalled(webhookStub);
        sinon.assert.notCalled(settingsStub);
    });

    it('Does not trigger verification when already in progress', async function () {
        const {trigger, webhookStub, settingsStub} = createVerificationTrigger({
            isVerificationRequired: true
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, false);
        sinon.assert.notCalled(webhookStub);
        sinon.assert.notCalled(settingsStub);
    });

    it('Throws a verification error when the request should be blocked', async function () {
        const {trigger} = createVerificationTrigger();

        await assert.rejects(
            trigger._startVerificationProcess({
                amount: 10,
                throwOnTrigger: true
            })
        );
    });

    it('Uses the standard verification error message when blocking the request', async function () {
        const {trigger} = createVerificationTrigger();

        try {
            await trigger._startVerificationProcess({
                amount: 10,
                throwOnTrigger: true
            });
            assert.fail('Should have thrown');
        } catch (error) {
            assert.match(error.message, /We're hard at work processing your import/);
            assert.equal(error.code, 'EMAIL_VERIFICATION_NEEDED');
        }
    });

    it('Assumes the import threshold and method when they are not provided', async function () {
        const {trigger, webhookStub} = createVerificationTrigger();

        await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.deepEqual(webhookStub.lastCall.firstArg, {
            amountTriggered: 10,
            threshold: 10,
            method: 'import'
        });
    });

    it('Does not mark verification as required when the webhook is not sent', async function () {
        const {trigger, webhookStub, settingsStub} = createVerificationTrigger({
            webhookStub: sinon.stub().resolves(false)
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, false);
        sinon.assert.calledOnce(webhookStub);
        sinon.assert.notCalled(settingsStub);
    });

    it('Does not mark verification as required when the webhook throws', async function () {
        const {trigger, webhookStub, settingsStub} = createVerificationTrigger({
            webhookStub: sinon.stub().rejects(new Error('Webhook failed'))
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, false);
        sinon.assert.calledOnce(webhookStub);
        sinon.assert.notCalled(settingsStub);
    });

    it('Updates the settings key when verification is marked as required', async function () {
        const {trigger, settingsStub, setVerificationRequired} = createVerificationTrigger();

        await trigger._markVerificationRequired();

        sinon.assert.calledOnceWithExactly(settingsStub, [{
            key: 'email_verification_required',
            value: true
        }], {
            context: {
                internal: true
            }
        });
        sinon.assert.calledOnceWithExactly(setVerificationRequired, true);
    });

    it('Queries recent API signup events when an API member is created', async function () {
        domainEventsStub.restore();

        const {eventStub, webhookStub} = createVerificationTrigger({
            getApiTriggerThreshold: () => 2,
            isVerified: false,
            eventStub: createEventRepositoryStub({
                memberTotal: 15,
                sourceTotal: 10
            })
        });

        DomainEvents.dispatch(MemberCreatedEvent.create({
            memberId: 'hello!',
            source: 'api',
            batchId: 'batch-id'
        }, new Date()));
        await DomainEvents.allSettled();

        sinon.assert.calledTwice(eventStub);
        assertRecentSourceQuery(eventStub.firstCall, 'api');
        assert.equal(eventStub.secondCall.lastArg.source, 'member');
        sinon.assert.notCalled(webhookStub);
    });

    it('Does not trigger when site is already verified', async function () {
        domainEventsStub.restore();

        const {eventStub} = createVerificationTrigger({
            getApiTriggerThreshold: () => 2,
            isVerified: true
        });

        DomainEvents.dispatch(MemberCreatedEvent.create({
            memberId: 'hello!',
            source: 'api',
            batchId: 'batch-id'
        }, new Date()));
        await DomainEvents.allSettled();

        sinon.assert.notCalled(eventStub);
    });

    it('Queries recent import and member counts when checking the import threshold', async function () {
        const {trigger, eventStub} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            eventStub: createEventRepositoryStub({
                memberTotal: 15,
                sourceTotal: 10
            })
        });

        await trigger.testImportThreshold();

        sinon.assert.calledTwice(eventStub);
        assertRecentSourceQuery(eventStub.firstCall, 'import');
        assert.equal(eventStub.secondCall.lastArg.source, 'member');
    });

    it('Triggers webhook with the calculated import threshold payload when import threshold is exceeded', async function () {
        const {trigger, webhookStub} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            eventStub: createEventRepositoryStub({
                memberTotal: 15,
                sourceTotal: 10
            })
        });

        await trigger.testImportThreshold();

        sinon.assert.calledOnce(webhookStub);
        assert.deepEqual(webhookStub.lastCall.firstArg, {
            amountTriggered: 10,
            threshold: 5,
            method: 'import'
        });
    });

    it('Does not trigger webhook when import count equals the calculated threshold', async function () {
        const {trigger, webhookStub} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            eventStub: createEventRepositoryStub({
                memberTotal: 15,
                sourceTotal: 5
            })
        });

        await trigger.testImportThreshold();

        sinon.assert.notCalled(webhookStub);
    });

    it('Checks pending imports before deciding whether verification is required', async function () {
        const {trigger} = createVerificationTrigger();
        const testImportThresholdStub = sinon.stub(trigger, 'testImportThreshold').resolves();

        await trigger.checkVerificationRequired();

        sinon.assert.calledOnce(testImportThresholdStub);
    });

    it('Returns true when verification is required for an unverified site', async function () {
        const {trigger} = createVerificationTrigger({
            isVerificationRequired: true,
            isVerified: false
        });
        sinon.stub(trigger, 'testImportThreshold').resolves();

        assert.equal(await trigger.checkVerificationRequired(), true);
    });

    it('Skips import threshold checks when the site is already verified', async function () {
        const {trigger} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            isVerified: true
        });

        assert.equal(await trigger.testImportThreshold(), undefined);
    });

    it('Skips import threshold checks when verification is already required', async function () {
        const {trigger} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            isVerified: false,
            isVerificationRequired: true
        });

        assert.equal(await trigger.testImportThreshold(), undefined);
    });

    it('Triggers when a number of members are added from Admin', async function () {
        const {trigger, eventStub, webhookStub} = createVerificationTrigger({
            getAdminTriggerThreshold: () => 2,
            eventStub: createEventRepositoryStub({
                memberTotal: 0,
                sourceTotal: 10
            })
        });

        await trigger._handleMemberCreatedEvent(createMemberCreatedEvent('admin'));

        sinon.assert.calledTwice(eventStub);
        assertRecentSourceQuery(eventStub.firstCall, 'admin');
        sinon.assert.calledOnce(webhookStub);
        assert.deepEqual(webhookStub.lastCall.firstArg, {
            amountTriggered: 10,
            threshold: 2,
            method: 'admin'
        });
    });

    it('Triggers when a number of members are added from API', async function () {
        const {trigger, eventStub, webhookStub} = createVerificationTrigger({
            getAdminTriggerThreshold: () => 2,
            getApiTriggerThreshold: () => 2,
            eventStub: createEventRepositoryStub({
                memberTotal: 0,
                sourceTotal: 10
            })
        });

        await trigger._handleMemberCreatedEvent(createMemberCreatedEvent('api'));

        sinon.assert.calledTwice(eventStub);
        assertRecentSourceQuery(eventStub.firstCall, 'api');
        sinon.assert.calledOnce(webhookStub);
        assert.deepEqual(webhookStub.lastCall.firstArg, {
            amountTriggered: 10,
            threshold: 2,
            method: 'api'
        });
    });

    it('Does not trigger webhook when API count equals the effective threshold', async function () {
        const {trigger, webhookStub} = createVerificationTrigger({
            getApiTriggerThreshold: () => 2,
            eventStub: createEventRepositoryStub({
                memberTotal: 0,
                sourceTotal: 2
            })
        });

        await trigger._handleMemberCreatedEvent(createMemberCreatedEvent('api'));

        sinon.assert.notCalled(webhookStub);
    });

    // TODO: Fix off-by-one issue in event dispatch: https://linear.app/ghost/issue/BER-3507/off-by-one-errors-in-event-query-pagination
    it('Counts the in-flight event when API/Admin pagination metadata is one behind', async function () {
        const {trigger, webhookStub} = createVerificationTrigger({
            getAdminTriggerThreshold: () => 9,
            eventStub: createEventRepositoryStub({
                memberTotal: 0,
                sourceTotal: 9,
                sourceLimit: 15,
                sourceDataLength: 10
            })
        });

        await trigger._handleMemberCreatedEvent(createMemberCreatedEvent('admin'));

        sinon.assert.calledOnce(webhookStub);
        assert.deepEqual(webhookStub.lastCall.firstArg, {
            amountTriggered: 10,
            threshold: 9,
            method: 'admin'
        });
    });

    it('Does not overcount when the source events query is already page-limited', async function () {
        const {trigger, webhookStub} = createVerificationTrigger({
            getAdminTriggerThreshold: () => 10,
            eventStub: createEventRepositoryStub({
                memberTotal: 0,
                sourceTotal: 10,
                sourceLimit: 10,
                sourceDataLength: 10
            })
        });

        await trigger._handleMemberCreatedEvent(createMemberCreatedEvent('admin'));

        sinon.assert.notCalled(webhookStub);
    });

    it('Does not fetch events and trigger when threshold is Infinity', async function () {
        const eventStub = sinon.stub();
        const {trigger, webhookStub} = createVerificationTrigger({
            getImportTriggerThreshold: () => Infinity,
            eventStub
        });

        await trigger.testImportThreshold();

        sinon.assert.notCalled(eventStub);
        sinon.assert.notCalled(webhookStub);
    });
});
