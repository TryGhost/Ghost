import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach } from 'vitest';
import { MediaInlinerService } from '../../../../../core/server/services/media-inliner/media-inliner-service';
import ExternalMediaInlinerJob from '../../../../../core/server/services/media-inliner/jobs/external-media-inliner-job';

const DEFAULT_DOMAINS = ['https://s3.amazonaws.com/revue', 'https://substackcdn.com'];

describe('MediaInlinerService', function () {
  let dispatch: sinon.SinonStub;
  let service: MediaInlinerService;

  beforeEach(function () {
    dispatch = sinon.stub().resolves();
    service = new MediaInlinerService({ jobsService: { dispatch } });
  });

  function dispatchedJob(): ExternalMediaInlinerJob {
    assert.equal(dispatch.calledOnce, true);
    const job = dispatch.firstCall.args[0];
    assert.ok(job instanceof ExternalMediaInlinerJob);
    return job;
  }

  it('dispatches an external-media-inliner job for the given domains', async function () {
    await service.startMediaInliner(['https://example.com']);

    assert.deepEqual(dispatchedJob().domains, ['https://example.com']);
  });

  it('falls back to the default domains when none are given', async function () {
    await service.startMediaInliner();

    assert.deepEqual(dispatchedJob().domains, DEFAULT_DOMAINS);
  });

  it('falls back to the default domains when the list is empty', async function () {
    await service.startMediaInliner([]);

    assert.deepEqual(dispatchedJob().domains, DEFAULT_DOMAINS);
  });

  it('reports success to the caller once the job is dispatched', async function () {
    assert.deepEqual(await service.startMediaInliner(['https://example.com']), {
      status: 'success',
    });
  });
});
