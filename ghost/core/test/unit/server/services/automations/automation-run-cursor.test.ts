import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  decodeRunCursor,
  encodeRunCursor,
  type RunCursorScope,
} from '../../../../../core/server/services/automations/automation-run-cursor';

const scope: RunCursorScope = {
  automation_id: 'automation-1',
  date_from: null,
  date_to: null,
  timezone: 'UTC',
  status: null,
  direction: 'desc',
};
const position = { id: 'run-1', created_at: '2026-09-14T12:00:00.123Z' };
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('automation run cursors', function () {
  it('round-trips a position under the same scope', function () {
    assert.deepEqual(decodeRunCursor(encodeRunCursor(scope, position), scope), { scope, position });
  });

  it('normalises the timestamp so it compares with pipe rows', function () {
    const cursor = encode({ ...scope, id: 'run-1', created_at: '2026-09-14T12:00:00Z' });
    assert.deepEqual(decodeRunCursor(cursor, scope), {
      scope,
      position: { id: 'run-1', created_at: '2026-09-14T12:00:00.000Z' },
    });
  });

  it('preserves an earlier end date only when the request uses the default', function () {
    const original = { ...scope, date_from: '2026-09-01', date_to: '2026-09-15' };
    const cursor = encodeRunCursor(original, position);
    const nextDay = { ...original, date_to: '2026-09-16' };
    assert.deepEqual(decodeRunCursor(cursor, nextDay, { preserveEndDate: true }), {
      scope: original,
      position,
    });
    assert.throws(() => decodeRunCursor(cursor, nextDay), { message: /does not match/ });
  });

  it.each([null, '2026-09-01', '2026-09-17'])(
    'rejects an absent, reversed, or future end date when preserving it (%s)',
    function (dateTo) {
      const requested = { ...scope, date_from: '2026-09-01', date_to: '2026-09-16' };
      const cursor = encodeRunCursor({ ...requested, date_to: dateTo }, position);
      assert.throws(() => decodeRunCursor(cursor, requested, { preserveEndDate: true }), {
        message: /does not match/,
      });
    },
  );

  for (const [label, cursor] of [
    ['a non-string', 42],
    ['not base64 JSON', 'not-a-cursor'],
    ['an oversized cursor', 'x'.repeat(2049)],
    ['a JSON primitive', encode(null)],
    ['missing fields', encode({ automation_id: 'automation-1' })],
    ['an unexpected field', encode({ ...scope, ...position, extra: true })],
    ['an invalid timestamp', encode({ ...scope, ...position, created_at: 'yesterday' })],
  ] as const) {
    it(`rejects ${label}`, function () {
      assert.throws(() => decodeRunCursor(cursor, scope), { message: /cursor is invalid/ });
    });
  }

  for (const [label, other] of [
    ['start date', { date_from: '2026-09-01' }],
    ['end date', { date_to: '2026-10-01' }],
    ['timezone', { timezone: 'America/New_York' }],
    ['automation', { automation_id: 'automation-2' }],
    ['status', { status: 'completed' as const }],
    ['direction', { direction: 'asc' as const }],
  ] as const) {
    it(`rejects a cursor issued for another ${label}`, function () {
      const cursor = encodeRunCursor({ ...scope, ...other }, position);
      assert.throws(() => decodeRunCursor(cursor, scope, { preserveEndDate: true }), {
        message: /does not match/,
      });
    });
  }
});
