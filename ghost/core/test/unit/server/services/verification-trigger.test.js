// Switch these lines once there are useful utils
// const testUtils = require('./utils');
const sinon = require('sinon');
const assert = require('assert/strict');
require('should');
const VerificationTrigger = require('../../../../core/server/services/VerificationTrigger');
const DomainEvents = require('@tryghost/domain-events');
const {MemberCreatedEvent} = require('@tryghost/member-events');

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
            }
        });

        const result = await trigger.getImportThreshold();
        result.should.eql(2);
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
            }
        });

        const result = await trigger.getImportThreshold();
        result.should.eql(3);
    });

    it('Does not check members count when config threshold is infinite', async function () {
        const membersStub = sinon.stub().resolves(null);
        const trigger = new VerificationTrigger({
            getImportTriggerThreshold: () => Infinity,
            eventRepository: {
                getSignupEvents: membersStub
            }
        });

        const result = await trigger.getImportThreshold();
        result.should.eql(Infinity);
        membersStub.callCount.should.eql(0);
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
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const trigger = new VerificationTrigger({
            Settings: {
                edit: settingsStub
            },
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        result.needsVerification.should.eql(true);
        emailStub.callCount.should.eql(1);
        settingsStub.callCount.should.eql(1);
    });

    it('Does not trigger verification when already verified', async function () {
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const trigger = new VerificationTrigger({
            Settings: {
                edit: settingsStub
            },
            isVerified: () => true,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        result.needsVerification.should.eql(false);
        emailStub.callCount.should.eql(0);
        settingsStub.callCount.should.eql(0);
    });

    it('Does not trigger verification when already in progress', async function () {
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const trigger = new VerificationTrigger({
            Settings: {
                edit: settingsStub
            },
            isVerified: () => false,
            isVerificationRequired: () => true,
            sendVerificationEmail: emailStub
        });

        const result = await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        result.needsVerification.should.eql(false);
        emailStub.callCount.should.eql(0);
        settingsStub.callCount.should.eql(0);
    });

    it('Throws when `throwsOnTrigger` is true', async function () {
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const trigger = new VerificationTrigger({
            Settings: {
                edit: settingsStub
            },
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub
        });

        await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: true
        }).should.be.rejected();
    });

    it('Sends a message containing the number of members imported', async function () {
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const trigger = new VerificationTrigger({
            Settings: {
                edit: settingsStub
            },
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub
        });

        await trigger._startVerificationProcess({
            amount: 10,
            throwOnTrigger: false
        });

        emailStub.lastCall.firstArg.should.eql({
            subject: 'Email needs verification',
            message: 'Email verification needed for site: {siteUrl}, has imported: {amountTriggered} members in the last 30 days.',
            amountTriggered: 10
        });
    });

    it('Triggers when a number of API events are dispatched', async function () {
        // We need to use the real event repository here to test event handling
        domainEventsStub.restore();
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const eventStub = sinon.stub().callsFake(async (_unused, {source}) => {
            if (source === 'member') {
                return {
                    meta: {
                        pagination: {
                            total: 15
                        }
                    }
                };
            } else {
                return {
                    meta: {
                        pagination: {
                            total: 10
                        }
                    }
                };
            }
        });

        new VerificationTrigger({
            getApiTriggerThreshold: () => 2,
            Settings: {
                edit: settingsStub
            },
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub,
            eventRepository: {
                getSignupEvents: eventStub
            }
        });

        DomainEvents.dispatch(MemberCreatedEvent.create({
            memberId: 'hello!',
            source: 'api'
        }, new Date()));

        eventStub.callCount.should.eql(1);
        eventStub.lastCall.lastArg.should.have.property('source');
        eventStub.lastCall.lastArg.source.should.eql('api');
        eventStub.lastCall.lastArg.should.have.property('created_at');
        eventStub.lastCall.lastArg.created_at.should.have.property('$gt');
        eventStub.lastCall.lastArg.created_at.$gt.should.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it('Triggers when a number of members are imported', async function () {
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const eventStub = sinon.stub().callsFake(async (_unused, {source}) => {
            if (source === 'member') {
                return {
                    meta: {
                        pagination: {
                            total: 15
                        }
                    }
                };
            } else {
                return {
                    meta: {
                        pagination: {
                            total: 10
                        }
                    }
                };
            }
        });

        const trigger = new VerificationTrigger({
            getImportTriggerThreshold: () => 2,
            Settings: {
                edit: settingsStub
            },
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub,
            eventRepository: {
                getSignupEvents: eventStub
            }
        });

        await trigger.testImportThreshold();

        eventStub.callCount.should.eql(2);
        eventStub.firstCall.lastArg.should.have.property('source');
        eventStub.firstCall.lastArg.source.should.eql('import');
        eventStub.firstCall.lastArg.should.have.property('created_at');
        eventStub.firstCall.lastArg.created_at.should.have.property('$gt');
        eventStub.firstCall.lastArg.created_at.$gt.should.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);

        emailStub.callCount.should.eql(1);
        emailStub.lastCall.firstArg.should.eql({
            subject: 'Email needs verification',
            message: 'Email verification needed for site: {siteUrl}, has imported: {amountTriggered} members in the last 30 days.',
            amountTriggered: 10
        });
    });

    it('checkVerificationRequired also checks import', async function () {
        const emailStub = sinon.stub().resolves(null);
        let isVerificationRequired = false;
        const isVerificationRequiredStub = sinon.stub().callsFake(() => {
            return isVerificationRequired;
        });
        const settingsStub = sinon.stub().callsFake(() => {
            isVerificationRequired = true;
            return Promise.resolve();
        });
        const eventStub = sinon.stub().callsFake(async (_unused, {source}) => {
            if (source === 'member') {
                return {
                    meta: {
                        pagination: {
                            total: 15
                        }
                    }
                };
            } else {
                return {
                    meta: {
                        pagination: {
                            total: 10
                        }
                    }
                };
            }
        });

        const trigger = new VerificationTrigger({
            getImportTriggerThreshold: () => 2,
            Settings: {
                edit: settingsStub
            },
            isVerified: () => false,
            isVerificationRequired: isVerificationRequiredStub,
            sendVerificationEmail: emailStub,
            eventRepository: {
                getSignupEvents: eventStub
            }
        });

        assert.equal(await trigger.checkVerificationRequired(), true);
        sinon.assert.calledOnce(emailStub);
    });

    it('testImportThreshold does not calculate anything if already verified', async function () {
        const trigger = new VerificationTrigger({
            getImportTriggerThreshold: () => 2,
            isVerified: () => true
        });

        assert.equal(await trigger.testImportThreshold(), undefined);
    });

    it('testImportThreshold does not calculate anything if already pending', async function () {
        const trigger = new VerificationTrigger({
            getImportTriggerThreshold: () => 2,
            isVerified: () => false,
            isVerificationRequired: () => true
        });

        assert.equal(await trigger.testImportThreshold(), undefined);
    });

    it('Triggers when a number of members are added from Admin', async function () {
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const eventStub = sinon.stub().callsFake(async (_unused, {source}) => {
            if (source === 'member') {
                return {
                    meta: {
                        pagination: {
                            total: 0
                        }
                    }
                };
            } else {
                return {
                    meta: {
                        pagination: {
                            total: 10
                        }
                    }
                };
            }
        });

        const trigger = new VerificationTrigger({
            getAdminTriggerThreshold: () => 2,
            Settings: {
                edit: settingsStub
            },
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub,
            eventRepository: {
                getSignupEvents: eventStub
            }
        });

        await trigger._handleMemberCreatedEvent({
            data: {
                source: 'admin'
            }
        });

        eventStub.callCount.should.eql(2);
        eventStub.firstCall.lastArg.should.have.property('source');
        eventStub.firstCall.lastArg.source.should.eql('admin');
        eventStub.firstCall.lastArg.should.have.property('created_at');
        eventStub.firstCall.lastArg.created_at.should.have.property('$gt');
        eventStub.firstCall.lastArg.created_at.$gt.should.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);

        emailStub.callCount.should.eql(1);
        emailStub.lastCall.firstArg.should.eql({
            subject: 'Email needs verification',
            message: 'Email verification needed for site: {siteUrl} has added: {amountTriggered} members through the Admin client in the last 30 days.',
            amountTriggered: 10
        });
    });

    it('Triggers when a number of members are added from API', async function () {
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const eventStub = sinon.stub().callsFake(async (_unused, {source}) => {
            if (source === 'member') {
                return {
                    meta: {
                        pagination: {
                            total: 0
                        }
                    }
                };
            } else {
                return {
                    meta: {
                        pagination: {
                            total: 10
                        }
                    }
                };
            }
        });

        const trigger = new VerificationTrigger({
            getAdminTriggerThreshold: () => 2,
            getApiTriggerThreshold: () => 2,
            Settings: {
                edit: settingsStub
            },
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub,
            eventRepository: {
                getSignupEvents: eventStub
            }
        });

        await trigger._handleMemberCreatedEvent({
            data: {
                source: 'api'
            }
        });

        eventStub.callCount.should.eql(2);
        eventStub.firstCall.lastArg.should.have.property('source');
        eventStub.firstCall.lastArg.source.should.eql('api');
        eventStub.firstCall.lastArg.should.have.property('created_at');
        eventStub.firstCall.lastArg.created_at.should.have.property('$gt');
        eventStub.firstCall.lastArg.created_at.$gt.should.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);

        emailStub.callCount.should.eql(1);
        emailStub.lastCall.firstArg.should.eql({
            subject: 'Email needs verification',
            message: 'Email verification needed for site: {siteUrl} has added: {amountTriggered} members through the API in the last 30 days.',
            amountTriggered: 10
        });
    });

    it('Does not fetch events and trigger when threshold is Infinity', async function () {
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const eventStub = sinon.stub().callsFake(async (_unused, {source}) => {
            if (source === 'member') {
                return {
                    meta: {
                        pagination: {
                            total: 15
                        }
                    }
                };
            } else {
                return {
                    meta: {
                        pagination: {
                            total: 10
                        }
                    }
                };
            }
        });

        const trigger = new VerificationTrigger({
            getImportTriggerThreshold: () => Infinity,
            Settings: {
                edit: settingsStub
            },
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub,
            eventRepository: {
                getSignupEvents: eventStub
            }
        });

        await trigger.testImportThreshold();

        // We shouldn't be fetching the events if the threshold is Infinity
        eventStub.callCount.should.eql(0);

        // We shouldn't be sending emails if the threshold is Infinity
        emailStub.callCount.should.eql(0);
    });
});
