const should = require('should');
const sinon = require('sinon');

const configUtils = require('../../utils/configUtils');
const events = require('../../../core/server/lib/common/events');
const bootstrapSocket = require('../../../core/server/lib/bootstrap-socket');

describe('Notify', function () {
    describe('notifyServerStarted', function () {
        let notify;
        let socketStub;
        let eventSpy;

        beforeEach(function () {
            // Have to re-require each time to clear the internal flag
            delete require.cache[require.resolve('../../../core/server/notify')];
            notify = require('../../../core/server/notify');

            // process.send isn't set for tests, we can safely override;
            process.send = sinon.stub();

            // stub socket connectAndSend method
            socketStub = sinon.stub(bootstrapSocket, 'connectAndSend');

            // Spy for the events that get called
            eventSpy = sinon.spy(events, 'emit');
        });

        afterEach(async function () {
            process.send = undefined;
            await configUtils.restore();
            socketStub.restore();
            eventSpy.restore();
        });

        it('it resolves a promise', function () {
            notify.notifyServerStarted().should.be.fulfilled();
        });

        it('it communicates with IPC correctly on success', function () {
            notify.notifyServerStarted();

            process.send.calledOnce.should.be.true();

            let message = process.send.firstCall.args[0];
            message.should.be.an.Object().with.properties('started', 'debug');
            message.should.not.have.property('error');
            message.started.should.be.true();
        });

        it('communicates with IPC correctly on failure', function () {
            notify.notifyServerStarted(new Error('something went wrong'));

            process.send.calledOnce.should.be.true();

            let message = process.send.firstCall.args[0];
            message.should.be.an.Object().with.properties('started', 'debug', 'error');
            message.started.should.be.false();
            message.error.should.be.an.Object().with.properties('message');
            message.error.message.should.eql('something went wrong');
        });

        it('communicates via bootstrap socket correctly on success', function () {
            configUtils.set('bootstrap-socket', 'testing');

            notify.notifyServerStarted();

            socketStub.calledOnce.should.be.true();
            socketStub.firstCall.args[0].should.eql('testing');

            let message = socketStub.firstCall.args[1];
            message.should.be.an.Object().with.properties('started', 'debug');
            message.should.not.have.property('error');
            message.started.should.be.true();
        });

        it('communicates via bootstrap socket correctly on failure', function () {
            configUtils.set('bootstrap-socket', 'testing');

            notify.notifyServerStarted(new Error('something went wrong'));

            socketStub.calledOnce.should.be.true();
            socketStub.firstCall.args[0].should.eql('testing');

            let message = socketStub.firstCall.args[1];
            message.should.be.an.Object().with.properties('started', 'debug', 'error');
            message.started.should.be.false();
            message.error.should.be.an.Object().with.properties('message');
            message.error.message.should.eql('something went wrong');
        });

        it('can be called multiple times, but only communicates once', function () {
            configUtils.set('bootstrap-socket', 'testing');

            notify.notifyServerStarted();
            notify.notifyServerStarted(new Error('something went wrong'));
            notify.notifyServerStarted();

            process.send.calledOnce.should.be.true();
            socketStub.calledOnce.should.be.true();
        });
    });
});
