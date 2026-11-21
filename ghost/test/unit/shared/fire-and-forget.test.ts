import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { fireAndForget } from '../../../core/shared/fire-and-forget';

describe('fireAndForget', function () {
  describe('synchronous results', function () {
    it('runs, and discards the result of, synchronous functions', function () {
      const fn = sinon.stub().returns('result');
      assert.equal(fireAndForget(fn), undefined);
      sinon.assert.calledOnce(fn);
    });

    it('runs, and discards errors from, synchronous functions', function () {
      const fn = sinon.stub().throws(new Error('sync failure'));
      assert.equal(fireAndForget(fn), undefined);
      sinon.assert.calledOnce(fn);
    });
  });

  describe('asynchronous results', function () {
    it('runs, and discards resolutions of, asynchronous functions', function () {
      const fn = sinon.stub().resolves('result');
      assert.equal(fireAndForget(fn), undefined);
      sinon.assert.calledOnce(fn);
    });

    it('runs, and discards rejections from, asynchronous functions', async function () {
      const fn = sinon.stub().rejects(new Error('async failure'));
      assert.equal(fireAndForget(fn), undefined);
      sinon.assert.calledOnce(fn);
      // Let Vitest observe any unhandled rejection before the test ends.
      await setImmediate();
    });
  });
});
