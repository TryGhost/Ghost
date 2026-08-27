import { describe, it, beforeAll, afterAll } from 'vitest';
import assert from 'node:assert/strict';
import nock from 'nock';

const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const urlUtils = require('../../../../core/shared/url-utils').default;
const { getInstance: getJobsService } = require('../../../../core/server/services/jobs-service');
const ProcessWebmentionJob =
  require('../../../../core/server/services/mentions/process-webmention-job').default;

async function waitFor(
  check: () => boolean | Promise<boolean>,
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

describe('Job: Process webmention', function () {
  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('posts');
  });

  afterAll(function () {
    nock.cleanAll();
  });

  it('records the mention when the dispatched job runs', async function () {
    const targetUrl = new URL(urlUtils.getSiteUrl());
    const sourceUrl = new URL('http://dispatched-webmention.com/external-article/');
    const html = `<html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>`;

    nock(targetUrl.origin).persist().head(targetUrl.pathname).reply(200);
    nock(sourceUrl.origin)
      .persist()
      .get(sourceUrl.pathname)
      .reply(200, html, { 'Content-Type': 'text/html' });

    await getJobsService().dispatch(
      new ProcessWebmentionJob({
        source: sourceUrl.href,
        target: targetUrl.href,
        payload: { withExtension: true },
      }),
    );

    const recorded = await waitFor(async () => {
      return !!(await models.Mention.findOne({ source: sourceUrl.href }));
    });
    assert.ok(recorded, 'The webmention was processed');

    const mention = await models.Mention.findOne({ source: sourceUrl.href });
    assert.equal(mention.get('target'), targetUrl.href);
    assert.equal(mention.get('source_title'), 'Test Page');
    assert.equal(mention.get('source_excerpt'), 'Test description');
    assert.equal(mention.get('source_author'), 'John Doe');
    assert.equal(mention.get('payload'), JSON.stringify({ withExtension: true }));
  });
});
