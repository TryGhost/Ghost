const assert = require('node:assert/strict');
const sinon = require('sinon');

const notify = require('../../../core/server/notify');

describe('Notify', function () {
    describe('notifyServerStarted', function () {
        beforeEach(function () {
            notify.resetNotifications();

            // process.send isn't set for tests, we can safely override;
            process.send = sinon.stub();
        });

        afterEach(function () {
            process.send = undefined;
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

        it('can be called multiple times, but only communicates once', function () {
            notify.notifyServerStarted();
            notify.notifyServerStarted(new Error('something went wrong'));
            notify.notifyServerStarted();

            sinon.assert.calledOnce(process.send);
        });
    });
});
