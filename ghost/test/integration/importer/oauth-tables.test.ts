import assert from 'node:assert/strict';

const dataImporter = require('../../../core/server/data/importer/importers/data');
const db = require('../../../core/server/data/db');
const testUtils = require('../../utils');
const { exportedBodyLatest } = require('../../utils/fixtures/export/body-generator');

const id = (n: number) => n.toString(16).padStart(24, '0');
const now = new Date();

/** A row for each OAuth table, as a full database backup would carry them */
const oauthRows = (userId: string) => ({
  oauth_clients: [
    { id: id(1), client_id: 'ghost-app-client', redirect_uris: '[]', user_id: userId },
  ],
  oauth_resources: [{ id: id(2), identifier: 'https://example.com', name: 'Example' }],
  oauth_client_resources: [
    { id: id(3), client_id: 'ghost-app-client', resource_id: 'https://example.com' },
  ],
  oauth_refresh_tokens: [
    { id: id(4), token: 'refresh', client_id: 'ghost-app-client', user_id: userId, scopes: '[]' },
  ],
  oauth_access_tokens: [
    { id: id(5), token: 'access', client_id: 'ghost-app-client', user_id: userId, scopes: '[]' },
  ],
  oauth_consents: [{ id: id(6), client_id: 'ghost-app-client', user_id: userId, scopes: '[]' }],
  oauth_client_assertions: [{ id: 'assertion', expires_at: now }],
  oauth_jwks: [{ id: id(7), public_key: 'public', private_key: 'private', created_at: now }],
});

describe("Importing a backup with the OAuth provider's tables", function () {
  beforeEach(async function () {
    await testUtils.teardownDb();
    await testUtils.setup('roles', 'owner')();
  });

  it('restores none of their rows', async function () {
    const exportData = exportedBodyLatest().db[0];
    const owner = await db.knex('users').first('id');
    const rows = oauthRows(owner.id);
    Object.assign(exportData.data, rows);

    await dataImporter.doImport(exportData, { returnImportedData: true });

    for (const table of Object.keys(rows)) {
      assert.equal((await db.knex(table)).length, 0, table);
    }
  });
});
