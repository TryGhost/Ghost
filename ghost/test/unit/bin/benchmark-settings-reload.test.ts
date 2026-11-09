import assert from 'node:assert/strict';
import sinon from 'sinon';
import { performance } from 'node:perf_hooks';
import { benchmarkReload, parseOptions } from '../../../bin/benchmark-settings-reload';

describe('Settings reload benchmark', function () {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  it('excludes warmup and computes nearest-rank percentiles from successful measured runs', async function () {
    let time = 0;
    sandbox.stub(performance, 'now').callsFake(() => time);
    const durations = [1000, ...Array.from({ length: 100 }, (_, i) => 100 - i)];
    const result = await benchmarkReload(
      async () => {
        const duration = durations.shift()!;
        time += duration;
        return { status: 'ok', findAllMs: duration - 0.25, rebuildMs: 0.25, rows: 300 };
      },
      { runs: 100, warmup: 1, timeoutMs: 1000 },
    );

    assert.equal(result.samples.length, 101);
    assert.equal(result.samples[0].warmup, true);
    assert.deepEqual(result.summary, { successfulRuns: 100, p50Ms: 50, p99Ms: 99 });
    assert.equal(result.samples[1].rows, 300);
    assert.equal(result.samples[1].findAllMs, 99.75);
  });

  it('records a rejection without exposing the error message, stops without retrying', async function () {
    const reload = sandbox.stub().rejects(
      Object.assign(new Error('secret SQL and config'), {
        code: 'ECONNREFUSED',
      }),
    );
    const result = await benchmarkReload(reload, { runs: 10, warmup: 0, timeoutMs: 1000 });
    sinon.assert.calledOnce(reload);
    assert.equal(result.samples[0].status, 'error');
    assert.equal(result.samples[0].errorCode, 'ECONNREFUSED');
    assert.equal(result.samples[0].errorName, 'Error');
    assert.ok(result.samples[0].elapsedMs >= 0);
    assert.equal(JSON.stringify(result).includes('secret'), false);
    assert.deepEqual(result.summary, { successfulRuns: 0, p50Ms: null, p99Ms: null });
  });

  it('bounds a pending read without treating the observation limit as a database timeout', async function () {
    const clock = sandbox.useFakeTimers();
    sandbox.stub(performance, 'now').callsFake(() => clock.now);
    const reload = sandbox.stub().returns(new Promise(() => {}));
    const pending = benchmarkReload(reload, { runs: 3, warmup: 0, timeoutMs: 200 });
    await clock.tickAsync(200);
    const result = await pending;
    assert.equal(result.samples[0].status, 'observation-limit');
    assert.equal(result.samples[0].elapsedMs, 200);
    assert.equal(result.samples[0].errorCode, undefined);
    assert.equal(result.summary.p99Ms, null);
    sinon.assert.calledOnce(reload);
    assert.equal(clock.countTimers(), 0);
  });

  it('stops on a warmup failure and does not invent measured percentiles', async function () {
    const result = await benchmarkReload(
      async () => {
        throw new Error('failed');
      },
      {
        runs: 10,
        warmup: 2,
        timeoutMs: 1000,
      },
    );
    assert.equal(result.samples.length, 1);
    assert.equal(result.samples[0].warmup, true);
    assert.equal(result.summary.successfulRuns, 0);
  });

  it('validates options before loading Core or opening output', function () {
    assert.deepEqual(parseOptions(['--output', '/tmp/result.json']), {
      output: '/tmp/result.json',
      runs: 1000,
      warmup: 20,
      timeoutMs: 120000,
    });
    for (const args of [
      ['--runs', '0'],
      ['--runs', '1.5'],
      ['--warmup', '-1'],
      ['--timeout-ms', 'Infinity'],
      ['--runs', '100001'],
      ['--unknown'],
    ]) {
      assert.throws(() => parseOptions([...args, '--output', '/tmp/result.json']));
    }
    assert.throws(() => parseOptions([]));
  });
});
