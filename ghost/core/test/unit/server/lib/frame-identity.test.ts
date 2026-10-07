import assert from 'node:assert/strict';
import { readFrameIdentity } from '../../../../core/server/lib/frame-identity';

// The context shapes here are the ones `@tryghost/api-framework`'s HTTP adapter builds:
// a session carries a user; a staff token carries a user and an api_key; an integration
// token carries an integration and an api_key; a webhook or a job carries none.
describe('Unit: readFrameIdentity', function () {
  it('reads a signed-in session as a user without an API key', function () {
    assert.deepEqual(
      readFrameIdentity({ user: 'user-id', integration: null, api_key: null, member: null }),
      { userId: 'user-id', integrationId: null, viaApiKey: false },
    );
  });

  it('reads a staff token as a user via an API key', function () {
    assert.deepEqual(
      readFrameIdentity({
        user: 'user-id',
        integration: null,
        api_key: { id: 'key-id', type: 'admin' },
        member: null,
      }),
      { userId: 'user-id', integrationId: null, viaApiKey: true },
    );
  });

  it('reads an integration token as an integration via an API key', function () {
    assert.deepEqual(
      readFrameIdentity({
        user: null,
        integration: { id: 'integration-id' },
        api_key: { id: 'key-id', type: 'admin' },
        member: null,
      }),
      { userId: null, integrationId: 'integration-id', viaApiKey: true },
    );
  });

  it('reports both when a context names a user and an integration', function () {
    assert.deepEqual(
      readFrameIdentity({ user: 'user-id', integration: { id: 'integration-id' } }),
      { userId: 'user-id', integrationId: 'integration-id', viaApiKey: false },
    );
  });

  it('finds nobody in a context without a user or an integration', function () {
    assert.deepEqual(readFrameIdentity({ internal: true }), {
      userId: null,
      integrationId: null,
      viaApiKey: false,
    });
    assert.deepEqual(readFrameIdentity({}), {
      userId: null,
      integrationId: null,
      viaApiKey: false,
    });
  });

  it('finds nobody when there is no context at all', function () {
    const nobody = { userId: null, integrationId: null, viaApiKey: false };
    assert.deepEqual(readFrameIdentity(undefined), nobody);
    assert.deepEqual(readFrameIdentity(null), nobody);
  });

  it('ignores ids that are not strings', function () {
    assert.deepEqual(readFrameIdentity({ user: '', integration: {}, api_key: null }), {
      userId: null,
      integrationId: null,
      viaApiKey: false,
    });
    assert.deepEqual(readFrameIdentity({ user: 1, integration: { id: 2 } }), {
      userId: null,
      integrationId: null,
      viaApiKey: false,
    });
  });
});
