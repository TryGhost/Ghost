import assert from 'node:assert/strict';
import type { Got } from 'got';
import sinon from 'sinon';
import { createAppFetcher } from '../../../../../core/server/services/app-installations/fetch-from-app';

// The redirect, alias, time and size rules are covered through the manifest loader.
describe('createAppFetcher', function () {
  it('reports a URL it can’t read as unreachable, without a request', async function () {
    const request = sinon.stub();
    const fetchFromApp = createAppFetcher({
      request: request as unknown as Got,
      getLocalhostAlias: () => null,
    });

    const result = await fetchFromApp('not a url', { accept: 'image/svg+xml', maxBytes: 1024 });

    if (result.success || result.failure.reason !== 'unreachable') {
      assert.fail(`Expected the URL to be unreachable, not ${JSON.stringify(result)}`);
    }
    assert.equal(result.failure.status, undefined);
    assert.equal(result.failure.cause, 'not a url is not a URL');
    sinon.assert.notCalled(request);
  });
});
