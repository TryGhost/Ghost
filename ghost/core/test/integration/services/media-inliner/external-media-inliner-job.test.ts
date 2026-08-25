import { describe, it, beforeAll, afterAll } from 'vitest';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import nock from 'nock';

const logging = require('@tryghost/logging');
const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const { getInstance: getJobsService } = require('../../../../core/server/services/jobs-service');
const ExternalMediaInlinerJob =
  require('../../../../core/server/services/media-inliner/external-media-inliner-job').default;

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

describe('Job: External media inliner', function () {
  beforeAll(async function () {
    const agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('posts');
    await agent.loginAsOwner();
  });

  afterAll(function () {
    sinon.restore();
    nock.cleanAll();
  });

  it('inlines external media when the dispatched job runs', async function () {
    const GIF1x1 = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
    nock('https://external-media.example.com').get('/image.gif').reply(200, GIF1x1);

    const post = await models.Post.add(
      {
        title: 'Post with external feature image',
        status: 'draft',
        feature_image: 'https://external-media.example.com/image.gif',
      },
      { context: { internal: true } },
    );

    const loggingInfoSpy = sinon.spy(logging, 'info');

    await getJobsService().dispatch(
      new ExternalMediaInlinerJob({ domains: ['https://external-media.example.com'] }),
    );

    const inlined = await waitFor(async () => {
      const updated = await models.Post.findOne({ id: post.id, status: 'all' });
      const featureImage = updated.get('feature_image');
      return Boolean(featureImage?.includes('/content/images/'));
    });
    assert.ok(inlined, 'The feature image is replaced with a locally stored copy');

    const lifecycleLog = loggingInfoSpy.getCalls().find((call) => {
      return (
        call.args[0]?.system?.event === 'job.completed' &&
        call.args[0]?.system?.job_type === 'external-media-inliner'
      );
    });
    assert.ok(lifecycleLog, 'The jobs service logs a structured job.completed lifecycle event');
    assert.equal(typeof lifecycleLog!.args[0].system.duration_ms, 'number');
  });
});
