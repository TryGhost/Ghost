import { fillEntryStats } from '../../../../core/server/services/automations/automation-entry-stats';
import assert from 'node:assert/strict';
import { afterEach, beforeAll, beforeEach, describe, it } from 'vitest';
import ObjectId from 'bson-objectid';
const models = require('../../../../core/server/models');
const testUtils = require('../../../utils');
import { createDatabaseAutomationsRepository } from '../../../../core/server/services/automations/database-automations-repository';
import {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} from '../../../utils/automations-fixtures';
const repository = createDatabaseAutomationsRepository({
  knex: models.Base.knex,
  fakeWaitHoursMultiplier: null,
});
describe('automation statistics repository', function () {
  let automationId: string;
  let otherId: string;
  beforeAll(async function () {
    await testUtils.setup('default')();
  });
  beforeEach(async function () {
    await setupAutomationsFixture();
    [automationId, otherId] = (await models.Base.knex('automations').select('id')).map(
      (row: { id: string }) => row.id,
    );
  });
  afterEach(async function () {
    await cleanupAutomationsFixture();
  });
  const window = {
    date_from: '2026-08-16',
    date_to: '2026-09-15',
    bucket: 'day',
    timezone: 'UTC',
  } as const;
  async function insertEntry(id: string, date: string) {
    await models.Base.knex('automation_runs').insert({
      id: ObjectId().toHexString(),
      automation_id: id,
      member_id: null,
      member_email: 'same@example.com',
      created_at: date,
      updated_at: date,
    });
  }
  it('counts scoped totals and UTC days', async function () {
    for (const date of [
      '2026-08-15 23:59:59',
      '2026-08-16 00:00:00',
      '2026-09-14 01:00:00',
      '2026-09-14 02:00:00',
      '2026-09-15 00:00:00',
    ]) {
      await insertEntry(automationId, date);
    }
    await insertEntry(otherId, '2026-09-14 03:00:00');
    const stats = fillEntryStats(await repository.getEntryStats(automationId, window), window);
    assert.equal(stats.total_run_count, 5);
    assert.equal(stats.entries.length, 30);
    assert.deepEqual(stats.entries[0], { date: '2026-08-16', count: 1 });
    assert.deepEqual(stats.entries[1], { date: '2026-08-17', count: 0 });
    assert.deepEqual(stats.entries[29], { date: '2026-09-14', count: 2 });
  });
});
