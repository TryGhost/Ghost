import assert from 'node:assert/strict';
import sinon from 'sinon';
import { afterEach, describe, it } from 'vitest';
import logging from '@tryghost/logging';
import {
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
