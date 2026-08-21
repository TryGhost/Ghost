const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');

const GhostServer = require('../../../core/server/ghost-server');

describe('GhostServer', function () {
    let server;

    beforeEach(function () {
        sinon.stub(logging, 'info');
        sinon.stub(logging, 'warn');
        sinon.stub(logging, 'error');
        server = new GhostServer({url: 'http://localhost:2368', env: 'testing', serverConfig: {}});
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('_cleanup', function () {
        it('runs every task even when one rejects', async function () {
            const slow = sinon.stub().resolves();
            server.registerCleanupTask(() => Promise.reject(new Error('nope')), 'failing task');
            server.registerCleanupTask(slow, 'Email batch sending');

            // Rejects so the exit code still reflects the failure...
            await assert.rejects(server._cleanup(), /1 cleanup task\(s\) failed: failing task/);

            // ...but only after the sibling ran to completion. Rejecting early would
            // exit the process mid-drain and orphan email batches in `submitting`.
            sinon.assert.calledOnce(slow);
        });

        it('resolves when every task succeeds', async function () {
            server.registerCleanupTask(() => Promise.resolve(), 'a');
            server.registerCleanupTask(() => Promise.resolve(), 'b');

            await server._cleanup();
        });
    });

    describe('_preStop', function () {
        it('runs every task before the server drain, isolating failures', function () {
            const second = sinon.stub();
            server.registerPreStopTask(() => {
                throw new Error('nope');
            }, 'failing signal');
            server.registerPreStopTask(second, 'Email batch sending (stop claiming)');

            // Must not throw — a bad signal cannot skip the drain and cleanup that follow.
            server._preStop();

            sinon.assert.calledOnce(second);
        });

        it('has run before the HTTP server is stopped', async function () {
            const order = [];
            server.registerPreStopTask(() => order.push('pre-stop'), 'stop claiming');
            server.registerCleanupTask(async () => {
                order.push('cleanup');
            }, 'drain');
            sinon.stub(server, '_stopServer').callsFake(async () => {
                order.push('stop-server');
            });
            server.httpServer = {listening: true};

            await server.stop();

            assert.deepEqual(order, ['pre-stop', 'stop-server', 'cleanup']);
        });
    });
});
