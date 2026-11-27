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
      for (const error of [null, new Error('startup failed')]) {
        it(`publishes only the first ${error ? 'failure' : 'success'} IPC message`, async function () {
          await notify[method](error);
          await notify[method](error ? null : new Error('later failure'));
          await notify[method](error);

          sinon.assert.calledOnce(process.send);
          const message = process.send.firstCall.args[0];
          assert(message && typeof message === 'object');
          assert('debug' in message);
          assert.equal(message[field], !error);
          if (error) {
            assert.equal(message.error, error);
          } else {
            assert(!('error' in message));
          }
        });
      }
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
