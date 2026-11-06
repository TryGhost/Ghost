import assert from 'node:assert/strict';
import { actingContext, actorFrom, readFrameIdentity } from '../../../../core/server/lib/actor';

const NOBODY = { userId: null, integrationId: null, viaApiKey: false };

// The context shapes here are the ones `@tryghost/api-framework`'s HTTP adapter builds:
// a session carries a user; a staff token carries a user and an api_key; an integration
// token carries an integration and an api_key; a webhook or a job carries none.
describe('Unit: lib/actor', function () {
  describe('readFrameIdentity', function () {
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
      assert.deepEqual(readFrameIdentity({ internal: true }), NOBODY);
      assert.deepEqual(readFrameIdentity({}), NOBODY);
      assert.deepEqual(readFrameIdentity(undefined), NOBODY);
      assert.deepEqual(readFrameIdentity(null), NOBODY);
      assert.deepEqual(readFrameIdentity('not a context'), NOBODY);
    });

    it('reads a malformed part as absent without affecting the others', function () {
      assert.deepEqual(readFrameIdentity({ user: '', integration: {}, api_key: null }), NOBODY);
      assert.deepEqual(readFrameIdentity({ user: 1, integration: { id: 'integration-id' } }), {
        userId: null,
        integrationId: 'integration-id',
        viaApiKey: false,
      });
      assert.deepEqual(readFrameIdentity({ user: 'user-id', integration: { id: 2 } }), {
        userId: 'user-id',
        integrationId: null,
        viaApiKey: false,
      });
    });
  });

  describe('actorFrom', function () {
    it('takes the integration before the user', function () {
      assert.deepEqual(
        actorFrom({ userId: 'user-id', integrationId: 'integration-id', viaApiKey: true }),
        { type: 'integration', id: 'integration-id' },
      );
    });

    it('takes the user when there is no integration', function () {
      assert.deepEqual(actorFrom({ userId: 'user-id', integrationId: null, viaApiKey: false }), {
        type: 'user',
        id: 'user-id',
      });
    });

    it('is null when nobody is acting', function () {
      assert.equal(actorFrom(NOBODY), null);
    });
  });

  describe('actingContext', function () {
    it('names the actor a frame context authenticated as', function () {
      assert.deepEqual(actingContext({ user: 'user-id', api_key: { id: 'key-id' } }), {
        actor: { type: 'user', id: 'user-id' },
      });
    });

    it('has no actor for a request nobody made', function () {
      assert.deepEqual(actingContext({ internal: true }), { actor: null });
    });
  });
});
