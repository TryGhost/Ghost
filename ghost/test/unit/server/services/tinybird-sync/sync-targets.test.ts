import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { AUTOMATION_SYNC_TARGETS } from '../../../../../core/server/services/tinybird-sync/sync-table-to-tinybird';

const tinybirdDir = path.resolve(__dirname, '../../../../../core/server/data/tinybird');
const fixtureByTable: Record<string, string> = {
  automation_runs: 'automation_run_events',
  automation_run_steps: 'automation_run_step_events',
};

describe('AUTOMATION_SYNC_TARGETS', () => {
  for (const target of AUTOMATION_SYNC_TARGETS) {
    describe(target.table, () => {
      it('includes every payload field used by fixtures', () => {
        const fixtureName = fixtureByTable[target.table];
        const fixture = readFileSync(
          path.join(tinybirdDir, 'fixtures', `${fixtureName}.ndjson`),
          'utf8',
        );
        const fixtureColumns = new Set(
          fixture
            .trim()
            .split('\n')
            .flatMap((line) => Object.keys(JSON.parse(line).payload))
            .filter((column) => column !== 'site_uuid'),
        );

        for (const column of fixtureColumns) {
          assert.ok(target.columns.includes(column), `${target.table} must send ${column}`);
        }
      });

      it('includes cursor columns', () => {
        assert.ok(target.columns.includes('id'));
        assert.ok(target.columns.includes('updated_at'));
      });
    });
  }
});
