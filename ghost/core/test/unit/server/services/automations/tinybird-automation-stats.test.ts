import assert from 'node:assert/strict';
import sinon from 'sinon';
import { afterEach, describe, it } from 'vitest';
import logging from '@tryghost/logging';
import {
  type AutomationRunPosition,
  compareRuns,
  fetchAutomationRuns,
  fetchAutomationStats,
  fetchAutomationEntryStats,
} from '../../../../../core/server/services/automations/tinybird-automation-stats';

const clientReturning = (value: unknown) => ({ fetch: sinon.stub().resolves(value) });

describe('fetchAutomationStats', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('reads the automation browse stats pipe', async function () {
    const client = clientReturning([]);

    await fetchAutomationStats(client);

    assert.ok(client.fetch.calledOnceWithExactly('api_automation_browse_stats', { version: '' }));
  });

  it('maps rows by automation id, parsing UTC dates and numeric strings', async function () {
    const client = clientReturning([
      {
        automation_id: 'automation-1',
        last_run_created_at: '2026-02-01T01:00:00.000Z',
        total_run_count: '4',
        in_progress_run_count: 2,
      },
      {
        automation_id: 'automation-2',
        last_run_created_at: null,
        total_run_count: 0,
        in_progress_run_count: 0,
      },
    ]);

    const stats = await fetchAutomationStats(client);

    assert.ok(stats);
    assert.deepEqual(stats.get('automation-1'), {
      last_run_created_at: new Date('2026-02-01T01:00:00.000Z'),
      total_run_count: 4,
      in_progress_run_count: 2,
    });
    assert.deepEqual(stats.get('automation-2'), {
      last_run_created_at: null,
      total_run_count: 0,
      in_progress_run_count: 0,
    });
  });

  it('returns null when the client could not fetch', async function () {
    assert.equal(await fetchAutomationStats(clientReturning(null)), null);
  });

  it('returns null and logs when the response has an unexpected shape', async function () {
    const error = sinon.stub(logging, 'error');

    const stats = await fetchAutomationStats(clientReturning([{ automation_id: 42 }]));

    assert.equal(stats, null);
    assert.ok(error.calledOnce);
  });
  it.each([
    { last_run_created_at: 'invalid' },
    { last_run_created_at: '2026-02-01 01:00:00' },
    { last_run_created_at: '2026-02-30T01:00:00.000Z' },
    { total_run_count: null },
    { total_run_count: -1 },
    { in_progress_run_count: 1.5 },
  ])('rejects invalid stats: %j', async function (overrides) {
    sinon.stub(logging, 'error');
    const stats = await fetchAutomationStats(
      clientReturning([
        {
          automation_id: 'automation-1',
          last_run_created_at: '2026-02-01T01:00:00.000Z',
          total_run_count: 4,
          in_progress_run_count: 2,
          ...overrides,
        },
      ]),
    );
    assert.equal(stats, null);
  });
});

describe('fetchAutomationEntryStats', function () {
  afterEach(() => sinon.restore());

  it('derives the total and ordered daily counts from one all-time query', async function () {
    const client = clientReturning([
      { date: '2026-09-14', count: '11' },
      { date: '2020-01-01', count: 2 },
    ]);
    assert.deepEqual(await fetchAutomationEntryStats(client, 'selected'), {
      total_run_count: 13,
      entries: [
        { date: '2020-01-01', count: 2 },
        { date: '2026-09-14', count: 11 },
      ],
    });
    sinon.assert.calledOnceWithExactly(client.fetch, 'api_automation_entry_stats', {
      version: '',
      automationId: 'selected',
    });
  });

  it('passes exclusive range bounds and timezone to the same entry query', async function () {
    const client = clientReturning([{ date: '2024-03-10', count: 2 }]);
    const options = { dateFrom: '2024-03-10', dateTo: '2024-03-11', timezone: 'America/New_York' };
    assert.equal(
      (await fetchAutomationEntryStats(client, 'selected', options))?.total_run_count,
      2,
    );
    sinon.assert.calledOnceWithExactly(client.fetch, 'api_automation_entry_stats', {
      version: '',
      automationId: 'selected',
      ...options,
    });
  });

  it('returns zero for a successful empty history', async function () {
    assert.deepEqual(await fetchAutomationEntryStats(clientReturning([]), 'selected'), {
      total_run_count: 0,
      entries: [],
    });
  });

  it.each([
    { name: 'missing response', rows: null },
    { name: 'invalid date', rows: [{ date: '2026-02-30', count: 1 }] },
    { name: 'negative count', rows: [{ date: '2026-09-01', count: -1 }] },
    { name: 'null count', rows: [{ date: '2026-09-01', count: null }] },
    { name: 'fractional count', rows: [{ date: '2026-09-01', count: 1.5 }] },
    {
      name: 'duplicate day',
      rows: [
        { date: '2026-09-01', count: 1 },
        { date: '2026-09-01', count: 2 },
      ],
    },
    {
      name: 'unsafe total',
      rows: [
        { date: '2026-09-01', count: Number.MAX_SAFE_INTEGER },
        { date: '2026-09-02', count: 1 },
      ],
    },
  ])('rejects and logs $name', async function ({ rows }) {
    const error = sinon.stub(logging, 'error');
    assert.equal(await fetchAutomationEntryStats(clientReturning(rows), 'selected'), null);
    sinon.assert.calledOnce(error);
  });

  it('returns null when Tinybird fails', async function () {
    sinon.stub(logging, 'error');
    const client = { fetch: sinon.stub().rejects(new Error('unavailable')) };
    assert.equal(await fetchAutomationEntryStats(client, 'selected'), null);
  });
});

describe('compareRuns', function () {
  const older = { id: 'b', created_at: '2026-09-13T12:00:00.000Z' };
  const newer = { id: 'a', created_at: '2026-09-14T12:00:00.000Z' };
  const newerTie = { id: 'b', created_at: '2026-09-14T12:00:00.000Z' };

  it('orders by entry time before run ID', function () {
    assert.equal(compareRuns(older, newer), -1);
    assert.equal(compareRuns(newer, older), 1);
  });

  it('breaks equal entry times by run ID and reports identity as equal', function () {
    assert.equal(compareRuns(newer, newerTie), -1);
    assert.equal(compareRuns(newerTie, newer), 1);
    assert.equal(compareRuns(newer, { ...newer }), 0);
  });
});

describe('fetchAutomationRuns', function () {
  afterEach(function () {
    sinon.restore();
  });

  const row = (
    id: string,
    created_at: string,
    status: AutomationRunPosition['status'] = 'completed',
  ) => ({
    id,
    created_at,
    status,
    failed: false,
  });
  const newest = row('run-3', '2026-09-14T12:00:00.000Z');
  const tieHigh = row('run-2', '2026-09-13T12:00:00.000Z');
  const tieLow = row('run-1', '2026-09-13T12:00:00.000Z');

  it('passes the status filter and direction to the pipe', async function () {
    const client = clientReturning([]);
    await fetchAutomationRuns(client, 'automation-1', {
      status: 'completed',
      direction: 'asc',
      limit: 10,
    });
    assert.ok(
      client.fetch.calledOnceWithExactly('api_automation_runs', {
        version: '',
        automationId: 'automation-1',
        runStatus: 'completed',
        sortDirection: 'asc',
        limit: 10,
      }),
    );
  });

  it('accepts rows ordered by entry time then ID in either direction', async function () {
    assert.deepEqual(
      await fetchAutomationRuns(clientReturning([newest, tieHigh, tieLow]), 'a', {
        direction: 'desc',
        limit: 10,
      }),
      [newest, tieHigh, tieLow],
    );
    assert.deepEqual(
      await fetchAutomationRuns(clientReturning([tieLow, tieHigh, newest]), 'a', {
        direction: 'asc',
        limit: 10,
      }),
      [tieLow, tieHigh, newest],
    );
  });

  it('passes a cursor position and accepts rows strictly after it', async function () {
    const client = clientReturning([tieLow]);
    const rows = await fetchAutomationRuns(client, 'a', {
      direction: 'desc',
      limit: 10,
      after: tieHigh,
    });
    assert.deepEqual(rows, [tieLow]);
    assert.deepEqual(client.fetch.firstCall.args[1], {
      version: '',
      automationId: 'a',
      runStatus: undefined,
      sortDirection: 'desc',
      limit: 10,
      afterCreatedAt: tieHigh.created_at,
      afterId: tieHigh.id,
    });
  });

  it('normalises timestamps before comparing them', async function () {
    const rows = await fetchAutomationRuns(
      clientReturning([
        row('run-2', '2026-09-14T12:00:00Z'),
        row('run-1', '2026-09-14T12:00:00.000Z'),
      ]),
      'a',
      { direction: 'desc', limit: 10 },
    );
    assert.deepEqual(
      rows?.map((run) => run.created_at),
      ['2026-09-14T12:00:00.000Z', '2026-09-14T12:00:00.000Z'],
    );
  });

  for (const [label, direction, rows] of [
    ['rows in the opposite direction', 'desc', [tieLow, newest]],
    ['ties out of ID order', 'desc', [tieLow, tieHigh]],
    ['ties out of ID order ascending', 'asc', [tieHigh, tieLow]],
    ['a repeated run', 'desc', [newest, newest]],
    ['a row outside the status filter', 'desc', [row('run-9', newest.created_at, 'in_progress')]],
    ['more rows than the limit', 'desc', [newest, tieHigh, tieLow]],
  ] as const) {
    it(`rejects ${label}`, async function () {
      sinon.stub(logging, 'error');
      const result = await fetchAutomationRuns(clientReturning(rows), 'a', {
        direction,
        status: 'completed',
        limit: 2,
      });
      assert.equal(result, null);
    });
  }

  for (const [label, rows] of [
    ['repeats the cursor position', [tieHigh]],
    ['precedes the cursor position', [newest]],
  ] as const) {
    it(`rejects a continuation that ${label}`, async function () {
      sinon.stub(logging, 'error');
      const result = await fetchAutomationRuns(clientReturning(rows), 'a', {
        direction: 'desc',
        limit: 10,
        after: tieHigh,
      });
      assert.equal(result, null);
    });
  }
});
