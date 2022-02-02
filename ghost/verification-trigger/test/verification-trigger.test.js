// Switch these lines once there are useful utils
// const testUtils = require('./utils');
const sinon = require('sinon');
require('./utils');
const VerificationTrigger = require('../lib/verification-trigger');

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
            message: 'Email verification needed for site: {siteUrl}, just imported: {importedNumber} members.',
            amountImported: 10
        });
    });
});
