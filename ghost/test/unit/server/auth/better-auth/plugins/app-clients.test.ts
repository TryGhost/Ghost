import assert from 'node:assert/strict';
import {
  appClientId,
  appClientOwnerOf,
  appUserClient,
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

  it("says a client is no app's when its id isn't the one Ghost gives that owner", function () {
    const other = appClientId({ installationId: '6745a1b2c3d4e5f6a7b8c9d1', kind: 'user' });

    assert.equal(appClientOwnerOf({ clientId: other, metadata: client.metadata }), null);
  });
});
