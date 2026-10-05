const assert = require('node:assert/strict');
const sinon = require('sinon');

const notify = require('../../../core/server/notify');

describe('Notify', function () {
  let originalSend;

  beforeEach(function () {
    notify.resetNotifications();
    originalSend = Object.getOwnPropertyDescriptor(process, 'send');
    process.send = sinon.stub();
  });

  afterEach(function () {
    notify.resetNotifications();
    if (originalSend) {
      Object.defineProperty(process, 'send', originalSend);
    } else {
      delete process.send;
    }
    sinon.restore();
  });

  for (const [method, field] of [
    ['notifyServerStarted', 'started'],
    ['notifyServerReady', 'ready'],
  ]) {
    describe(method, function () {
      it('resolves a promise', async function () {
        await notify[method]();
      });

      it('communicates with IPC correctly on success', async function () {
        await notify[method]();

        sinon.assert.calledOnce(process.send);

        const message = process.send.firstCall.args[0];
        assert(message && typeof message === 'object');
        assert('debug' in message);
        assert(!('error' in message));
        assert.equal(message[field], true);
      });

      it('communicates with IPC correctly on failure', async function () {
        const error = new Error('something went wrong');
        await notify[method](error);

        sinon.assert.calledOnce(process.send);

        const message = process.send.firstCall.args[0];
        assert(message && typeof message === 'object');
        assert('debug' in message);
        assert.equal(message[field], false);
        assert.equal(message.error, error);
      });

      it('can be called multiple times, but only communicates once', async function () {
        await notify[method]();
        await notify[method](new Error('something went wrong'));
        await notify[method]();

        sinon.assert.calledOnce(process.send);
      });
    });
  }

  for (const error of [null, new Error('startup failed')]) {
    it(`reports ${error ? 'failed' : 'successful'} readiness independently of listening`, async function () {
      await notify.notifyServerStarted();
      await notify.notifyServerReady(error);
      await notify.notifyServerStarted();
      await notify.notifyServerReady();

      sinon.assert.calledTwice(process.send);
      const started = process.send.firstCall.args[0];
      const ready = process.send.secondCall.args[0];
      assert.equal(started.started, true);
      assert(!('ready' in started));
      assert.equal(ready.ready, !error);
      assert(!('started' in ready));
      if (error) {
        assert.equal(ready.error, error);
      } else {
        assert(!('error' in ready));
      }
    });
  }
});
