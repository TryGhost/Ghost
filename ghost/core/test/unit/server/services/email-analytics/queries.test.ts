import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';
import createKnex, { type Knex } from 'knex';
import { Queries } from '../../../../../core/server/services/email-analytics/lib/queries';

const createDatabase = async (): Promise<Knex> => {
  const database = createKnex({
    client: 'better-sqlite3',
    connection: {
      filename: ':memory:',
    },
    pool: {
      min: 1,
      max: 1,
    },
    useNullAsDefault: true,
  });

  await database.schema.createTable('jobs', (table) => {
    table.text('id').primary();
    table.text('name').notNullable().unique();
    table.text('status').notNullable().defaultTo('queued');
    table.datetime('started_at');
    table.datetime('finished_at');
    table.datetime('created_at').notNullable();
    table.datetime('updated_at');
    table.text('metadata');
    table.integer('queue_entry').unsigned();
  });

  await database.schema.createTable('emails', (table) => {
    table.text('id').primary();
    table.boolean('track_opens').notNullable().defaultTo(false);
    table.integer('delivered_count').notNullable().defaultTo(0);
    table.integer('failed_count').notNullable().defaultTo(0);
    table.integer('opened_count').notNullable().defaultTo(0);
  });

  await database.schema.createTable('members', (table) => {
    table.text('id').primary();
    table.integer('email_count').notNullable().defaultTo(0);
    table.integer('email_opened_count').notNullable().defaultTo(0);
    table.integer('email_open_rate');
  });

  await database.schema.createTable('email_recipients', (table) => {
    table.text('id').primary();
    table.text('email_id').references('id').inTable('emails');
    table.text('member_id').references('id').inTable('members');
    table.datetime('delivered_at');
    table.datetime('opened_at');
    table.datetime('failed_at');
  });

  return database;
};

describe('Email analytics queries', function () {
  let knex: Knex;
  let queries: Queries;

  const insertJob = async (attributes: Record<string, unknown> = {}) => {
    const job = {
      id: ObjectId().toHexString(),
      name: 'email-analytics-scheduled',
      status: 'queued',
      started_at: null,
      finished_at: null,
      created_at: '2026-08-11T09:00:00.000Z',
      updated_at: null,
      metadata: null,
      queue_entry: null,
      ...attributes,
    };

    await knex('jobs').insert(job);
    return job;
  };

  const insertEmail = async (id: string, trackOpens: boolean) => {
    await knex('emails').insert({ id, track_opens: trackOpens });
  };

  const insertMember = async (id: string, attributes: Record<string, unknown> = {}) => {
    await knex('members').insert({ id, ...attributes });
  };

  const insertRecipient = async (attributes: Record<string, unknown>) => {
    await knex('email_recipients').insert({
      id: ObjectId().toHexString(),
      email_id: null,
      member_id: null,
      delivered_at: null,
      opened_at: null,
      failed_at: null,
      ...attributes,
    });
  };

  beforeEach(async function () {
    knex = await createDatabase();
    queries = new Queries(knex);
  });

  afterEach(async function () {
    await knex.destroy();
  });

  describe('getLastEventTimestamp', function () {
    const cursorSeed = {
      tableName: 'email_recipients',
      eventColumns: {
        delivered: 'delivered_at',
        opened: 'opened_at',
        failed: 'failed_at',
      },
    } as const;

    it('returns stored finished timestamp without consulting recipient data', async function () {
      const finishedAt = '2026-08-11T10:00:00.000Z';
      await insertJob({
        started_at: '2026-08-11T09:00:00.000Z',
        finished_at: finishedAt,
      });
      await insertRecipient({ delivered_at: '2026-08-11T12:00:00.000Z' });

      const result = await queries.getLastEventTimestamp(
        'email-analytics-scheduled',
        ['delivered'],
        cursorSeed,
      );

      assert.equal(result?.toISOString(), finishedAt);
    });

    it('uses latest configured recipient event and creates cursor job', async function () {
      await insertRecipient({
        delivered_at: '2026-08-11T10:00:00.000Z',
        opened_at: '2026-08-11T11:00:00.000Z',
        failed_at: '2026-08-11T12:00:00.000Z',
      });

      const result = await queries.getLastEventTimestamp(
        'email-analytics-latest-others',
        ['delivered', 'opened'],
        cursorSeed,
      );

      assert.equal(result?.toISOString(), '2026-08-11T11:00:00.000Z');
      const job = await knex('jobs').where('name', 'email-analytics-latest-others').first();
      assert.equal(job.status, 'started');
    });

    it('skips events without a cursor column', async function () {
      await insertRecipient({
        delivered_at: '2026-08-11T10:00:00.000Z',
        failed_at: '2026-08-11T12:00:00.000Z',
      });

      const result = await queries.getLastEventTimestamp(
        'email-analytics-automation-latest-others',
        ['delivered', 'failed'],
        {
          tableName: 'email_recipients',
          eventColumns: { delivered: 'delivered_at' },
        },
      );

      assert.equal(result?.toISOString(), '2026-08-11T10:00:00.000Z');
    });

    it('returns null and creates cursor job when no events exist', async function () {
      const result = await queries.getLastEventTimestamp('email-analytics-missing', [], cursorSeed);

      assert.equal(result, null);
      assert(await knex('jobs').where('name', 'email-analytics-missing').first());
    });
  });

  describe('getJobData', function () {
    it('returns job data when job exists', async function () {
      const startedAt = '2026-08-11T10:00:00.000Z';
      const finishedAt = '2026-08-11T10:05:00.000Z';
      const metadata = { begin: startedAt, end: finishedAt };

      await knex('jobs').insert({
        id: ObjectId().toHexString(),
        name: 'email-analytics-scheduled',
        status: 'finished',
        started_at: startedAt,
        finished_at: finishedAt,
        created_at: startedAt,
        updated_at: finishedAt,
        metadata: JSON.stringify(metadata),
        queue_entry: 1,
      });

      const result = await queries.getJobData('email-analytics-scheduled');

      assert.deepEqual(result, {
        finished_at: finishedAt,
        started_at: startedAt,
        metadata,
      });
    });

    it('returns null when job does not exist', async function () {
      const result = await queries.getJobData('email-analytics-scheduled');

      assert.equal(result, null);
    });
  });

  describe('getLastJobRunTimestamp', function () {
    it('prefers finished timestamp over started timestamp', async function () {
      await insertJob({
        started_at: '2026-08-11T10:00:00.000Z',
        finished_at: '2026-08-11T11:00:00.000Z',
      });

      assert.equal(
        await queries.getLastJobRunTimestamp('email-analytics-scheduled'),
        '2026-08-11T11:00:00.000Z',
      );
    });

    it('falls back to started timestamp', async function () {
      await insertJob({ started_at: '2026-08-11T10:00:00.000Z' });

      assert.equal(
        await queries.getLastJobRunTimestamp('email-analytics-scheduled'),
        '2026-08-11T10:00:00.000Z',
      );
    });

    it('returns null when job or timestamps do not exist', async function () {
      assert.equal(await queries.getLastJobRunTimestamp('email-analytics-missing'), null);
      await insertJob();
      assert.equal(await queries.getLastJobRunTimestamp('email-analytics-scheduled'), null);
    });
  });

  describe('setJobTimestamp', function () {
    it('sets started timestamp and status on existing job', async function () {
      await insertJob();
      const date = new Date('2026-08-11T10:00:00.000Z');

      await queries.setJobTimestamp('email-analytics-scheduled', 'started', date);

      const job = await knex('jobs').where('name', 'email-analytics-scheduled').first();
      assert.equal(new Date(job.started_at).toISOString(), date.toISOString());
      assert.equal(job.finished_at, null);
      assert.equal(job.status, 'started');
      assert(job.updated_at);
    });

    it('sets finished timestamp and status on existing job', async function () {
      await insertJob({ started_at: '2026-08-11T10:00:00.000Z' });
      const date = new Date('2026-08-11T11:00:00.000Z');

      await queries.setJobTimestamp('email-analytics-scheduled', 'finished', date);

      const job = await knex('jobs').where('name', 'email-analytics-scheduled').first();
      assert.equal(new Date(job.finished_at).toISOString(), date.toISOString());
      assert.equal(job.status, 'finished');
    });

    it('creates missing job with created timestamp', async function () {
      const date = new Date('2026-08-11T10:00:00.000Z');

      await queries.setJobTimestamp('email-analytics-missing', 'started', date);

      const job = await knex('jobs').where('name', 'email-analytics-missing').first();
      assert.equal(new Date(job.created_at).toISOString(), date.toISOString());
      assert.equal(new Date(job.started_at).toISOString(), date.toISOString());
      assert.equal(new Date(job.updated_at).toISOString(), date.toISOString());
    });

    it('swallows database errors', async function () {
      await knex.schema.dropTable('jobs');

      await assert.doesNotReject(
        queries.setJobTimestamp('email-analytics-scheduled', 'started', new Date()),
      );
    });
  });

  describe('getJobMetadata', function () {
    it('returns parsed metadata', async function () {
      await insertJob({ metadata: JSON.stringify({ begin: 'start', end: 'finish' }) });

      assert.deepEqual(await queries.getJobMetadata('email-analytics-scheduled'), {
        begin: 'start',
        end: 'finish',
      });
    });

    it('returns null if the job does not exist', async function () {
      assert.equal(await queries.getJobMetadata('email-analytics-missing'), null);
    });

    it('returns empty metadata for missing, null, or invalid metadata', async function () {
      await insertJob();
      assert.deepEqual(await queries.getJobMetadata('email-analytics-scheduled'), {
        begin: null,
        end: null,
      });

      await knex('jobs')
        .where('name', 'email-analytics-scheduled')
        .update({ metadata: 'invalid-json' });
      assert.deepEqual(await queries.getJobMetadata('email-analytics-scheduled'), {
        begin: null,
        end: null,
      });
    });
  });

  describe('setJobMetadata', function () {
    it('updates metadata on existing job', async function () {
      await insertJob();

      await queries.setJobMetadata('email-analytics-scheduled', { begin: 'start', end: 'finish' });

      const job = await knex('jobs').where('name', 'email-analytics-scheduled').first();
      assert.equal(job.metadata, JSON.stringify({ begin: 'start', end: 'finish' }));
      assert(job.updated_at);
    });

    it('creates queued job when metadata is set for missing job', async function () {
      await queries.setJobMetadata('email-analytics-scheduled', { begin: 'start', end: 'finish' });

      const job = await knex('jobs').where('name', 'email-analytics-scheduled').first();
      assert.equal(job.status, 'queued');
      assert.equal(job.metadata, JSON.stringify({ begin: 'start', end: 'finish' }));
      assert(job.created_at);
    });

    it('clears existing metadata but does not create missing job for null', async function () {
      await insertJob({ metadata: JSON.stringify({ begin: 'start' }) });

      await queries.setJobMetadata('email-analytics-scheduled', null);
      await queries.setJobMetadata('email-analytics-missing', null);

      assert.deepEqual(await queries.getJobMetadata('email-analytics-scheduled'), {
        begin: null,
        end: null,
      });
      assert.equal(await knex('jobs').where('name', 'email-analytics-missing').first(), undefined);
    });
  });

  describe('setJobStatus', function () {
    it('updates existing job', async function () {
      await insertJob();

      await queries.setJobStatus('email-analytics-scheduled', 'finished');

      const job = await knex('jobs').where('name', 'email-analytics-scheduled').first();
      assert.equal(job.status, 'finished');
      assert(job.updated_at);
    });

    it('creates missing job', async function () {
      await queries.setJobStatus('email-analytics-scheduled', 'failed');

      const job = await knex('jobs').where('name', 'email-analytics-scheduled').first();
      assert.equal(job.status, 'failed');
      assert(job.created_at);
      assert(job.updated_at);
    });

    it('rethrows database errors', async function () {
      await knex.schema.dropTable('jobs');

      await assert.rejects(
        queries.setJobStatus('email-analytics-scheduled', 'started'),
        /no such table: jobs/,
      );
    });
  });

  describe('aggregateEmailStats', function () {
    it('updates delivered, failed, and opened counts', async function () {
      await insertEmail('email-1', true);
      await insertRecipient({ email_id: 'email-1', delivered_at: '2026-08-11T10:00:00.000Z' });
      await insertRecipient({ email_id: 'email-1', failed_at: '2026-08-11T10:00:00.000Z' });
      await insertRecipient({ email_id: 'email-1', opened_at: '2026-08-11T10:00:00.000Z' });
      await insertRecipient({
        email_id: 'email-1',
        delivered_at: '2026-08-11T10:00:00.000Z',
        failed_at: '2026-08-11T10:00:00.000Z',
      });
      await insertEmail('email-2', true);
      await insertRecipient({ email_id: 'email-2', delivered_at: '2026-08-11T10:00:00.000Z' });

      await queries.aggregateEmailStats('email-1', true);

      const email = await knex('emails').where('id', 'email-1').first();
      assert.deepEqual(
        {
          delivered_count: email.delivered_count,
          failed_count: email.failed_count,
          opened_count: email.opened_count,
        },
        {
          delivered_count: 2,
          failed_count: 2,
          opened_count: 1,
        },
      );
    });

    it('preserves opened count when opened aggregation is disabled', async function () {
      await insertEmail('email-1', true);
      await knex('emails').where('id', 'email-1').update({ opened_count: 7 });
      await insertRecipient({ email_id: 'email-1', opened_at: '2026-08-11T10:00:00.000Z' });

      await queries.aggregateEmailStats('email-1', false);

      const email = await knex('emails').where('id', 'email-1').first();
      assert.equal(email.opened_count, 7);
      assert.equal(email.delivered_count, 0);
      assert.equal(email.failed_count, 0);
    });

    it('does nothing when email does not exist', async function () {
      await assert.doesNotReject(queries.aggregateEmailStats('missing-email', true));
    });
  });

  describe('aggregateMemberStats', function () {
    it('updates counts and calculates open rate after five tracked emails', async function () {
      await insertMember('member-1');
      await insertEmail('tracked-email', true);
      for (let index = 0; index < 5; index += 1) {
        await insertRecipient({
          email_id: 'tracked-email',
          member_id: 'member-1',
          opened_at: index < 2 ? '2026-08-11T10:00:00.000Z' : null,
        });
      }

      await queries.aggregateMemberStats('member-1');

      const member = await knex('members').where('id', 'member-1').first();
      assert.equal(member.email_count, 5);
      assert.equal(member.email_opened_count, 2);
      assert.equal(member.email_open_rate, 40);
    });

    it('counts untracked emails but preserves open rate below threshold', async function () {
      await insertMember('member-1', { email_open_rate: 75 });
      await insertEmail('tracked-email', true);
      await insertEmail('untracked-email', false);
      await insertRecipient({
        email_id: 'tracked-email',
        member_id: 'member-1',
        opened_at: '2026-08-11T10:00:00.000Z',
      });
      await insertRecipient({ email_id: 'untracked-email', member_id: 'member-1' });

      await queries.aggregateMemberStats('member-1');

      const member = await knex('members').where('id', 'member-1').first();
      assert.equal(member.email_count, 2);
      assert.equal(member.email_opened_count, 1);
      assert.equal(member.email_open_rate, 75);
    });

    it('resets counts for member without recipients', async function () {
      await insertMember('member-1', {
        email_count: 10,
        email_opened_count: 4,
        email_open_rate: 40,
      });

      await queries.aggregateMemberStats('member-1');

      const member = await knex('members').where('id', 'member-1').first();
      assert.equal(member.email_count, 0);
      assert.equal(member.email_opened_count, 0);
      assert.equal(member.email_open_rate, 40);
    });

    it('does nothing when member does not exist', async function () {
      await assert.doesNotReject(queries.aggregateMemberStats('missing-member'));
    });
  });

  describe('aggregateMemberStatsBatch', function () {
    it('updates multiple members, including below-threshold and empty members', async function () {
      await insertMember('member-1');
      await insertMember('member-2', { email_open_rate: 80 });
      await insertMember('member-3', {
        email_count: 4,
        email_opened_count: 3,
        email_open_rate: 75,
      });
      await insertMember('untouched-member', {
        email_count: 9,
        email_opened_count: 8,
        email_open_rate: 89,
      });
      await insertEmail('tracked-email', true);

      for (let index = 0; index < 5; index += 1) {
        await insertRecipient({
          email_id: 'tracked-email',
          member_id: 'member-1',
          opened_at: index < 2 ? '2026-08-11T10:00:00.000Z' : null,
        });
      }
      await insertRecipient({
        email_id: 'tracked-email',
        member_id: 'member-2',
        opened_at: '2026-08-11T10:00:00.000Z',
      });

      await queries.aggregateMemberStatsBatch(['member-1', 'member-2', 'member-3']);

      const members = await knex('members').orderBy('id');
      assert.deepEqual(members, [
        {
          id: 'member-1',
          email_count: 5,
          email_opened_count: 2,
          email_open_rate: 40,
        },
        {
          id: 'member-2',
          email_count: 1,
          email_opened_count: 1,
          email_open_rate: null,
        },
        {
          id: 'member-3',
          email_count: 0,
          email_opened_count: 0,
          email_open_rate: null,
        },
        {
          id: 'untouched-member',
          email_count: 9,
          email_opened_count: 8,
          email_open_rate: 89,
        },
      ]);
    });

    it('returns without querying for empty member list', async function () {
      await knex.schema.dropTable('email_recipients');

      await assert.doesNotReject(queries.aggregateMemberStatsBatch([]));
    });

    it('ignores missing member IDs', async function () {
      await assert.doesNotReject(queries.aggregateMemberStatsBatch(['missing-member']));
    });
  });
});
