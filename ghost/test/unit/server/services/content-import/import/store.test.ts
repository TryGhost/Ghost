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

    store.create('run_1', 2, ['Headline', 'Body']);
    store.record('run_1', outcome(1));
    store.record('run_1', outcome(2));

    const running = store.get('run_1');
    assert.equal(running?.status, 'running');
    assert.equal(running?.total, 2);
    assert.deepEqual(running?.sourceColumns, ['Headline', 'Body']);
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

  it('records updated rows as successful outcomes', function () {
    const store = new ImportRunStore();
    store.create('run_updated', 1);

    store.record('run_updated', {
      line: 2,
      title: 'Updated post',
      status: 'updated',
      postId: 'post_updated',
    });

    assert.equal(store.get('run_updated')?.rows[0].status, 'updated');
  });

  it('defaults source columns for internal callers without source data', function () {
    const store = new ImportRunStore();

    store.create('run_no_source', 0);

    assert.deepEqual(store.get('run_no_source')?.sourceColumns, []);
  });

  it('ignores writes against an unknown run rather than throwing', function () {
    const store = new ImportRunStore();

    store.record('nope', outcome(1));
    store.finish('nope');
    store.fail('nope', 'failed');

    assert.equal(store.get('nope'), undefined);
  });

  it('releases a finished run idempotently', function () {
    const store = new ImportRunStore();
    store.create('run_release', 1);
    store.finish('run_release');

    store.release('run_release');
    store.release('run_release');

    assert.equal(store.get('run_release'), undefined);
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

  it('keeps finished runs regardless of age or count', function () {
    let now = new Date('2026-01-01T10:00:00.000Z');
    const store = new ImportRunStore({ now: () => now });
    store.create('run_1', 1);
    store.finish('run_1');

    now = new Date('2026-01-01T12:00:00.000Z');
    for (let i = 2; i <= 12; i += 1) {
      store.create(`run_${i}`, 1);
    }

    assert.ok(store.get('run_1'));
  });
});
