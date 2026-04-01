const sinon = require('sinon');
const assert = require('node:assert/strict');
const DomainEvents = require('@tryghost/domain-events');

const VerificationTrigger = require('../../../../core/server/services/verification-trigger');
const {MemberCreatedEvent} = require('../../../../core/shared/events');

const EMAIL_SUBJECT = 'Email needs verification';
const IMPORT_MESSAGE = 'Email verification needed for site: {siteUrl}, has imported: {amountTriggered} members in the last 30 days.';
const ADMIN_MESSAGE = 'Email verification needed for site: {siteUrl} has added: {amountTriggered} members through the Admin client in the last 30 days.';
const API_MESSAGE = 'Email verification needed for site: {siteUrl} has added: {amountTriggered} members through the API in the last 30 days.';

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
 * @property {boolean | (() => boolean)} [isVerificationFlowEnabled]
 * @property {import('sinon').SinonStub} [emailStub]
 * @property {import('sinon').SinonStub} [webhookStub]
 * @property {import('sinon').SinonStub} [settingsStub]
 * @property {import('sinon').SinonStub} [setVerificationRequired]
 * @property {import('sinon').SinonStub} [eventStub]
 */

/**
 * @typedef {object} CreateVerificationTriggerResult
 * @property {VerificationTrigger} trigger
 * @property {import('sinon').SinonStub} emailStub
 * @property {import('sinon').SinonStub | undefined} webhookStub
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
    isVerificationFlowEnabled = false,
    emailStub = sinon.stub().resolves(null),
    webhookStub,
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
        isVerificationFlowEnabled: typeof isVerificationFlowEnabled === 'function' ? isVerificationFlowEnabled : () => isVerificationFlowEnabled,
        sendVerificationEmail: emailStub,
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
        emailStub,
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
        const {trigger, emailStub, settingsStub} = createVerificationTrigger();

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, true);
        sinon.assert.calledOnce(emailStub);
        sinon.assert.calledOnce(settingsStub);
    });

    it('Does not trigger verification when already verified', async function () {
        const {trigger, emailStub, settingsStub} = createVerificationTrigger({
            isVerified: true
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, false);
        sinon.assert.notCalled(emailStub);
        sinon.assert.notCalled(settingsStub);
    });

    it('Does not trigger verification when already in progress', async function () {
        const {trigger, emailStub, settingsStub} = createVerificationTrigger({
            isVerificationRequired: true
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, false);
        sinon.assert.notCalled(emailStub);
        sinon.assert.notCalled(settingsStub);
    });

    it('Throws when `throwsOnTrigger` is true', async function () {
        const {trigger} = createVerificationTrigger();

        await assert.rejects(
            trigger._startVerificationProcess({
                amount: 10,
                throwOnTrigger: true
            })
        );
    });

    it('Uses default message when no custom message is provided', async function () {
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

    it('Sends a message containing the number of members imported', async function () {
        const {trigger, emailStub} = createVerificationTrigger();

        await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.deepEqual(emailStub.lastCall.firstArg, {
            subject: EMAIL_SUBJECT,
            message: IMPORT_MESSAGE,
            amountTriggered: 10
        });
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

    it('Sends a webhook instead of an email when verificationFlow is enabled', async function () {
        const webhookStub = sinon.stub().resolves(true);
        const {trigger, emailStub, settingsStub} = createVerificationTrigger({
            isVerificationFlowEnabled: true,
            webhookStub
        });

        await trigger._startVerificationProcess({
            amount: 10,
            threshold: 5,
            method: 'import',
            throwOnTrigger: false
        });

        sinon.assert.notCalled(emailStub);
        sinon.assert.calledOnce(webhookStub);
        sinon.assert.calledOnce(settingsStub);
        sinon.assert.callOrder(webhookStub, settingsStub);
        assert.deepEqual(webhookStub.lastCall.firstArg, {
            amountTriggered: 10,
            threshold: 5,
            method: 'import'
        });
    });

    it('Falls back to email when verificationFlow is enabled but webhook is unconfigured', async function () {
        const webhookStub = sinon.stub().resolves(false);
        const {trigger, emailStub, settingsStub} = createVerificationTrigger({
            isVerificationFlowEnabled: true,
            webhookStub
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            threshold: 5,
            method: 'import',
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, true);
        sinon.assert.calledOnce(webhookStub);
        sinon.assert.calledOnce(emailStub);
        sinon.assert.calledOnce(settingsStub);
        sinon.assert.callOrder(webhookStub, settingsStub, emailStub);
    });

    it('Falls back to email when webhook delivery fails', async function () {
        const webhookStub = sinon.stub().rejects(new Error('Webhook failed'));
        const {trigger, emailStub, settingsStub} = createVerificationTrigger({
            isVerificationFlowEnabled: true,
            webhookStub
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            threshold: 5,
            method: 'import',
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, true);
        sinon.assert.calledOnce(webhookStub);
        sinon.assert.calledOnce(settingsStub);
        sinon.assert.calledOnce(emailStub);
        sinon.assert.callOrder(webhookStub, settingsStub, emailStub);
    });

    it('Triggers when a number of API events are dispatched', async function () {
        domainEventsStub.restore();

        const {eventStub} = createVerificationTrigger({
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

        sinon.assert.calledOnce(eventStub);
        assertRecentSourceQuery(eventStub.firstCall, 'api');
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

        sinon.assert.notCalled(eventStub);
    });

    it('Triggers when a number of members are imported', async function () {
        const {trigger, eventStub, emailStub} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            eventStub: createEventRepositoryStub({
                memberTotal: 15,
                sourceTotal: 10
            })
        });

        await trigger.testImportThreshold();

        sinon.assert.calledTwice(eventStub);
        assertRecentSourceQuery(eventStub.firstCall, 'import');
        sinon.assert.calledOnce(emailStub);
        assert.deepEqual(emailStub.lastCall.firstArg, {
            subject: EMAIL_SUBJECT,
            message: IMPORT_MESSAGE,
            amountTriggered: 10
        });
    });

    it('Includes threshold and method in webhook payload when import threshold triggers', async function () {
        const webhookStub = sinon.stub().resolves(true);
        const {trigger, emailStub} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            isVerificationFlowEnabled: true,
            webhookStub,
            eventStub: createEventRepositoryStub({
                memberTotal: 15,
                sourceTotal: 10
            })
        });

        await trigger.testImportThreshold();

        sinon.assert.notCalled(emailStub);
        sinon.assert.calledOnce(webhookStub);
        assert.deepEqual(webhookStub.lastCall.firstArg, {
            amountTriggered: 10,
            threshold: 5,
            method: 'import'
        });
    });

    it('checkVerificationRequired also checks import', async function () {
        let verificationRequired = false;
        const isVerificationRequiredStub = sinon.stub().callsFake(() => verificationRequired);
        const settingsStub = sinon.stub().callsFake(() => {
            verificationRequired = true;
            return Promise.resolve();
        });
        const {trigger, emailStub} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            isVerificationRequired: isVerificationRequiredStub,
            settingsStub,
            eventStub: createEventRepositoryStub({
                memberTotal: 15,
                sourceTotal: 10
            })
        });

        assert.equal(await trigger.checkVerificationRequired(), true);
        sinon.assert.calledOnce(emailStub);
    });

    it('testImportThreshold does not calculate anything if already verified', async function () {
        const {trigger} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            isVerified: true
        });

        assert.equal(await trigger.testImportThreshold(), undefined);
    });

    it('testImportThreshold does not calculate anything if already pending', async function () {
        const {trigger} = createVerificationTrigger({
            getImportTriggerThreshold: () => 2,
            isVerified: false,
            isVerificationRequired: true
        });

        assert.equal(await trigger.testImportThreshold(), undefined);
    });

    it('Triggers when a number of members are added from Admin', async function () {
        const {trigger, eventStub, emailStub} = createVerificationTrigger({
            getAdminTriggerThreshold: () => 2,
            eventStub: createEventRepositoryStub({
                memberTotal: 0,
                sourceTotal: 10
            })
        });

        await trigger._handleMemberCreatedEvent(createMemberCreatedEvent('admin'));

        sinon.assert.calledTwice(eventStub);
        assertRecentSourceQuery(eventStub.firstCall, 'admin');
        sinon.assert.calledOnce(emailStub);
        assert.deepEqual(emailStub.lastCall.firstArg, {
            subject: EMAIL_SUBJECT,
            message: ADMIN_MESSAGE,
            amountTriggered: 10
        });
    });

    it('Triggers when a number of members are added from API', async function () {
        const {trigger, eventStub, emailStub} = createVerificationTrigger({
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
        sinon.assert.calledOnce(emailStub);
        assert.deepEqual(emailStub.lastCall.firstArg, {
            subject: EMAIL_SUBJECT,
            message: API_MESSAGE,
            amountTriggered: 10
        });
    });

    // TODO: Fix off-by-one issue in event dispatch: https://linear.app/ghost/issue/BER-3507/off-by-one-errors-in-event-query-pagination
    it('Counts the in-flight event when API/Admin pagination metadata is one behind', async function () {
        const {trigger, emailStub} = createVerificationTrigger({
            getAdminTriggerThreshold: () => 9,
            eventStub: createEventRepositoryStub({
                memberTotal: 0,
                sourceTotal: 9,
                sourceLimit: 15,
                sourceDataLength: 10
            })
        });

        await trigger._handleMemberCreatedEvent(createMemberCreatedEvent('admin'));

        sinon.assert.calledOnce(emailStub);
        assert.deepEqual(emailStub.lastCall.firstArg, {
            subject: EMAIL_SUBJECT,
            message: ADMIN_MESSAGE,
            amountTriggered: 10
        });
    });

    it('Does not overcount when the source events query is already page-limited', async function () {
        const {trigger, emailStub} = createVerificationTrigger({
            getAdminTriggerThreshold: () => 10,
            eventStub: createEventRepositoryStub({
                memberTotal: 0,
                sourceTotal: 10,
                sourceLimit: 10,
                sourceDataLength: 10
            })
        });

        await trigger._handleMemberCreatedEvent(createMemberCreatedEvent('admin'));

        sinon.assert.notCalled(emailStub);
    });

    it('Does not fetch events and trigger when threshold is Infinity', async function () {
        const eventStub = sinon.stub();
        const {trigger, emailStub} = createVerificationTrigger({
            getImportTriggerThreshold: () => Infinity,
            eventStub
        });

        await trigger.testImportThreshold();

        sinon.assert.notCalled(eventStub);
        sinon.assert.notCalled(emailStub);
    });
});
