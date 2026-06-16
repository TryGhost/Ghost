const assert = require('node:assert/strict');
const sinon = require('sinon');

const configUtils = require('../../utils/config-utils');
const notify = require('../../../core/server/notify');

describe('Notify', function () {
    describe('notifyServerStarted', function () {
        let socketStub;

        beforeEach(function () {
            notify._private.notified.started = false;
            notify._private.notified.ready = false;

            socketStub = sinon.stub();
            sinon.stub(notify._private, 'bootstrapSocket').value({connectAndSend: socketStub});

            // process.send isn't set for tests, we can safely override;
            process.send = sinon.stub();
        });

        afterEach(async function () {
            process.send = undefined;
            await configUtils.restore();
            sinon.restore();
        });

        it('it resolves a promise', async function () {
            await notify.notifyServerStarted();
        });

        it('it communicates with IPC correctly on success', function () {
            notify.notifyServerStarted();

            sinon.assert.calledOnce(process.send);

            let message = process.send.firstCall.args[0];
            assert(message && typeof message === 'object');
            assert('debug' in message);
            assert(!('error' in message));
            assert.equal(message.started, true);
        });

        it('communicates with IPC correctly on failure', function () {
            notify.notifyServerStarted(new Error('something went wrong'));

            sinon.assert.calledOnce(process.send);

            let message = process.send.firstCall.args[0];
            assert(message && typeof message === 'object');
            assert('debug' in message);
            assert.equal(message.started, false);
            assert.equal(message.error.message, 'something went wrong');
        });

        it('communicates via bootstrap socket correctly on success', function () {
            configUtils.set('bootstrap-socket', 'testing');

            notify.notifyServerStarted();

            sinon.assert.calledOnce(socketStub);
            assert.equal(socketStub.firstCall.args[0], 'testing');

            let message = socketStub.firstCall.args[1];
            assert(message && typeof message === 'object');
            assert('debug' in message);
            assert(!('error' in message));
            assert.equal(message.started, true);
        });

        it('communicates via bootstrap socket correctly on failure', function () {
            configUtils.set('bootstrap-socket', 'testing');

            notify.notifyServerStarted(new Error('something went wrong'));

            sinon.assert.calledOnce(socketStub);
            assert.equal(socketStub.firstCall.args[0], 'testing');

            let message = socketStub.firstCall.args[1];
            assert(message && typeof message === 'object');
            assert('debug' in message);
            assert.equal(message.started, false);
            assert.equal(message.error.message, 'something went wrong');
        });

        it('can be called multiple times, but only communicates once', function () {
            configUtils.set('bootstrap-socket', 'testing');

            notify.notifyServerStarted();
            notify.notifyServerStarted(new Error('something went wrong'));
            notify.notifyServerStarted();

            sinon.assert.calledOnce(process.send);
            sinon.assert.calledOnce(socketStub);
        });
    });
});
