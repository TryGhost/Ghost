import assert from 'node:assert/strict';
import sinon from 'sinon';
import { afterEach, describe, it } from 'vitest';
import logging from '@tryghost/logging';
import { fetchAutomationStats } from '../../../../../core/server/services/automations/tinybird-automation-stats';

const clientReturning = (value: unknown) => ({ fetch: sinon.stub().resolves(value) });

describe('fetchAutomationStats', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('reads the automation browse stats pipe', async function () {
    const client = clientReturning([]);

    await fetchAutomationStats(client);

    assert.ok(client.fetch.calledOnceWithExactly('api_automation_browse_stats'));
  });

  it('maps rows by automation id, parsing UTC dates and numeric strings', async function () {
    const client = clientReturning([
      {
        automation_id: 'automation-1',
        last_run_created_at: '2026-02-01 01:00:00',
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
});
