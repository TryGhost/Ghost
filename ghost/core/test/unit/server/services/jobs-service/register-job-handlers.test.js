const assert = require('node:assert/strict');
const sinon = require('sinon');

const jobsService = require('../../../../../core/server/services/jobs-service');
const registerJobHandlers =
  require('../../../../../core/server/services/jobs-service/register-job-handlers').default;
const mediaInlinerService = require('../../../../../core/server/services/media-inliner');
const MediaInlinerJob =
  require('../../../../../core/server/services/media-inliner/media-inliner-job').default;

function flush() {
  return new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
}

describe('register-job-handlers', function () {
  let inlineStub;
  let service;

  beforeEach(async function () {
    inlineStub = sinon.stub(mediaInlinerService, 'inline').resolves();

    service = jobsService.init();
    registerJobHandlers();
    await service.start();
  });

  afterEach(async function () {
    await jobsService.shutdown({ timeoutMs: 1000 });
    sinon.restore();
  });

  it('wires the media-inliner handler: dispatching MediaInlinerJob runs the inliner with round-tripped domains', async function () {
    const domains = ['https://a.example', 'https://b.example'];

    await service.dispatch(new MediaInlinerJob({ domains }));
    await flush();

    assert.ok(inlineStub.calledOnceWithExactly(domains));
  });
});
