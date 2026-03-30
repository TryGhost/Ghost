// Switch these lines once there are useful utils
// const testUtils = require('./utils');
const sinon = require('sinon');
const assert = require('node:assert/strict');
const VerificationTrigger = require('../../../../core/server/services/verification-trigger');
const DomainEvents = require('@tryghost/domain-events');
const {MemberCreatedEvent} = require('../../../../core/shared/events');

describe('Import threshold', function () {
    beforeEach(function () {
        // Stub this method to prevent unnecessary subscriptions to domain events
        sinon.stub(DomainEvents, 'subscribe');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Creates a threshold based on config', async function () {
        const trigger = new VerificationTrigger({
            getImportTriggerThreshold: () => 2,
            eventRepository: {
                getSignupEvents: async () => ({
                    meta: {
                        pagination: {
                            total: 1
                        }
                    }
                })
            },
            isVerified: () => false
        });

        const result = await trigger.getImportThreshold();
        assert.equal(result, 2);
    });

    it('Increases the import threshold to the number of members', async function () {
        const trigger = new VerificationTrigger({
            getImportTriggerThreshold: () => 2,
            eventRepository: {
                getSignupEvents: async () => ({
                    meta: {
                        pagination: {
                            total: 3
                        }
                    }
                })
            },
            isVerified: () => false
        });

        const result = await trigger.getImportThreshold();
        assert.equal(result, 3);
    });

    it('Does not check members count when config threshold is infinite', async function () {
        const membersStub = sinon.stub().resolves(null);
        const trigger = new VerificationTrigger({
            getImportTriggerThreshold: () => Infinity,
            eventRepository: {
                getSignupEvents: membersStub
            },
            isVerified: () => false
        });

        const result = await trigger.getImportThreshold();
        assert.equal(result, Infinity);
        sinon.assert.notCalled(membersStub);
    });
});

describe('Email verification flow', function () {
    let domainEventsStub;

    const buildEventRepository = (memberTotal, sourceTotal) => {
        return {
            getSignupEvents: sinon.stub().callsFake(async (_unused, {source}) => ({
                meta: {
                    pagination: {
                        total: source === 'member' ? memberTotal : sourceTotal
                    }
                }
            }))
        };
    };

    const createTrigger = ({
        adminThreshold,
        apiThreshold,
        importThreshold,
        isVerified = () => false,
        isVerificationRequired = () => false,
        setVerificationRequired,
        sendVerificationWebhook,
        eventRepository,
        settingsEdit
    } = {}) => {
        return new VerificationTrigger({
            getAdminTriggerThreshold: () => adminThreshold,
            getApiTriggerThreshold: () => apiThreshold,
            getImportTriggerThreshold: () => importThreshold,
            isVerified,
            isVerificationRequired,
            setVerificationRequired,
            sendVerificationWebhook,
            Settings: {
                edit: settingsEdit || sinon.stub().resolves(null)
            },
            eventRepository
        });
    };

    beforeEach(function () {
        domainEventsStub = sinon.stub(DomainEvents, 'subscribe');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Triggers verification process through the webhook flow', async function () {
        const sendVerificationWebhook = sinon.stub().resolves(true);
        const settingsEdit = sinon.stub().resolves(null);
        const trigger = createTrigger({
            sendVerificationWebhook,
            settingsEdit
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            threshold: 5,
            method: 'import',
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, true);
        sinon.assert.calledOnce(sendVerificationWebhook);
        sinon.assert.calledOnce(settingsEdit);
        sinon.assert.callOrder(sendVerificationWebhook, settingsEdit);
        assert.deepEqual(sendVerificationWebhook.lastCall.firstArg, {
            amountTriggered: 10,
            threshold: 5,
            method: 'import'
        });
    });

    it('Does not trigger verification when already verified', async function () {
        const sendVerificationWebhook = sinon.stub().resolves(true);
        const settingsEdit = sinon.stub().resolves(null);
        const trigger = createTrigger({
            isVerified: () => true,
            sendVerificationWebhook,
            settingsEdit
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, false);
        sinon.assert.notCalled(sendVerificationWebhook);
        sinon.assert.notCalled(settingsEdit);
    });

    it('Does not trigger verification when already in progress', async function () {
        const sendVerificationWebhook = sinon.stub().resolves(true);
        const settingsEdit = sinon.stub().resolves(null);
        const trigger = createTrigger({
            isVerificationRequired: () => true,
            sendVerificationWebhook,
            settingsEdit
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, false);
        sinon.assert.notCalled(sendVerificationWebhook);
        sinon.assert.notCalled(settingsEdit);
    });

    it('Throws when `throwOnTrigger` is true', async function () {
        const sendVerificationWebhook = sinon.stub().resolves(true);
        const trigger = createTrigger({
            sendVerificationWebhook
        });

        await assert.rejects(
            trigger._startVerificationProcess({
                amount: 10,
                throwOnTrigger: true
            })
        );
    });

    it('Uses the default host limit message when throwing', async function () {
        const sendVerificationWebhook = sinon.stub().resolves(true);
        const trigger = createTrigger({
            sendVerificationWebhook
        });

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

    it('Does not mark verification required when the webhook is unavailable', async function () {
        const settingsEdit = sinon.stub().resolves(null);
        const trigger = createTrigger({
            settingsEdit
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, false);
        sinon.assert.notCalled(settingsEdit);
    });

    it('Does not mark verification required when the webhook is unconfigured', async function () {
        const sendVerificationWebhook = sinon.stub().resolves(false);
        const settingsEdit = sinon.stub().resolves(null);
        const trigger = createTrigger({
            sendVerificationWebhook,
            settingsEdit
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            threshold: 5,
            method: 'import',
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, false);
        sinon.assert.calledOnce(sendVerificationWebhook);
        sinon.assert.notCalled(settingsEdit);
    });

    it('Does not mark verification required when webhook delivery fails', async function () {
        const sendVerificationWebhook = sinon.stub().rejects(new Error('Webhook failed'));
        const settingsEdit = sinon.stub().resolves(null);
        const trigger = createTrigger({
            sendVerificationWebhook,
            settingsEdit
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            threshold: 5,
            method: 'import',
            throwOnTrigger: false
        });

        assert.equal(result.needsVerification, false);
        sinon.assert.calledOnce(sendVerificationWebhook);
        sinon.assert.notCalled(settingsEdit);
    });

    it('Triggers when a number of API events are dispatched', async function () {
        domainEventsStub.restore();
        const sendVerificationWebhook = sinon.stub().resolves(true);
        const eventRepository = buildEventRepository(15, 10);

        new VerificationTrigger({
            getApiTriggerThreshold: () => 2,
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationWebhook,
            Settings: {
                edit: sinon.stub().resolves(null)
            },
            eventRepository
        });

        DomainEvents.dispatch(MemberCreatedEvent.create({
            memberId: 'hello!',
            source: 'api'
        }, new Date()));

        sinon.assert.calledOnce(eventRepository.getSignupEvents);
        assert('source' in eventRepository.getSignupEvents.lastCall.lastArg);
        assert.equal(eventRepository.getSignupEvents.lastCall.lastArg.source, 'api');
        assert('created_at' in eventRepository.getSignupEvents.lastCall.lastArg);
        assert('$gt' in eventRepository.getSignupEvents.lastCall.lastArg.created_at);
        assert.match(eventRepository.getSignupEvents.lastCall.lastArg.created_at.$gt, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it('Does not trigger when site is already verified', async function () {
        domainEventsStub.restore();
        const eventRepository = {
            getSignupEvents: sinon.stub()
        };

        new VerificationTrigger({
            getApiTriggerThreshold: () => 2,
            isVerified: () => true,
            isVerificationRequired: () => false,
            sendVerificationWebhook: sinon.stub().resolves(true),
            Settings: {
                edit: sinon.stub().resolves(null)
            },
            eventRepository
        });

        DomainEvents.dispatch(MemberCreatedEvent.create({
            memberId: 'hello!',
            source: 'api'
        }, new Date()));

        sinon.assert.notCalled(eventRepository.getSignupEvents);
    });

    it('Includes threshold and method in webhook payload when import threshold triggers', async function () {
        const sendVerificationWebhook = sinon.stub().resolves(true);
        const eventRepository = buildEventRepository(15, 10);
        const trigger = createTrigger({
            importThreshold: 2,
            sendVerificationWebhook,
            eventRepository
        });

        await trigger.testImportThreshold();

        sinon.assert.calledTwice(eventRepository.getSignupEvents);
        assert('source' in eventRepository.getSignupEvents.firstCall.lastArg);
        assert.equal(eventRepository.getSignupEvents.firstCall.lastArg.source, 'import');
        assert('created_at' in eventRepository.getSignupEvents.firstCall.lastArg);
        assert('$gt' in eventRepository.getSignupEvents.firstCall.lastArg.created_at);
        assert.match(eventRepository.getSignupEvents.firstCall.lastArg.created_at.$gt, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
        assert.deepEqual(sendVerificationWebhook.lastCall.firstArg, {
            amountTriggered: 10,
            threshold: 5,
            method: 'import'
        });
    });

    it('checkVerificationRequired also checks import', async function () {
        let verificationRequired = false;
        const sendVerificationWebhook = sinon.stub().resolves(true);
        const eventRepository = buildEventRepository(15, 10);
        const trigger = createTrigger({
            importThreshold: 2,
            isVerificationRequired: () => verificationRequired,
            setVerificationRequired: (value) => {
                verificationRequired = value;
            },
            settingsEdit: sinon.stub().callsFake(() => {
                verificationRequired = true;
                return Promise.resolve();
            }),
            sendVerificationWebhook,
            eventRepository
        });

        assert.equal(await trigger.checkVerificationRequired(), true);
        sinon.assert.calledOnce(sendVerificationWebhook);
    });

    it('testImportThreshold does not calculate anything if already verified', async function () {
        const trigger = createTrigger({
            importThreshold: 2,
            isVerified: () => true
        });

        assert.equal(await trigger.testImportThreshold(), undefined);
    });

    it('testImportThreshold does not calculate anything if already pending', async function () {
        const trigger = createTrigger({
            importThreshold: 2,
            isVerificationRequired: () => true
        });

        assert.equal(await trigger.testImportThreshold(), undefined);
    });

    it('Triggers when a number of members are added from Admin', async function () {
        const sendVerificationWebhook = sinon.stub().resolves(true);
        const eventRepository = buildEventRepository(0, 10);
        const trigger = createTrigger({
            adminThreshold: 2,
            sendVerificationWebhook,
            eventRepository
        });

        await trigger._handleMemberCreatedEvent({
            data: {
                source: 'admin'
            }
        });

        sinon.assert.calledTwice(eventRepository.getSignupEvents);
        assert('source' in eventRepository.getSignupEvents.firstCall.lastArg);
        assert.equal(eventRepository.getSignupEvents.firstCall.lastArg.source, 'admin');
        assert.deepEqual(sendVerificationWebhook.lastCall.firstArg, {
            amountTriggered: 10,
            threshold: 2,
            method: 'admin'
        });
    });

    it('Triggers when a number of members are added from API', async function () {
        const sendVerificationWebhook = sinon.stub().resolves(true);
        const eventRepository = buildEventRepository(0, 10);
        const trigger = createTrigger({
            adminThreshold: 2,
            apiThreshold: 2,
            sendVerificationWebhook,
            eventRepository
        });

        await trigger._handleMemberCreatedEvent({
            data: {
                source: 'api'
            }
        });

        sinon.assert.calledTwice(eventRepository.getSignupEvents);
        assert('source' in eventRepository.getSignupEvents.firstCall.lastArg);
        assert.equal(eventRepository.getSignupEvents.firstCall.lastArg.source, 'api');
        assert.deepEqual(sendVerificationWebhook.lastCall.firstArg, {
            amountTriggered: 10,
            threshold: 2,
            method: 'api'
        });
    });

    it('Does not fetch events or trigger when threshold is Infinity', async function () {
        const sendVerificationWebhook = sinon.stub().resolves(true);
        const eventRepository = buildEventRepository(15, 10);
        const trigger = createTrigger({
            importThreshold: Infinity,
            sendVerificationWebhook,
            eventRepository
        });

        await trigger.testImportThreshold();

        sinon.assert.notCalled(eventRepository.getSignupEvents);
        sinon.assert.notCalled(sendVerificationWebhook);
    });
});
