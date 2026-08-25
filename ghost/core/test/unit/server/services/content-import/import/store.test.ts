import assert from 'node:assert/strict';
import {
  ImportRunStore,
  type RowOutcome,
} from '../../../../../../core/server/services/content-import/import/store';

const outcome = (line: number): RowOutcome => ({
  line,
  title: `Post ${line}`,
  status: 'created',
  postId: `post_${line}`,
  url: `https://example.com/post-${line}/`,
});

describe('ImportRunStore', function () {
  it('tracks a run from created to complete, in order', function () {
    const store = new ImportRunStore();

    store.create('run_1', 2);
    store.record('run_1', outcome(1));
    store.record('run_1', outcome(2));

    const running = store.get('run_1');
    assert.equal(running?.status, 'running');
    assert.equal(running?.total, 2);
    assert.deepEqual(
      running?.rows.map((r) => r.line),
      [1, 2],
    );
    assert.equal(running?.finishedAt, undefined);

    store.finish('run_1');

    const finished = store.get('run_1');
    assert.equal(finished?.status, 'complete');
    assert.ok(finished?.finishedAt instanceof Date);
  });

  it('ignores writes against an unknown run rather than throwing', function () {
    const store = new ImportRunStore();

    store.record('nope', outcome(1));
    store.finish('nope');
    store.fail('nope', 'failed');

    assert.equal(store.get('nope'), undefined);
  });

  it('tracks a run-level failure as a finished terminal state', function () {
    const finishedAt = new Date('2026-01-01T11:00:00.000Z');
    const store = new ImportRunStore({ now: () => finishedAt });

    store.create('run_failed', 2);
    store.fail('run_failed', 'converter unavailable');

    const failed = store.get('run_failed');
    assert.equal(failed?.status, 'failed');
    assert.equal(failed?.failureReason, 'converter unavailable');
    assert.equal(failed?.finishedAt, finishedAt);
  });

  it('keeps only the most recent finished runs', function () {
    const store = new ImportRunStore();

    for (let i = 1; i <= 12; i += 1) {
      store.create(`run_${i}`, 1);
      store.finish(`run_${i}`);
    }

    assert.equal(store.get('run_1'), undefined, 'the oldest runs were evicted');
    assert.equal(store.get('run_2'), undefined);
    assert.ok(store.get('run_3'), 'recent runs survive');
    assert.ok(store.get('run_12'));
  });

  it('never evicts a running run by count', function () {
    const store = new ImportRunStore();

    for (let i = 1; i <= 12; i += 1) {
      store.create(`run_${i}`, 1);
    }

    assert.ok(store.get('run_1'), 'still running: its job would lose record() and finish()');
    assert.ok(store.get('run_12'));
  });

  it('never evicts a running run by age', function () {
    let now = new Date('2026-01-01T10:00:00.000Z');
    const store = new ImportRunStore({ now: () => now });

    store.create('run_stuck', 1);

    now = new Date('2026-01-01T12:00:00.000Z');
    store.create('run_new', 1);

    assert.ok(store.get('run_stuck'), 'two hours old but still running');
    assert.ok(store.get('run_new'));
  });

  it('drops runs older than an hour when a new run arrives', function () {
    let now = new Date('2026-01-01T10:00:00.000Z');
    const store = new ImportRunStore({ now: () => now });

    store.create('run_old', 1);
    store.finish('run_old');

    now = new Date('2026-01-01T10:30:00.000Z');
    store.create('run_recent', 1);

    now = new Date('2026-01-01T11:15:00.000Z');
    store.create('run_new', 1);

    assert.equal(store.get('run_old'), undefined, 'aged out');
    assert.ok(store.get('run_recent'), 'not yet an hour old');
    assert.ok(store.get('run_new'));
  });

  it('evicts failed runs by age like completed runs', function () {
    let now = new Date('2026-01-01T10:00:00.000Z');
    const store = new ImportRunStore({ now: () => now });

    store.create('run_failed', 1);
    store.fail('run_failed', 'converter unavailable');

    now = new Date('2026-01-01T11:15:00.000Z');
    store.create('run_new', 1);

    assert.equal(store.get('run_failed'), undefined);
    assert.ok(store.get('run_new'));
  });
});
