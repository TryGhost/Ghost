const assert = require('node:assert/strict');
const rewire = require('rewire');
const sinon = require('sinon');

const configUtils = require('../../utils/config-utils');
const events = require('../../../core/server/lib/common/events');

describe('Notify', function () {
    describe('notifyServerStarted', function () {
        let notify;
        let socketStub;
        let eventSpy;

        beforeEach(function () {
            // Have to re-require each time to clear the internal flag
            delete require.cache[require.resolve('../../../core/server/notify')];

            socketStub = sinon.stub();
            notify = rewire('../../../core/server/notify');
            notify.__set__('require', (path) => {
                if (path === './lib/bootstrap-socket') {
                    return {
                        connectAndSend: socketStub
                    };
                }

                return require(path);
            });

            // process.send isn't set for tests, we can safely override;
            process.send = sinon.stub();

            // Spy for the events that get called
            eventSpy = sinon.spy(events, 'emit');
        });

        afterEach(async function () {
            process.send = undefined;
            await configUtils.restore();
            eventSpy.restore();
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
