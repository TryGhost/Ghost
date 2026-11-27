import {
  encodeRunCursor,
  decodeRunCursor,
} from '../../../../../core/server/services/automations/automation-run-cursor';
import assert from 'node:assert/strict';
import {
  normalizeMemberSearch,
  searchCursorScope,
} from '../../../../../core/server/services/automations/automation-member-search';
import { type AutomationRunRow } from '../../../../../core/server/services/automations/tinybird-automation-stats';
const id = (n: number) => n.toString(16).padStart(24, '0');
const time = '2026-01-01T00:00:00.000Z';
const scope = searchCursorScope(
  {
    automation_id: id(1),
    status: null,
    direction: 'asc',
    date_from: null,
    date_to: null,
    timezone: 'UTC',
  },
  'site-a',
  'anna',
);
const row = (n: number): AutomationRunRow => ({
  id: id(n),
  created_at: time,
  status: 'completed',
  failed: false,
});

describe('Member search matching and cursors', () => {
  it('trims outer whitespace without rewriting Unicode or restricting single characters', () => {
    assert.equal(normalizeMemberSearch('  Ré nee  '), 'Ré nee');
    assert.equal(normalizeMemberSearch(' a '), 'a');
    assert.equal(normalizeMemberSearch(undefined), '');
    assert.equal(normalizeMemberSearch(' \n '), '');
  });
  it.each([null, [], 'x'.repeat(4097), 'é'.repeat(2049)])(
    'rejects invalid/excessive input',
    (value) => assert.throws(() => normalizeMemberSearch(value)),
  );
  it('roundtrips position without raw query/member data', () => {
    const token = encodeRunCursor(scope, row(5));
    assert.deepEqual(decodeRunCursor(token, scope).position, { id: id(5), created_at: time });
    assert.ok(!Buffer.from(token, 'base64url').toString().includes('anna'));
  });
  it.each([
    { field: 'site', change: { site: 'b' } },
    { field: 'search', change: { query: '0'.repeat(64) } },
  ])('rejects a cursor issued for another $field', ({ change }) => {
    const token = encodeRunCursor(scope, row(5));
    assert.throws(() => decodeRunCursor(token, { ...scope, ...change }), {
      message: /does not match/,
    });
  });
});
