// Switch these lines once there are useful utils
// const testUtils = require('./utils');
const sinon = require('sinon');
require('./utils');
const VerificationTrigger = require('../index');
const DomainEvents = require('@tryghost/domain-events');
const {MemberSubscribeEvent} = require('@tryghost/member-events');

describe('Import threshold', function () {
    it('Creates a threshold based on config', async function () {
        const trigger = new VerificationTrigger({
            configThreshold: 2,
            membersStats: {
                getTotalMembers: async () => 1
            }
        });

        const result = await trigger.getImportThreshold();
        result.should.eql(2);
    });

    it('Increases the import threshold to the number of members', async function () {
        const trigger = new VerificationTrigger({
            configThreshold: 2,
            membersStats: {
                getTotalMembers: async () => 3
            }
        });

        const result = await trigger.getImportThreshold();
        result.should.eql(3);
    });

    it('Does not check members count when config threshold is infinite', async function () {
        const membersStub = sinon.stub().resolves(null);
        const trigger = new VerificationTrigger({
            configThreshold: Infinity,
            memberStats: {
                getTotalMembers: membersStub
            }
        });

        const result = await trigger.getImportThreshold();
        result.should.eql(Infinity);
        membersStub.callCount.should.eql(0);
    });
});

describe('Email verification flow', function () {
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

        const result = await trigger.startVerificationProcess({
            amountImported: 10,
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

        const result = await trigger.startVerificationProcess({
            amountImported: 10,
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

        const result = await trigger.startVerificationProcess({
            amountImported: 10,
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

        await trigger.startVerificationProcess({
            amountImported: 10,
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

        await trigger.startVerificationProcess({
            amountImported: 10,
            throwOnTrigger: false
        });

        emailStub.lastCall.firstArg.should.eql({
            subject: 'Email needs verification',
            message: 'Email verification needed for site: {siteUrl}, has imported: {importedNumber} members in the last 30 days.',
            amountImported: 10
        });
    });

    it('Triggers when a number of API events are dispatched', async function () {
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const eventStub = sinon.stub().resolves({
            meta: {
                pagination: {
                    total: 10
                }
            }
        });

        new VerificationTrigger({
            configThreshold: 2,
            Settings: {
                edit: settingsStub
            },
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub,
            eventRepository: {
                getNewsletterSubscriptionEvents: eventStub
            }
        });

        DomainEvents.dispatch(MemberSubscribeEvent.create({
            memberId: 'hello!',
            source: 'api'
        }, new Date()));

        eventStub.callCount.should.eql(1);
        eventStub.lastCall.lastArg.should.have.property('data.source');
        eventStub.lastCall.lastArg.should.have.property('data.created_at');
        eventStub.lastCall.lastArg['data.source'].should.eql(`data.source:'api'`);
        eventStub.lastCall.lastArg['data.created_at'].should.startWith(`data.created_at:>'`);
    });

    it('Triggers when a number of members are imported', async function () {
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const eventStub = sinon.stub().resolves({
            meta: {
                pagination: {
                    total: 10
                }
            }
        });

        const trigger = new VerificationTrigger({
            configThreshold: 2,
            Settings: {
                edit: settingsStub
            },
            membersStats: {
                getTotalMembers: () => 15
            },
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub,
            eventRepository: {
                getNewsletterSubscriptionEvents: eventStub
            }
        });

        await trigger.testImportThreshold();

        eventStub.callCount.should.eql(1);
        eventStub.lastCall.lastArg.should.have.property('data.source');
        eventStub.lastCall.lastArg.should.have.property('data.created_at');
        eventStub.lastCall.lastArg['data.source'].should.eql(`data.source:'import'`);
        eventStub.lastCall.lastArg['data.created_at'].should.startWith(`data.created_at:>'`);

        emailStub.callCount.should.eql(1);
        emailStub.lastCall.firstArg.should.eql({
            subject: 'Email needs verification',
            message: 'Email verification needed for site: {siteUrl}, has imported: {importedNumber} members in the last 30 days.',
            amountImported: 10
        });
    });

    it('Does not fetch events and trigger when threshold is Infinity', async function () {
        const emailStub = sinon.stub().resolves(null);
        const settingsStub = sinon.stub().resolves(null);
        const eventStub = sinon.stub().resolves({
            meta: {
                pagination: {
                    total: 10
                }
            }
        });

        const trigger = new VerificationTrigger({
            configThreshold: Infinity,
            Settings: {
                edit: settingsStub
            },
            membersStats: {
                getTotalMembers: () => 15
            },
            isVerified: () => false,
            isVerificationRequired: () => false,
            sendVerificationEmail: emailStub,
            eventRepository: {
                getNewsletterSubscriptionEvents: eventStub
            }
        });

        await trigger.testImportThreshold();

        // We shouldn't be fetching the events if the threshold is Infinity
        eventStub.callCount.should.eql(0);

        // We shouldn't be sending emails if the threshold is infinity
        emailStub.callCount.should.eql(0);
    });
});
