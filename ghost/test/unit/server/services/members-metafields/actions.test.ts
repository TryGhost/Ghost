import assert from 'node:assert/strict';
import {
  actingContext,
  adminWriteOrigin,
} from '../../../../../core/server/services/members-metafields/actions';

// Which actor a metafield's history records for each way into the Admin API, and the
// write origin derived from the same reading. The reading of the context itself is the
// shared `readFrameIdentity`; this pins only the narrowing.
describe('Unit: members-metafields actingContext', function () {
  it('records a signed-in user as not via an API key', function () {
    assert.deepEqual(actingContext({ user: 'user-id', integration: null, api_key: null }), {
      actor: { id: 'user-id', type: 'user', viaApiKey: false },
    });
  });

  it('records a staff token as its user via an API key', function () {
    assert.deepEqual(
      actingContext({ user: 'user-id', integration: null, api_key: { id: 'key-id' } }),
      { actor: { id: 'user-id', type: 'user', viaApiKey: true } },
    );
  });

  it('records an integration, before any user the context also names', function () {
    assert.deepEqual(
      actingContext({
        user: 'user-id',
        integration: { id: 'integration-id' },
        api_key: { id: 'key-id' },
      }),
      { actor: { id: 'integration-id', type: 'integration', viaApiKey: true } },
    );
  });

  it('records nobody for a request that is neither', function () {
    assert.deepEqual(actingContext({ internal: true }), { actor: null });
    assert.deepEqual(actingContext(undefined), { actor: null });
  });
});

describe('Unit: members-metafields adminWriteOrigin', function () {
  it('names a signed-in user as writing from Admin', function () {
    assert.deepEqual(adminWriteOrigin({ user: 'user-id', integration: null, api_key: null }), {
      writtenBy: { type: 'user', id: 'user-id' },
      source: 'admin',
    });
  });

  it('names a staff token as its user writing through the Admin API', function () {
    assert.deepEqual(
      adminWriteOrigin({ user: 'user-id', integration: null, api_key: { id: 'key-id' } }),
      { writtenBy: { type: 'user', id: 'user-id' }, source: 'admin_api' },
    );
  });

  it('names an integration as writing through the Admin API', function () {
    assert.deepEqual(
      adminWriteOrigin({
        user: null,
        integration: { id: 'integration-id' },
        api_key: { id: 'key-id' },
      }),
      { writtenBy: { type: 'integration', id: 'integration-id' }, source: 'admin_api' },
    );
  });

  it('has no origin for a request nobody made', function () {
    assert.equal(adminWriteOrigin({ internal: true }), null);
  });
});
