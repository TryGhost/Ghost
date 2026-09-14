const {
  fillEntryStats,
} = require('../../../../core/server/services/automations/automation-entry-stats');
const assert = require('node:assert/strict');
const ObjectId = require('bson-objectid').default;
const models = require('../../../../core/server/models');
const testUtils = require('../../../utils');
const {
  createDatabaseAutomationsRepository,
} = require('../../../../core/server/services/automations/database-automations-repository');
const {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} = require('../../../utils/automations-fixtures');
const repository = createDatabaseAutomationsRepository({
  knex: models.Base.knex,
  fakeWaitHoursMultiplier: null,
});
const zeroCounts = {
  in_progress_run_count: 0,
  completed_run_count: 0,
  exited_early_run_count: 0,
  unclassified_run_count: 0,
};

describe('automation statistics repository', function () {
  let automationId;
  let otherId;
  let revisionId;
  beforeAll(async function () {
    await testUtils.setup('default')();
  });
  beforeEach(async function () {
    await setupAutomationsFixture();
    [automationId, otherId] = (await models.Base.knex('automations').select('id')).map(
      (row) => row.id,
    );
    revisionId = (await models.Base.knex('automation_action_revisions').first('id')).id;
  });
  afterEach(async function () {
    await cleanupAutomationsFixture();
  });
  async function readStoredCounts() {
    return { automation_id: automationId, ...(await repository.getStatusStats(automationId)) };
  }
  async function insertRun(id, statuses) {
    const runId = ObjectId().toHexString();
    const date = '2020-01-01 00:00:00';
    await models.Base.knex('automation_runs').insert({
      id: runId,
      automation_id: id,
      member_id: null,
      member_email: 'same@example.com',
      created_at: date,
      updated_at: date,
    });
    if (statuses.length) {
      await models.Base.knex('automation_run_steps').insert(
        statuses.map((status) => ({
          id: ObjectId().toHexString(),
          automation_run_id: runId,
          automation_action_revision_id: revisionId,
          status,
          ready_at: date,
          step_attempts: 0,
          created_at: date,
          updated_at: date,
        })),
      );
    }
    return runId;
  }

  it('counts all-time runs once using pending precedence and recorded terminal outcomes', async function () {
    await insertRun(automationId, ['finished', 'pending', 'pending']);
    await insertRun(automationId, ['failed', 'pending']);
    await insertRun(automationId, ['finished', 'finished']);
    await insertRun(automationId, ['finished']);
    for (const status of [
      'failed',
      'automation disabled',
      'member changed status',
      'member unsubscribed',
    ]) {
      await insertRun(automationId, ['finished', status]);
    }
    await insertRun(automationId, []);
    await insertRun(automationId, ['finished', 'future status']);
    await insertRun(otherId, ['pending']);
    await insertRun(otherId, ['finished']);
    const counts = await readStoredCounts();
    assert.deepEqual(counts, {
      automation_id: automationId,
      in_progress_run_count: 2,
      completed_run_count: 2,
      exited_early_run_count: 4,
      unclassified_run_count: 2,
    });
    const body = { automations: (await repository.browse({ includeStats: true })).data };
    assert.equal(
      body.automations.find((item) => item.id === automationId).stats.in_progress_run_count,
      counts.in_progress_run_count,
    );
  });

  it('moves a run from pending to completed or exited without counting its earlier finished steps twice', async function () {
    const runId = await insertRun(automationId, ['finished', 'pending']);
    assert.equal((await readStoredCounts()).in_progress_run_count, 1);
    await models.Base.knex('automation_run_steps')
      .where({ automation_run_id: runId, status: 'pending' })
      .update({ status: 'finished' });
    assert.deepEqual(await readStoredCounts(), {
      automation_id: automationId,
      ...zeroCounts,
      completed_run_count: 1,
    });
    await models.Base.knex('automation_run_steps')
      .where({ automation_run_id: runId })
      .update({ status: 'failed' });
    assert.deepEqual(await readStoredCounts(), {
      automation_id: automationId,
      ...zeroCounts,
      exited_early_run_count: 1,
    });
  });

  it('returns genuine zero counts for an automation without runs', async function () {
    assert.deepEqual(await readStoredCounts(), { automation_id: automationId, ...zeroCounts });
  });

  const window = { date_from: '2026-08-16', date_to: '2026-09-15', bucket: 'day', timezone: 'UTC' };
  async function insertEntry(id, date) {
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
