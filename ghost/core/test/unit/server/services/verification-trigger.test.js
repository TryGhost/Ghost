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
    const thirtyDayFilterPattern = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
    const defaultVerificationProcess = {
        amount: 10,
        threshold: 5,
        method: 'import',
        throwOnTrigger: false
    };

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

    const assertSignupEventsQuery = (eventRepository, source, call = 'firstCall') => {
        const signupEventsCall = eventRepository.getSignupEvents[call];

        assert('source' in signupEventsCall.lastArg);
        assert.equal(signupEventsCall.lastArg.source, source);
        assert('created_at' in signupEventsCall.lastArg);
        assert('$gt' in signupEventsCall.lastArg.created_at);
        assert.match(signupEventsCall.lastArg.created_at.$gt, thirtyDayFilterPattern);
    };

    const assertVerificationProcessDidNotTrigger = ({
        triggerOptions = {},
        processOptions = defaultVerificationProcess,
        preserveDefaultWebhook = false
    } = {}) => {
        const sendVerificationWebhook = preserveDefaultWebhook ? undefined : (triggerOptions.sendVerificationWebhook ?? sinon.stub().resolves(true));
        const settingsEdit = sinon.stub().resolves(null);
        const trigger = createTrigger({
            ...triggerOptions,
            ...(sendVerificationWebhook ? {sendVerificationWebhook} : {}),
            settingsEdit
        });

        return trigger._startVerificationProcess(processOptions).then((result) => {
            assert.equal(result.needsVerification, false);

            return {
                sendVerificationWebhook,
                settingsEdit
            };
        });
    };

    const dispatchMemberCreatedEvent = (source) => {
        DomainEvents.dispatch(MemberCreatedEvent.create({
            memberId: 'hello!',
            source
        }, new Date()));
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

    [{
        name: 'already verified',
        triggerOptions: {
            isVerified: () => true
        },
        processOptions: {
            amount: 10,
            throwOnTrigger: false
        }
    }, {
        name: 'already in progress',
        triggerOptions: {
            isVerificationRequired: () => true
        },
        processOptions: {
            amount: 10,
            throwOnTrigger: false
        }
    }].forEach(({name, triggerOptions, processOptions}) => {
        it(`Does not trigger verification when ${name}`, async function () {
            const {sendVerificationWebhook, settingsEdit} = await assertVerificationProcessDidNotTrigger({
                triggerOptions,
                processOptions
            });

            sinon.assert.notCalled(sendVerificationWebhook);
            sinon.assert.notCalled(settingsEdit);
        });
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

    [{
        name: 'the webhook is unavailable',
        preserveDefaultWebhook: true
    }, {
        name: 'the webhook is unconfigured',
        sendVerificationWebhook: () => sinon.stub().resolves(false),
        processOptions: defaultVerificationProcess,
        expectedWebhookCalls: 1
    }, {
        name: 'webhook delivery fails',
        sendVerificationWebhook: () => sinon.stub().rejects(new Error('Webhook failed')),
        processOptions: defaultVerificationProcess,
        expectedWebhookCalls: 1
    }].forEach(({name, sendVerificationWebhook: buildWebhook, processOptions, expectedWebhookCalls, preserveDefaultWebhook}) => {
        it(`Does not mark verification required when ${name}`, async function () {
            const {sendVerificationWebhook, settingsEdit} = await assertVerificationProcessDidNotTrigger({
                triggerOptions: buildWebhook ? {
                    sendVerificationWebhook: buildWebhook()
                } : {},
                processOptions: processOptions ?? {
                    amount: 10,
                    throwOnTrigger: false
                },
                preserveDefaultWebhook
            });

            if (typeof expectedWebhookCalls === 'number') {
                assert.equal(sendVerificationWebhook.callCount, expectedWebhookCalls);
            }
            sinon.assert.notCalled(settingsEdit);
        });
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

        dispatchMemberCreatedEvent('api');

        sinon.assert.calledOnce(eventRepository.getSignupEvents);
        assertSignupEventsQuery(eventRepository, 'api', 'lastCall');
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

        dispatchMemberCreatedEvent('api');

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
        assertSignupEventsQuery(eventRepository, 'import');
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

    [{
        name: 'Admin',
        source: 'admin',
        triggerOptions: {
            adminThreshold: 2
        }
    }, {
        name: 'API',
        source: 'api',
        triggerOptions: {
            adminThreshold: 2,
            apiThreshold: 2
        }
    }].forEach(({name, source, triggerOptions}) => {
        it(`Triggers when a number of members are added from ${name}`, async function () {
            const sendVerificationWebhook = sinon.stub().resolves(true);
            const eventRepository = buildEventRepository(0, 10);
            const trigger = createTrigger({
                ...triggerOptions,
                sendVerificationWebhook,
                eventRepository
            });

            await trigger._handleMemberCreatedEvent({
                data: {
                    source
                }
            });

            sinon.assert.calledTwice(eventRepository.getSignupEvents);
            assertSignupEventsQuery(eventRepository, source);
            assert.deepEqual(sendVerificationWebhook.lastCall.firstArg, {
                amountTriggered: 10,
                threshold: 2,
                method: source
            });
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
