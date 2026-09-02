import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { AUTOMATION_SYNC_TARGETS } from '../../../../../core/server/services/tinybird-sync/sync-table-to-tinybird';

const tinybirdDir = path.resolve(__dirname, '../../../../../core/server/data/tinybird');

// The sync targets must line up with the Tinybird datafiles, or rows get quarantined at runtime.
describe('AUTOMATION_SYNC_TARGETS', () => {
  for (const target of AUTOMATION_SYNC_TARGETS) {
    describe(target.datasource, () => {
      it('has a datasource file', () => {
        assert.ok(
          existsSync(path.join(tinybirdDir, 'datasources', `${target.datasource}.datasource`)),
        );
      });

      it('sends every payload column the fixtures rely on', () => {
        const fixture = readFileSync(
          path.join(tinybirdDir, 'fixtures', `${target.datasource}.ndjson`),
          'utf8',
        );
        const payloadKeys = new Set(
          fixture
            .trim()
            .split('\n')
            .flatMap((line) => Object.keys(JSON.parse(line).payload))
            .filter((key) => key !== 'site_uuid'),
        );

        for (const key of payloadKeys) {
          assert.ok(target.columns.includes(key), `${target.table} must send ${key}`);
        }
      });

      it('always sends the id and updated_at used as the sync cursor', () => {
        assert.ok(target.columns.includes('id'));
        assert.ok(target.columns.includes('updated_at'));
      });
    });
  }
});
