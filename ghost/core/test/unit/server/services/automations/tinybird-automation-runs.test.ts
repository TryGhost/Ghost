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
      }),
    );
  });

  it.each([0, 50])('accepts %i runs', async (count) => {
    const rows = Array.from({ length: count }, (_, i) => ({ ...row, id: String(i) }));
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
      name: 'more than fifty runs',
      rows: Array.from({ length: 51 }, (_, i) => ({ ...row, id: String(i) })),
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
      assert.deepEqual(await fetchAutomationRuns(client, 'selected', status), [matching]);
      assert.ok(
        client.fetch.calledOnceWithExactly('api_automation_runs', {
          version: '',
          automationId: 'selected',
          runStatus: status,
        }),
      );
    },
  );

  it('rejects rows that do not match the requested status', async () => {
    assert.equal(
      await fetchAutomationRuns(clientReturning([row]), 'selected', 'in_progress'),
      null,
    );
  });

  it('forwards local date boundaries alongside the status filter', async () => {
    const client = clientReturning([row]);
    const options = { dateFrom: '2026-09-14', dateTo: '2026-09-15', timezone: 'America/New_York' };
    assert.deepEqual(await fetchAutomationRuns(client, 'selected', 'completed', options), [row]);
    assert.ok(
      client.fetch.calledOnceWithExactly('api_automation_runs', {
        version: '',
        automationId: 'selected',
        runStatus: 'completed',
        ...options,
      }),
    );
  });

  it('returns null when the client throws', async () => {
    const client = { fetch: sinon.stub().rejects(new Error('Unavailable')) };
    assert.equal(await fetchAutomationRuns(client, 'selected'), null);
  });
});
