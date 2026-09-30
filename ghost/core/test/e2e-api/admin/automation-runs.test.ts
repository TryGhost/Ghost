import assert from 'node:assert/strict';
import { afterEach, beforeAll, beforeEach, describe, it } from 'vitest';
import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import nock from 'nock';
import ObjectId from 'bson-objectid';
const models = require('../../../core/server/models');
const TinybirdServiceWrapper = require('../../../core/server/services/tinybird');
const configUtils = require('../../utils/config-utils');
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';
const {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} = require('../../utils/automations-fixtures');

const runId = () => ObjectId().toHexString();
const timestamp = '2026-09-14T12:00:00.123Z';

describe('Automation runs API', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let automationId: string;
  let memberIds: string[];
  let queries: { sql: string; bindings: unknown[] }[];
  const captureQuery = (query: { sql: string; bindings: unknown[] }) => queries.push(query);

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    await setupAutomationsFixture();
    automationId = (await models.Base.knex('automations').first('id')).id;
    memberIds = [];
    queries = [];
    mockManager.mockLabsDisabled('automationsTinybirdSync');
    sinon.stub(logging, 'error');
  });

  afterEach(async function () {
    models.Base.knex.removeListener('query', captureQuery);
    sinon.restore();
    nock.cleanAll();
    mockManager.restore();
    await cleanupAutomationsFixture();
    await models.Base.knex('members').whereIn('id', memberIds).del();
  });

  async function readPage(query = '') {
    const { body } = await agent.get(`automations/${automationId}/runs${query}`).expectStatus(200);
    return body;
  }

  async function readRuns(query = '') {
    return (await readPage(query)).automation_runs;
  }

  async function expectRunError(status: number, type: string, query = '') {
    const { body } = await agent
      .get(`automations/${automationId}/runs${query}`)
      .expectStatus(status);
    assert.equal(body.errors[0].type, type);
    assert.equal(body.automation_runs, undefined);
  }

  function captureQueries() {
    models.Base.knex.on('query', captureQuery);
  }

  function assertNoRunLookup() {
    assert.ok(
      queries.every(({ sql }) => !/\bautomation_runs\b|\bautomation_run_steps\b/.test(sql)),
    );
  }

  it('fails with Tinybird disabled without falling back to SQL', async function () {
    captureQueries();
    await expectRunError(500, 'InternalServerError');
    assertNoRunLookup();
  });

  it('returns 404 for an unknown automation', async function () {
    automationId = runId();
    await expectRunError(404, 'NotFoundError');
  });

  it.each(['unknown', '', 'completed&status=exited_early'])(
    'rejects an unsupported status (%s)',
    async function (status) {
      await expectRunError(422, 'ValidationError', `?status=${status}`);
    },
  );

  // Calendar edge cases belong to the shared parser tests; this checks API wiring.
  it('rejects an end date without a start date before querying Tinybird', async function () {
    await expectRunError(422, 'ValidationError', '?date_to=2024-03-10');
  });

  it('requires permission to read automations', async function () {
    await agent.loginAsAuthor();
    try {
      await expectRunError(403, 'NoPermissionError');
    } finally {
      await agent.loginAsOwner();
    }
  });

  describe('Tinybird', function () {
    let getToken: sinon.SinonStub;
    let siteUuid: string;
    beforeEach(async function () {
      mockManager.mockLabsEnabled('automationsTinybirdSync');
      configUtils.set('tinybird:stats', { endpoint: 'https://api.tinybird.co', version: 'v2' });
      getToken = sinon.stub().returns({ token: 'test-token' });
      sinon.stub(TinybirdServiceWrapper, 'instance').value({ getToken });
      siteUuid = (await models.Settings.findOne({ key: 'site_uuid' })).get('value');
    });
    afterEach(async function () {
      await configUtils.restore();
    });

    function mockRuns(
      status: number,
      response: nock.Body,
      runStatus?: string,
      pagination: Record<string, string | number> = {},
    ) {
      return nock('https://api.tinybird.co', { reqheaders: { authorization: 'Bearer test-token' } })
        .get('/v0/pipes/api_automation_runs.json')
        .query({
          ghost_client: 'server',
          site_uuid: siteUuid,
          automation_id: automationId,
          timezone: 'UTC',
          sort_direction: 'desc',
          limit: 51,
          ...pagination,
          ...(runStatus ? { run_status: runStatus } : {}),
        })
        .reply(status, response);
    }

    async function addMember(name: string | null) {
      const member = { id: runId(), name, email: `${runId()}@example.com` };
      memberIds.push(member.id);
      await models.Base.knex('members').insert({
        ...member,
        uuid: randomUUID(),
        transient_id: runId(),
        created_at: new Date(timestamp),
      });
      return member;
    }

    async function addRun(id: string, member: { id: string } | null, owner = automationId) {
      await models.Base.knex('automation_runs').insert({
        id,
        automation_id: owner,
        member_id: member?.id ?? null,
        member_email: 'historical@example.com',
        created_at: new Date(timestamp),
        updated_at: new Date(timestamp),
      });
    }

    it('preserves run identity and order while hydrating current member details, including repeat entries', async function () {
      const named = await addMember('Current name');
      const unnamed = await addMember(null);
      const rows = Array.from({ length: 4 }, (_, i) => ({
        id: runId(),
        created_at: timestamp,
        status: ['in_progress', 'completed', 'exited_early'][i % 3],
        failed: i === 2,
      })).sort((a, b) => b.id.localeCompare(a.id));
      for (const [i, row] of rows.entries()) {
        await addRun(row.id, i % 2 ? named : unnamed);
      }
      captureQueries();
      const request = mockRuns(200, { data: rows });
      assert.deepEqual(
        await readRuns(),
        rows.map((row, i) => ({ ...row, member: i % 2 ? named : unnamed })),
      );
      assert.ok(request.isDone());
      const runQueries = queries.filter(({ sql }) => /\bautomation_runs\b/.test(sql));
      assert.equal(runQueries.length, 1);
      assert.ok(queries.every(({ sql }) => !/\bautomation_run_steps\b/.test(sql)));
    });

    it('keeps deleted members and missing Core runs without reusing historical email', async function () {
      const member = await addMember('Deleted');
      const deletedRun = runId();
      await addRun(deletedRun, member);
      await models.Base.knex('members').where('id', member.id).del();
      const rows = [deletedRun, runId()]
        .sort()
        .reverse()
        .map((id) => ({
          id,
          created_at: timestamp,
          status: 'completed',
          failed: false,
        }));
      mockRuns(200, { data: rows });
      assert.deepEqual(
        await readRuns(),
        rows.map((row) => ({ ...row, member: null })),
      );
    });

    it('does not hydrate a member from a different automation', async function () {
      const other = await models.Base.knex('automations').whereNot('id', automationId).first('id');
      const member = await addMember('Other automation');
      const id = runId();
      await addRun(id, member, other.id);
      const row = { id, created_at: timestamp, status: 'in_progress', failed: false };
      mockRuns(200, { data: [row] });
      assert.deepEqual(await readRuns(), [{ ...row, member: null }]);
    });

    it('returns an empty page without looking up members', async function () {
      captureQueries();
      const request = mockRuns(200, { data: [] });
      const page = await readPage();
      assert.deepEqual(page.automation_runs, []);
      assert.deepEqual(page.meta.pagination, { limit: 50, next_cursor: null });
      assert.ok(request.isDone());
      assertNoRunLookup();
    });

    it('passes the status filter to Tinybird and hydrates the matching run', async function () {
      const member = await addMember('Filtered member');
      const row = { id: runId(), created_at: timestamp, status: 'exited_early', failed: true };
      await addRun(row.id, member);
      const request = mockRuns(200, { data: [row] }, 'exited_early');
      assert.deepEqual(await readRuns('?status=exited_early'), [{ ...row, member }]);
      assert.ok(request.isDone());
    });

    it('passes inclusive entry dates as exclusive local boundaries with the status filter', async function () {
      const request = mockRuns(200, { data: [] }, 'completed', {
        date_from: '2024-03-10',
        date_to: '2024-03-11',
        timezone: 'America/New_York',
      });
      assert.deepEqual(
        await readRuns(
          '?status=completed&date_from=2024-03-10&date_to=2024-03-10&timezone=America/New_York',
        ),
        [],
      );
      assert.ok(request.isDone());
    });

    it('defaults a start-only range to today in the requested timezone', async function () {
      sinon.useFakeTimers({ now: new Date('2026-09-14T01:00:00Z'), toFake: ['Date'] });
      const request = mockRuns(200, { data: [] }, undefined, {
        date_from: '2026-09-13',
        date_to: '2026-09-14',
        timezone: 'America/New_York',
      });
      assert.deepEqual(await readRuns('?date_from=2026-09-13&timezone=America/New_York'), []);
      assert.ok(request.isDone());
    });

    it.each<[number, nock.Body]>([
      [404, 'Missing pipe'],
      [503, 'Unavailable'],
      [
        200,
        { data: [{ id: 'run', created_at: timestamp, status: 'future_status', failed: false }] },
      ],
    ])(
      'returns 500 without a SQL fallback for an unavailable or invalid pipe response (%s)',
      async function (status, body) {
        captureQueries();
        const request = mockRuns(status, body);
        await expectRunError(500, 'InternalServerError');
        assert.ok(request.isDone());
        assertNoRunLookup();
      },
    );

    function pageRows(count: number, direction = 'desc') {
      return Array.from({ length: count }, () => ({
        id: runId(),
        created_at: timestamp,
        status: 'completed',
        failed: false,
      })).sort((a, b) =>
        direction === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id),
      );
    }

    it.each(['asc', 'desc'])(
      'paginates in %s order and hydrates only the visible page',
      async function (direction) {
        const rows = pageRows(51, direction);
        const member = await addMember('First page');
        const nextMember = await addMember('Next page');
        for (const [index, row] of rows.entries()) {
          await addRun(row.id, index < 50 ? member : nextMember);
        }
        const first = mockRuns(200, { data: rows }, 'completed', { sort_direction: direction });
        captureQueries();
        const query = `?status=completed&order=created_at%20${direction}`;
        const page = await readPage(query);
        assert.deepEqual(
          page.automation_runs,
          rows.slice(0, 50).map((row) => ({ ...row, member })),
        );
        assert.equal(page.meta.pagination.limit, 50);
        assert.ok(first.isDone());
        const lookups = queries.filter(({ sql }) => /\bautomation_runs\b/.test(sql));
        assert.equal(lookups.length, 1);
        assert.deepEqual(
          new Set(lookups[0].bindings),
          new Set([automationId, ...rows.slice(0, 50).map((row) => row.id)]),
        );
        const cursor = page.meta.pagination.next_cursor;
        assert.equal(typeof cursor, 'string');
        const next = mockRuns(200, { data: rows.slice(50) }, 'completed', {
          sort_direction: direction,
          after_created_at: timestamp,
          after_id: rows[49].id,
        });
        const final = await readPage(`${query}&cursor=${cursor}`);
        assert.deepEqual(final.automation_runs, [{ ...rows[50], member: nextMember }]);
        assert.equal(final.meta.pagination.next_cursor, null);
        assert.ok(next.isDone());
      },
    );

    it('does not offer a next page when exactly fifty runs remain', async function () {
      const rows = pageRows(50);
      const request = mockRuns(200, { data: rows });
      const page = await readPage();
      assert.deepEqual(
        page.automation_runs.map((run: { id: string }) => run.id),
        rows.map((run) => run.id),
      );
      assert.deepEqual(page.meta.pagination, { limit: 50, next_cursor: null });
      assert.ok(request.isDone());
    });

    it.each([false, true])(
      'preserves the first page end date across local midnight (explicit end: %s)',
      async function (explicitEnd) {
        const clock = sinon.useFakeTimers({
          now: new Date('2026-09-15T03:59:00Z'),
          toFake: ['Date'],
        });
        const rows = pageRows(51);
        const dates = {
          date_from: '2026-09-14',
          date_to: '2026-09-15',
          timezone: 'America/New_York',
        };
        const first = mockRuns(200, { data: rows }, 'completed', dates);
        const query = '?status=completed&date_from=2026-09-14&timezone=America/New_York';
        const pageOneQuery = explicitEnd ? `${query}&date_to=2026-09-14` : query;
        const page = await readPage(pageOneQuery);
        assert.ok(first.isDone());
        const cursor = page.meta.pagination.next_cursor;
        clock.setSystemTime(new Date('2026-09-15T04:01:00Z'));
        const next = mockRuns(200, { data: rows.slice(50) }, 'completed', {
          ...dates,
          after_created_at: timestamp,
          after_id: rows[49].id,
        });
        const final = await readPage(`${query}&cursor=${cursor}`);
        assert.deepEqual(
          final.automation_runs.map((run: { id: string }) => run.id),
          [rows[50].id],
        );
        assert.ok(next.isDone());
        await expectRunError(
          422,
          'ValidationError',
          `${query}&date_to=2026-09-15&cursor=${cursor}`,
        );
      },
    );

    it('rejects unsupported order and malformed cursors before querying Tinybird', async function () {
      await expectRunError(422, 'ValidationError', '?order=email');
      await expectRunError(422, 'ValidationError', '?cursor=not-a-cursor');
    });

    it('fails without a Tinybird token', async function () {
      getToken.returns(null);
      await expectRunError(500, 'InternalServerError');
    });

    it('surfaces a failed member lookup instead of reporting deleted members', async function () {
      const client: Knex.Client = models.Base.knex.client;
      const originalQuery = client.query;
      sinon.stub(client, 'query').callsFake(function (this: Knex.Client, connection, query) {
        if (/from `automation_runs`/.test(query.sql)) {
          return Promise.reject(new Error('Member lookup unavailable'));
        }
        return originalQuery.call(this, connection, query);
      });
      const request = mockRuns(200, {
        data: [{ id: runId(), created_at: timestamp, status: 'completed', failed: false }],
      });
      await expectRunError(500, 'InternalServerError');
      assert.ok(request.isDone());
    });
  });
});
