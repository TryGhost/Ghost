import assert from 'node:assert/strict';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';
import logging from '@tryghost/logging';
import { fetchAutomationRuns } from '../../../../../core/server/services/automations/tinybird-automation-stats';

const row = {
  id: 'run',
  created_at: '2026-09-14T12:00:00.123Z',
  status: 'completed',
  failed: false,
};
const clientReturning = (value: unknown) => ({ fetch: sinon.stub().resolves(value) });

describe('fetchAutomationRuns', () => {
  beforeEach(() => sinon.stub(logging, 'error'));
  afterEach(() => sinon.restore());

  it('preserves server order and normalizes timestamps', async () => {
    const rows = [row, { ...row, id: 'older', created_at: '2026-09-13T12:00:00Z' }];
    const client = clientReturning(rows);
    assert.deepEqual(await fetchAutomationRuns(client, 'selected'), [
      row,
      { ...rows[1], created_at: '2026-09-13T12:00:00.000Z' },
    ]);
    assert.ok(
      client.fetch.calledOnceWithExactly('api_automation_runs', {
        version: '',
        automationId: 'selected',
        runStatus: undefined,
        sortDirection: 'desc',
        limit: 50,
      }),
    );
  });

  it.each([0, 50])('accepts %i runs', async (count) => {
    const rows = Array.from({ length: count }, (_, i) => ({
      ...row,
      id: String(100 - i).padStart(3, '0'),
    }));
    assert.deepEqual(await fetchAutomationRuns(clientReturning(rows), 'selected'), rows);
  });

  it.each([
    { name: 'missing response', rows: null },
    { name: 'missing ID', rows: [{ ...row, id: undefined }] },
    { name: 'empty ID', rows: [{ ...row, id: '' }] },
    { name: 'invalid recorded steps', rows: [{ ...row, status: 'invalid' }] },
    { name: 'unknown status', rows: [{ ...row, status: 'future' }] },
    { name: 'invalid date', rows: [{ ...row, created_at: 'invalid' }] },
    { name: 'missing failure flag', rows: [{ ...row, failed: undefined }] },
    { name: 'invalid failure flag', rows: [{ ...row, failed: 'yes' }] },
    { name: 'duplicate IDs', rows: [row, row] },
    {
      name: 'out of order',
      rows: [row, { ...row, id: 'newer', created_at: '2026-09-15T12:00:00.000Z' }],
    },
    {
      name: 'more than fifty runs',
      rows: Array.from({ length: 51 }, (_, i) => ({
        ...row,
        id: String(100 - i).padStart(3, '0'),
      })),
    },
  ])('rejects $name', async ({ rows }) => {
    assert.equal(await fetchAutomationRuns(clientReturning(rows), 'selected'), null);
  });

  it.each(['in_progress', 'completed'])('rejects a failure flag on a %s run', async (status) => {
    assert.equal(
      await fetchAutomationRuns(clientReturning([{ ...row, status, failed: true }]), 'selected'),
      null,
    );
  });

  it('accepts an exited run with a failure flag', async () => {
    const failed = { ...row, status: 'exited_early', failed: true };
    assert.deepEqual(await fetchAutomationRuns(clientReturning([failed]), 'selected'), [failed]);
  });

  it.each(['in_progress', 'completed', 'exited_early'] as const)(
    'forwards the %s filter and accepts matching rows',
    async (status) => {
      const matching = { ...row, status };
      const client = clientReturning([matching]);
      assert.deepEqual(
        await fetchAutomationRuns(client, 'selected', { direction: 'desc', limit: 50, status }),
        [matching],
      );
      assert.ok(
        client.fetch.calledOnceWithExactly('api_automation_runs', {
          version: '',
          automationId: 'selected',
          runStatus: status,
          sortDirection: 'desc',
          limit: 50,
        }),
      );
    },
  );

  it('rejects rows that do not match the requested status', async () => {
    assert.equal(
      await fetchAutomationRuns(clientReturning([row]), 'selected', {
        direction: 'desc',
        limit: 50,
        status: 'in_progress',
      }),
      null,
    );
  });

  it('forwards local date boundaries alongside the status filter', async () => {
    const client = clientReturning([row]);
    const options = { dateFrom: '2026-09-14', dateTo: '2026-09-15', timezone: 'America/New_York' };
    assert.deepEqual(
      await fetchAutomationRuns(client, 'selected', {
        ...options,
        status: 'completed',
        direction: 'desc',
        limit: 50,
      }),
      [row],
    );
    assert.ok(
      client.fetch.calledOnceWithExactly('api_automation_runs', {
        version: '',
        automationId: 'selected',
        runStatus: 'completed',
        sortDirection: 'desc',
        limit: 50,
        ...options,
      }),
    );
  });
  it.each(['asc', 'desc'] as const)(
    'continues strictly after the cursor in %s order',
    async (direction) => {
      const after = { ...row, id: 'run-2' };
      const next = { ...row, id: direction === 'asc' ? 'run-3' : 'run-1' };
      const client = clientReturning([next]);
      const options = { direction, limit: 2, after };
      assert.deepEqual(await fetchAutomationRuns(client, 'selected', options), [next]);
      assert.equal(client.fetch.firstCall.args[1].afterId, 'run-2');
      assert.equal(client.fetch.firstCall.args[1].afterCreatedAt, row.created_at);
      assert.equal(await fetchAutomationRuns(clientReturning([after]), 'selected', options), null);
      const previous = { ...row, id: direction === 'asc' ? 'run-1' : 'run-3' };
      assert.equal(
        await fetchAutomationRuns(clientReturning([previous]), 'selected', options),
        null,
      );
    },
  );

  it.each(['asc', 'desc'] as const)(
    'enforces the requested page size in %s order',
    async (direction) => {
      const rows = ['run-1', 'run-2', 'run-3'].map((id) => ({ ...row, id }));
      if (direction === 'desc') {
        rows.reverse();
      }
      const options = { direction, limit: 2 };
      assert.deepEqual(
        await fetchAutomationRuns(clientReturning(rows.slice(0, 2)), 'selected', options),
        rows.slice(0, 2),
      );
      assert.equal(await fetchAutomationRuns(clientReturning(rows), 'selected', options), null);
    },
  );

  it('returns null when the client throws', async () => {
    const client = { fetch: sinon.stub().rejects(new Error('Unavailable')) };
    assert.equal(await fetchAutomationRuns(client, 'selected'), null);
  });
});
