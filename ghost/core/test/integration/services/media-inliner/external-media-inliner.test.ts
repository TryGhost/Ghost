import assert from 'node:assert/strict';
import nock from 'nock';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import ExternalMediaInlinerJob from '../../../../core/server/services/media-inliner/jobs/external-media-inliner-job';

const models = require('../../../../core/server/models');
const config = require('../../../../core/shared/config');
const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const { getInstance: getJobsService } = require('../../../../core/server/services/jobs-service');

const GIF1x1 = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
const LOCAL_IMAGES_PATH = '/content/images/';

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
  const inlinedFiles: string[] = [];

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
  });

  afterAll(async function () {
    for (const file of inlinedFiles) {
      await fs.unlink(file).catch(() => {});
    }
  });

  it('stores a post feature image hosted on a dispatched domain locally', async function () {
    nock('https://inliner.example')
      .get('/feature.gif')
      .reply(200, GIF1x1, { 'content-type': 'image/gif' });

    const post = await models.Post.add(
      {
        title: 'External media inliner job',
        slug: 'external-media-inliner-job',
        status: 'published',
        feature_image: 'https://inliner.example/feature.gif',
      },
      { context: { internal: true } },
    );

    await getJobsService().dispatch(
      new ExternalMediaInlinerJob({ domains: ['https://inliner.example'] }),
    );

    let featureImage: string | undefined;
    const inlined = await waitFor(async () => {
      const reloaded = await models.Post.findOne({ id: post.id }, { context: { internal: true } });
      featureImage = reloaded.get('feature_image');
      return Boolean(featureImage?.includes(LOCAL_IMAGES_PATH));
    });

    assert.ok(inlined, `the dispatched job inlines the feature image (got ${featureImage})`);

    const storedFile = path.join(
      config.getContentPath('images'),
      featureImage!.split(LOCAL_IMAGES_PATH)[1],
    );
    inlinedFiles.push(storedFile);
    assert.ok(await fs.stat(storedFile), 'the inlined image is written to local storage');
  });
});
