import assert from 'node:assert/strict';
import sinon from 'sinon';
import EmailAnalyticsFetchLatestJob from '../../../../core/server/services/email-analytics/jobs/email-analytics-fetch-latest-job';

const logging = require('@tryghost/logging');
const { agentProvider } = require('../../../utils/e2e-framework');
const { getInstance: getJobsService } = require('../../../../core/server/services/jobs-service');

async function waitFor(
  check: () => Promise<boolean>,
  { timeoutMs = 5000, intervalMs = 25 } = {},
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) {
      return true;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
  return false;
}

describe('Job: Email analytics fetch latest', function () {
  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
  });

  afterEach(function () {
    sinon.restore();
  });

  it('runs the newsletters analytics fetch through the jobs service', async function () {
    const loggingInfoSpy = sinon.spy(logging, 'info');

    await getJobsService().dispatch(new EmailAnalyticsFetchLatestJob());

    // Mailgun is not configured in tests, so the fetch completes with zero events.
    const fetchCompleted = await waitFor(async () => {
      return loggingInfoSpy.getCalls().some((call) => {
        return /^\[Background Job\] email-analytics-fetch-latest completed in \d+ms with 0 events/.test(
          String(call.args[0]),
        );
      });
    });
    assert.ok(fetchCompleted, 'The dispatched job runs the newsletters fetch to completion');

    const lifecycleLogged = await waitFor(async () => {
      return loggingInfoSpy.getCalls().some((call) => {
        return (
          call.args[0]?.system?.event === 'job.completed' &&
          call.args[0]?.system?.job_type === 'email-analytics-fetch-latest'
        );
      });
    });
    assert.ok(lifecycleLogged, 'The jobs service logs a structured job.completed lifecycle event');
  });
});
