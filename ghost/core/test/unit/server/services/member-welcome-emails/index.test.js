const sinon = require('sinon');
const rewire = require('rewire');
const DomainEvents = require('@tryghost/domain-events');
const {MemberCreatedEvent} = require('../../../../../core/shared/events');

describe('Member Welcome Emails Service', function () {
    let service;
    let processOutboxStub;
    let configStub;
    let loggingStub;
    let jobsStub;

    beforeEach(function () {
        service = rewire('../../../../../core/server/services/member-welcome-emails/index.js');

        processOutboxStub = sinon.stub().resolves('Processed');
        configStub = {get: sinon.stub()};
        loggingStub = {info: sinon.stub(), error: sinon.stub()};
        jobsStub = {scheduleMemberWelcomeEmailJob: sinon.stub()};

        service.__set__('processOutbox', processOutboxStub);
        service.__set__('config', configStub);
        service.__set__('logging', loggingStub);
        service.__set__('jobs', jobsStub);
    });

    afterEach(async function () {
        sinon.restore();
        await DomainEvents.allSettled();
    });

    describe('MemberCreatedEvent subscription', function () {
        it('calls startProcessing when config is set and source is member', async function () {
            configStub.get.withArgs('memberWelcomeEmailTestInbox').returns('test@example.com');

            service.init();

            DomainEvents.dispatch(MemberCreatedEvent.create({
                memberId: 'member-1',
                batchId: 'batch-1',
                source: 'member'
            }));

            await DomainEvents.allSettled();

            sinon.assert.calledOnce(processOutboxStub);
        });

        it('does not call startProcessing when config is not set', async function () {
            configStub.get.withArgs('memberWelcomeEmailTestInbox').returns(null);

            service.init();

            DomainEvents.dispatch(MemberCreatedEvent.create({
                memberId: 'member-1',
                batchId: 'batch-1',
                source: 'member'
            }));

            await DomainEvents.allSettled();

            sinon.assert.notCalled(processOutboxStub);
        });

        it('does not call startProcessing when source is not in WELCOME_EMAIL_SOURCES', async function () {
            configStub.get.withArgs('memberWelcomeEmailTestInbox').returns('test@example.com');

            service.init();

            DomainEvents.dispatch(MemberCreatedEvent.create({
                memberId: 'member-1',
                batchId: 'batch-1',
                source: 'import'
            }));

            await DomainEvents.allSettled();

            sinon.assert.notCalled(processOutboxStub);
        });
    });

    describe('startProcessing guard', function () {
        it('skips processing if already running', async function () {
            service.init();
            service.processing = true;

            await service.startProcessing();

            sinon.assert.notCalled(processOutboxStub);
            sinon.assert.calledWith(loggingStub.info, 'Member welcome email job already running, skipping');
        });
    });
});

