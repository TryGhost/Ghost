import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, afterEach } from 'vitest';
import type { JobsService } from '../../../../../core/server/services/jobs-service/jobs-service';

// require() so the singletons are the same instances the code under test uses
const registerJobHandlers =
  require('../../../../../core/server/services/jobs-service/register-job-handlers').default;
const CleanTokensJob =
  require('../../../../../core/server/services/members/jobs/clean-tokens-job').default;
const ExternalMediaInlinerJob =
  require('../../../../../core/server/services/media-inliner/external-media-inliner-job').default;
const mediaInlinerService = require('../../../../../core/server/services/media-inliner');

type Handler = (job: unknown) => Promise<void>;

function createFakeJobsService() {
  const handlers = new Map<unknown, Handler>();
  const handle = sinon.stub().callsFake((JobClass: unknown, handler: Handler) => {
    handlers.set(JobClass, handler);
  });
  return {
    jobsService: { handle } as unknown as JobsService,
    handlerFor: (JobClass: unknown) => handlers.get(JobClass),
  };
}

describe('registerJobHandlers', function () {
  const originalInliner = mediaInlinerService.inliner;

  afterEach(function () {
    mediaInlinerService.inliner = originalInliner;
    sinon.restore();
  });

  it('registers a handler for every job type on the given jobs service', function () {
    const { jobsService, handlerFor } = createFakeJobsService();

    registerJobHandlers(jobsService);

    assert.ok(handlerFor(CleanTokensJob), 'clean-tokens is registered');
    assert.ok(handlerFor(ExternalMediaInlinerJob), 'external-media-inliner is registered');
  });

  describe('external-media-inliner handler', function () {
    it('inlines the domains carried by the job', async function () {
      const inline = sinon.stub().resolves();
      mediaInlinerService.inliner = { inline };
      const { jobsService, handlerFor } = createFakeJobsService();
      registerJobHandlers(jobsService);

      await handlerFor(ExternalMediaInlinerJob)!(
        new ExternalMediaInlinerJob({ domains: ['https://example.com'] }),
      );

      sinon.assert.calledOnceWithExactly(inline, ['https://example.com']);
    });

    it('throws when the media-inliner service has not been initialised', async function () {
      mediaInlinerService.inliner = undefined;
      const { jobsService, handlerFor } = createFakeJobsService();
      registerJobHandlers(jobsService);

      await assert.rejects(
        () => handlerFor(ExternalMediaInlinerJob)!(new ExternalMediaInlinerJob({ domains: [] })),
        /media-inliner service used before init/,
      );
    });
  });
});
