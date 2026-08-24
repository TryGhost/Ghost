import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it } from 'vitest';
import type { JobsService } from '../../../../../core/server/services/jobs-service/jobs-service';

// require() so the singletons are the same instances the code under test uses
const registerJobHandlers =
  require('../../../../../core/server/services/jobs-service/register-job-handlers').default;
const CleanTokensJob =
  require('../../../../../core/server/services/members/jobs/clean-tokens-job').default;

function createFakeJobsService() {
  const handle = sinon.stub();
  return { handle } as unknown as JobsService & { handle: sinon.SinonStub };
}

describe('registerJobHandlers', function () {
  it('registers a handler for every job type on the given jobs service', function () {
    const jobsService = createFakeJobsService();

    registerJobHandlers(jobsService);

    const registeredJobClasses = jobsService.handle.getCalls().map((call) => call.args[0]);
    assert.ok(
      registeredJobClasses.includes(CleanTokensJob),
      'clean-tokens is registered on the injected jobs service',
    );
  });
});
