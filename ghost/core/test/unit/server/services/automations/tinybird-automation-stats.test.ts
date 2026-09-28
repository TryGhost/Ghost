import assert from 'node:assert/strict';
import sinon from 'sinon';
import { afterEach, describe, it } from 'vitest';
import logging from '@tryghost/logging';
import {
  fetchAutomationStats,
  fetchAutomationPerformanceStats,
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

describe('fetchAutomationPerformanceStats', function () {
  afterEach(() => sinon.restore());

  const row = (date: string, completed: unknown = 1) => ({
    date,
    in_progress_run_count: 0,
    completed_run_count: completed,
    exited_early_run_count: 0,
    invalid_run_count: 0,
  });

  it('derives the ordered chart and all three totals from one query', async function () {
    const client = clientReturning([
      { ...row('2026-09-14', '3'), in_progress_run_count: '2', exited_early_run_count: '6' },
      row('2020-01-01', 2),
    ]);
    assert.deepEqual(await fetchAutomationPerformanceStats(client, 'selected'), {
      total_run_count: 13,
      in_progress_run_count: 2,
      completed_run_count: 5,
      exited_early_run_count: 6,
      entries: [
        { date: '2020-01-01', count: 2 },
        { date: '2026-09-14', count: 11 },
      ],
    });
    sinon.assert.calledOnceWithExactly(client.fetch, 'api_automation_performance_stats', {
      version: '',
      automationId: 'selected',
    });
  });

  it('returns zero for a successful empty history', async function () {
    assert.deepEqual(await fetchAutomationPerformanceStats(clientReturning([]), 'selected'), {
      total_run_count: 0,
      in_progress_run_count: 0,
      completed_run_count: 0,
      exited_early_run_count: 0,
      entries: [],
    });
  });

  it.each([
    { name: 'missing response', rows: null },
    { name: 'invalid date', rows: [row('2026-02-30')] },
    { name: 'negative count', rows: [row('2026-09-01', -1)] },
    { name: 'null count', rows: [row('2026-09-01', null)] },
    { name: 'fractional count', rows: [row('2026-09-01', 1.5)] },
    { name: 'duplicate day', rows: [row('2026-09-01'), row('2026-09-01', 2)] },
    { name: 'unsafe total', rows: [row('2026-09-01', Number.MAX_SAFE_INTEGER), row('2026-09-02')] },
    { name: 'unexpected step status', rows: [{ ...row('2026-09-01'), invalid_run_count: 1 }] },
    {
      name: 'unexpected status alongside pending',
      rows: [{ ...row('2026-09-01'), in_progress_run_count: 1, invalid_run_count: 1 }],
    },
  ])('rejects and logs $name instead of serving partial statistics', async function ({ rows }) {
    const error = sinon.stub(logging, 'error');
    assert.equal(await fetchAutomationPerformanceStats(clientReturning(rows), 'selected'), null);
    sinon.assert.calledOnce(error);
  });

  it('returns null when Tinybird fails', async function () {
    sinon.stub(logging, 'error');
    const client = { fetch: sinon.stub().rejects(new Error('unavailable')) };
    assert.equal(await fetchAutomationPerformanceStats(client, 'selected'), null);
  });
});
