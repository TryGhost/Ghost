import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  ImportCancellation,
  ImportCancelled,
} from '../../../../../../core/server/services/content-import/import/cancellation';

describe('CSV import cancellation polling', function () {
  afterEach(() => sinon.restore());

  it('checks immediately, polls every two seconds, latches a stop and releases its timer', async function () {
    const clock = sinon.useFakeTimers();
    const read = sinon.stub().resolves(false);
    const cancellation = new ImportCancellation(read);
    await cancellation.start();
    sinon.assert.calledOnce(read);
    await clock.tickAsync(1999);
    cancellation.throwIfStopped();
    sinon.assert.calledOnce(read);
    read.resolves(true);
    await clock.tickAsync(1);
    assert.throws(() => cancellation.throwIfStopped(), ImportCancelled);
    read.resolves(false);
    await clock.tickAsync(4000);
    sinon.assert.calledTwice(read);
    assert.throws(() => cancellation.throwIfStopped(), ImportCancelled);
    await cancellation.stop();
    await cancellation.stop();
    assert.equal(clock.countTimers(), 0);
  });

  it('does not overlap slow reads and waits for an in-flight read on shutdown', async function () {
    const clock = sinon.useFakeTimers();
    const pending = Promise.withResolvers<boolean>();
    const read = sinon.stub().resolves(false).onSecondCall().returns(pending.promise);
    const cancellation = new ImportCancellation(read);
    await cancellation.start();
    await clock.tickAsync(6000);
    sinon.assert.calledTwice(read);
    let stopped = false;
    const stopping = cancellation.stop().then(() => {
      stopped = true;
    });
    await clock.tickAsync(2000);
    assert.equal(stopped, false);
    pending.resolve(true);
    await stopping;
    assert.throws(() => cancellation.throwIfStopped(), ImportCancelled);
    assert.equal(clock.countTimers(), 0);
  });

  it('stops immediately for an existing marker without scheduling a timer', async function () {
    const clock = sinon.useFakeTimers();
    const cancellation = new ImportCancellation(async () => true);
    await assert.rejects(cancellation.start(), ImportCancelled);
    await cancellation.stop();
    assert.equal(clock.countTimers(), 0);
  });

  it.each([true, false])(
    'preserves storage failures, including at startup (%s)',
    async function (startup) {
      const clock = sinon.useFakeTimers();
      const error = new Error('Storage unavailable');
      const read = sinon.stub().resolves(false);
      read.onCall(startup ? 0 : 1).rejects(error);
      const cancellation = new ImportCancellation(read);
      if (startup) {
        await assert.rejects(cancellation.start(), (failure) => failure === error);
      } else {
        await cancellation.start();
        await clock.tickAsync(6000);
        sinon.assert.calledTwice(read);
      }
      assert.throws(
        () => cancellation.throwIfStopped(),
        (failure) => failure === error,
      );
      await cancellation.stop();
      assert.equal(clock.countTimers(), 0);
    },
  );
});
