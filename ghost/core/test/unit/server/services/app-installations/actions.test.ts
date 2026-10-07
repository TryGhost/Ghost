import assert from 'node:assert/strict';
import { actingContext } from '../../../../../core/server/services/app-installations/actions';

// Which actor an installation's history records for each way into the Admin API. The
// reading of the context itself is the shared `readFrameIdentity`; this pins only the
// narrowing: a staff user, and nobody else.
describe('Unit: app-installations actingContext', function () {
  it('records a signed-in user', function () {
    assert.deepEqual(actingContext({ user: 'user-id', integration: null, api_key: null }), {
      actor: { id: 'user-id', type: 'user' },
    });
  });

  it('records a staff token as its user', function () {
    assert.deepEqual(
      actingContext({ user: 'user-id', integration: null, api_key: { id: 'key-id' } }),
      { actor: { id: 'user-id', type: 'user' } },
    );
  });

  it('records nobody for an integration', function () {
    assert.deepEqual(
      actingContext({
        user: null,
        integration: { id: 'integration-id' },
        api_key: { id: 'key-id' },
      }),
      { actor: null },
    );
  });

  it('records nobody when the context names a user alongside an integration', function () {
    assert.deepEqual(actingContext({ user: 'user-id', integration: { id: 'integration-id' } }), {
      actor: null,
    });
  });

  it('records nobody for a request that is neither', function () {
    assert.deepEqual(actingContext({ internal: true }), { actor: null });
    assert.deepEqual(actingContext(undefined), { actor: null });
  });
});
