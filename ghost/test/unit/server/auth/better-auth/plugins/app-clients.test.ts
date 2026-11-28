import assert from 'node:assert/strict';
import {
  appClientId,
  appClientOwnerOf,
  appUserClient,
  reconcileAppUserClient,
} from '../../../../../../core/server/auth/better-auth/plugins/app-clients';

describe('appClientOwnerOf', function () {
  const installationId = '6745a1b2c3d4e5f6a7b8c9d0';
  const client = appUserClient({ installationId, active: true, scopes: [] });
  const owner = { installationId, kind: 'user' };

  it('reads the owner from metadata stored as JSON text or handed back decoded', function () {
    assert.deepEqual(
      appClientOwnerOf({ clientId: client.clientId, metadata: JSON.stringify(client.metadata) }),
      owner,
    );
    assert.deepEqual(
      appClientOwnerOf({ clientId: client.clientId, metadata: client.metadata }),
      owner,
    );
  });

  it("says a client is no app's unless its metadata names an installation and a known kind", function () {
    for (const metadata of [
      undefined,
      null,
      '',
      'not json',
      '"a string"',
      '[]',
      {},
      { ghost_app_installation_id: installationId },
      { ghost_app_installation_id: installationId, ghost_app_client: 'admin' },
      { ghost_app_installation_id: 42, ghost_app_client: 'user' },
      JSON.stringify({ ghost_app_installation_id: installationId, ghost_app_client: 'USER' }),
    ]) {
      assert.equal(
        appClientOwnerOf({ clientId: client.clientId, metadata }),
        null,
        JSON.stringify(metadata),
      );
    }
  });

  it('names the installation in lowercase, as its id is stored, however it was written', function () {
    const written = appUserClient({
      installationId: installationId.toUpperCase(),
      active: true,
      scopes: [],
    });

    assert.deepEqual(written, client);
  });

  it("says a client is no app's when its id isn't the one Ghost gives that owner", function () {
    const other = appClientId({ installationId: '6745a1b2c3d4e5f6a7b8c9d1', kind: 'user' });

    assert.equal(appClientOwnerOf({ clientId: other, metadata: client.metadata }), null);
  });
});

describe('reconcileAppUserClient', function () {
  const installationId = '6745a1b2c3d4e5f6a7b8c9d0';

  /** One client row and a count of its tokens, with deleteMany failing the given number of times. */
  function fakeAdapter({ disabled, failDeletes = 0 }: { disabled: boolean; failDeletes?: number }) {
    const state = {
      client: { ...appUserClient({ installationId, active: !disabled, scopes: [] }), id: 'c1' },
      tokens: 1,
    };
    let failures = failDeletes;
    const adapter = {
      findOne: async () => ({ ...state.client }),
      create: async () => {
        throw new Error('The client already exists.');
      },
      update: async ({ update }: { update: Record<string, unknown> }) => {
        state.client = { ...state.client, ...update };
      },
      deleteMany: async () => {
        if (failures > 0) {
          failures -= 1;
          throw new Error('The tokens could not be deleted.');
        }
        state.tokens = 0;
      },
    };
    return {
      state,
      adapter: adapter as unknown as Parameters<typeof reconcileAppUserClient>[0],
    };
  }

  it("leaves a client disabled when its tokens can't be deleted, so the next run deletes them", async function () {
    const { state, adapter } = fakeAdapter({ disabled: true, failDeletes: 2 });
    const installation = { installationId, active: true, scopes: [] };

    await assert.rejects(reconcileAppUserClient(adapter, installation));
    assert.equal(state.client.disabled, true);
    assert.equal(state.tokens, 1);

    await reconcileAppUserClient(adapter, installation);
    assert.equal(state.client.disabled, false);
    assert.equal(state.tokens, 0);
  });

  it('keeps the tokens of a client that is already enabled', async function () {
    const { state, adapter } = fakeAdapter({ disabled: false });

    await reconcileAppUserClient(adapter, {
      installationId,
      active: true,
      scopes: ['post:browse'],
    });

    assert.deepEqual(state.client.scopes, ['post:browse']);
    assert.equal(state.tokens, 1);
  });

  it("deletes an inactive installation's tokens", async function () {
    const { state, adapter } = fakeAdapter({ disabled: true });

    await reconcileAppUserClient(adapter, { installationId, active: false, scopes: [] });

    assert.equal(state.tokens, 0);
  });
});
