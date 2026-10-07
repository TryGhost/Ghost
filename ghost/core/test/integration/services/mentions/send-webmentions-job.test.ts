import { describe, it, beforeAll, afterAll } from 'vitest';
import assert from 'node:assert/strict';
import nock from 'nock';

const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const { getInstance: getJobsService } = require('../../../../core/server/services/jobs-service');
const SendWebmentionsJob =
  require('../../../../core/server/services/mentions/send-webmentions-job').default;

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

describe('Job: Send webmentions', function () {
  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('posts');
  });

  afterAll(function () {
    nock.cleanAll();
  });

  it('sends a webmention to the linked target when the dispatched job runs', async function () {
    const targetUrl = new URL('https://target-of-outbound-webmention.com/article/');
    const endpointUrl = new URL('https://target-of-outbound-webmention.com/webmention-endpoint/');
    const targetHtml = `<html><head><link rel="webmention" href="${endpointUrl.href}"></head><body>Some content</body></html>`;

    nock(targetUrl.origin)
      .persist()
      .get(targetUrl.pathname)
      .reply(200, targetHtml, { 'Content-Type': 'text/html' });
    let receivedBody: string | null = null;
    const endpointScope = nock(endpointUrl.origin)
      .post(endpointUrl.pathname, (body) => {
        receivedBody = new URLSearchParams(body).toString();
        return true;
      })
      .reply(201);

    await getJobsService().dispatch(
      new SendWebmentionsJob({
        sourceUrl: 'http://127.0.0.1:2369/source-post/',
        html: `<a href="${targetUrl.href}">linked</a>`,
        previousHtml: null,
      }),
    );

    const delivered = await waitFor(() => endpointScope.isDone());
    assert.ok(delivered, 'The webmention endpoint received the notification');

    const body = new URLSearchParams(receivedBody!);
    assert.equal(body.get('source'), 'http://127.0.0.1:2369/source-post/');
    assert.equal(body.get('target'), targetUrl.href);
  });
});
