import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  decodeRunCursor,
  encodeRunCursor,
  type RunCursorScope,
} from '../../../../../core/server/services/automations/automation-run-cursor';

const scope: RunCursorScope = { automation_id: 'automation-1', status: null, direction: 'desc' };
const position = { id: 'run-1', created_at: '2026-09-14T12:00:00.123Z' };
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('automation run cursors', function () {
  it('round-trips a position under the same scope', function () {
    assert.deepEqual(decodeRunCursor(encodeRunCursor(scope, position), scope), position);
  });

  it('normalises the timestamp so it compares with pipe rows', function () {
    const cursor = encode({ ...scope, id: 'run-1', created_at: '2026-09-14T12:00:00Z' });
    assert.deepEqual(decodeRunCursor(cursor, scope), {
      id: 'run-1',
      created_at: '2026-09-14T12:00:00.000Z',
    });
  });

  for (const [label, cursor] of [
    ['a non-string', 42],
    ['not base64 JSON', 'not-a-cursor'],
    ['a JSON primitive', encode(null)],
    ['missing fields', encode({ automation_id: 'automation-1' })],
    ['an unexpected field', encode({ ...scope, ...position, extra: true })],
    ['removed status sort', encode({ ...scope, ...position, sort: 'status' })],
    ['removed status boundary', encode({ ...scope, ...position, after_status: 'completed' })],
    ['an invalid timestamp', encode({ ...scope, ...position, created_at: 'yesterday' })],
  ] as const) {
    it(`rejects ${label}`, function () {
      assert.throws(() => decodeRunCursor(cursor, scope), { message: /cursor is invalid/ });
    });
  }

  for (const [label, other] of [
    ['automation', { automation_id: 'automation-2' }],
    ['status', { status: 'completed' as const }],
    ['direction', { direction: 'asc' as const }],
  ] as const) {
    it(`rejects a cursor issued for another ${label}`, function () {
      const cursor = encodeRunCursor({ ...scope, ...other }, position);
      assert.throws(() => decodeRunCursor(cursor, scope), { message: /does not match/ });
    });
  }
});
