import assert from 'node:assert/strict';
import {
  countCursorScope,
  decodeCountCursor,
  encodeCountCursor,
  type CountCursor,
} from '../../../../../core/server/services/automations/automation-member-search-counts';
import type { EntryStatsWindow } from '../../../../../core/server/services/automations/automation-entry-stats';

const id = (n: number) => n.toString(16).padStart(24, '0');
const secret = 'test-count-signing-key-'.repeat(3);
const scope = countCursorScope(id(1), 'site-a', 'anna', {
  date_from: null,
  date_to: null,
  timezone: 'UTC',
});
const window: EntryStatsWindow = {
  date_from: '2026-09-01',
  date_to: '2026-09-03',
  timezone: 'UTC',
  bucket: 'day',
};
const zero = { in_progress_run_count: 0, completed_run_count: 0, exited_early_run_count: 0 };
const state: CountCursor = {
  scope,
  after: id(10),
  upper: id(99),
  counts: { ...zero, completed_run_count: 10 },
  window,
};

describe('Signed search-stat continuations', () => {
  it('preserves progress and calendar across instances without including member search text', () => {
    const token = encodeCountCursor(state, secret);
    assert.deepEqual(decodeCountCursor(token, scope, secret), state);
    assert.ok(!Buffer.from(token.split('.')[0], 'base64url').toString().includes('anna'));
  });
  it.each(['after', 'upper', 'counts', 'scope', 'window'])('rejects a tampered %s', (field) => {
    const [payload, signature] = encodeCountCursor(state, secret).split('.');
    const changed = JSON.parse(Buffer.from(payload, 'base64url').toString());
    changed[field] = null;
    assert.throws(() =>
      decodeCountCursor(
        `${Buffer.from(JSON.stringify(changed)).toString('base64url')}.${signature}`,
        scope,
        secret,
      ),
    );
  });
  it.each([
    { site: 'other' },
    { automation_id: id(2) },
    { query: 'f'.repeat(64) },
    { date_from: '2026-09-01', date_to: '2026-09-03' },
    { timezone: 'America/New_York' },
  ])('rejects a cursor from a different search scope: %j', (change) => {
    assert.throws(() =>
      decodeCountCursor(encodeCountCursor(state, secret), { ...scope, ...change }, secret),
    );
  });
  it('rejects a rotated signing secret', () => {
    const token = encodeCountCursor(state, secret);
    assert.throws(() => decodeCountCursor(token, scope, `${secret}rotated`));
  });
  it.each([null, {}, '', 'x'.repeat(4097), 'unsigned'])('rejects malformed tokens: %j', (value) => {
    assert.throws(() => decodeCountCursor(value, scope, secret));
  });
  it('pins an implicit end date across midnight but rejects changed explicit dates', () => {
    const dated = { ...scope, date_from: '2026-09-01', date_to: '2026-09-03' };
    const token = encodeCountCursor({ ...state, scope: dated }, secret);
    const tomorrow = { ...dated, date_to: '2026-09-04' };
    assert.equal(
      decodeCountCursor(token, tomorrow, secret, { preserveEndDate: true }).scope.date_to,
      dated.date_to,
    );
    assert.throws(() => decodeCountCursor(token, tomorrow, secret));
  });
});
