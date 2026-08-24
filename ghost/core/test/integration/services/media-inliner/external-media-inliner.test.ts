import assert from 'node:assert/strict';
import { describe, it, beforeAll } from 'vitest';

// require() so the singletons are the same instances the code under test uses —
// nock in particular installs its interceptors globally but keeps its registry
// per module copy, so an ESM import would not see the suite's disableNetConnect.
const nock = require('nock');
const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const jobsService = require('../../../../core/server/services/jobs-service');
const ExternalMediaInlinerJob =
  require('../../../../core/server/services/media-inliner/external-media-inliner-job').default;

const GIF1x1 = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');

describe('Job: External media inliner', function () {
  beforeAll(async function () {
    const agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
    await agent.loginAsOwner();
  });

  it("Inlines external media referenced by a post's feature image", async function () {
    const imageURL = 'https://inliner.example.com/files/image.jpg';
    nock('https://inliner.example.com').get('/files/image.jpg').reply(200, GIF1x1);

    const post = await models.Post.add(
      {
        title: 'Post with external media',
        feature_image: imageURL,
      },
      { context: { internal: true } },
    );

    await jobsService
      .getInstance()
      .dispatch(new ExternalMediaInlinerJob({ domains: ['https://inliner.example.com'] }));
    await jobsService.allSettled();

    const reloaded = await models.Post.findOne({ id: post.id }, { context: { internal: true } });
    assert.match(reloaded.get('feature_image'), /\/content\/images\/.+\.gif$/);
  });
});
