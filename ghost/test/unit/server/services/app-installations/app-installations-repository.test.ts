import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { vi } from 'vitest';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import { AppInstallationsRepository } from '../../../../../core/server/services/app-installations/app-installations-repository';
import type { Installation } from '../../../../../core/server/services/app-installations/codec';
import type { LoadedManifest } from '../../../../../core/server/services/app-installations/load-manifest';
import { FIXTURE_BACKEND_KEY, FIXTURE_IDENTITY_KEY } from '../../../../utils/app-identity';

const manifest: AppManifest = {
  id: 'com.example.podcast',
  name: 'Podcast',
  description: 'Publish episodes.',
  author: { name: 'Example Audio', url: 'https://example.com/' },
  accent_color: '#ff5500',
  icon: { name: 'audio-lines' },
  surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
  manifest_url: 'https://podcast.example.com/ghost-app.json',
  identity_key: FIXTURE_IDENTITY_KEY,
  backend_key: FIXTURE_BACKEND_KEY,
  development: false,
};
const loaded: LoadedManifest = {
  manifestUrl: 'https://podcast.example.com/ghost-app.json',
  manifest,
  // Differs from what re-encoding the manifest gives, so a test can check the loader's text is stored.
  serialised: JSON.stringify(manifest, null, 2),
  digest: 'reviewed-digest',
  identityKeyThumbprint: 'identity-thumbprint',
  backendKeyThumbprint: 'backend-thumbprint',
};
const ICON_DATA_URL = 'data:image/svg+xml;base64,PHN2Zy8+';
const installation: Installation = {
  id: 'installation',
  app_id: manifest.id,
  identity_key_thumbprint: 'identity-thumbprint',
  status: 'active',
  manifest_id: 'approved',
  pending_manifest_id: null,
  revision: 3,
  manifest_url: 'https://podcast.example.com/ghost-app.json',
  manifest,
  icon_data_url: null,
  created_at: new Date(),
  updated_at: new Date(),
};

/** A repository over a database where locking the installation finds `locked`. */
function lockingFinds(locked: { status: string; revision: number } | undefined) {
  const trx = (table: string) => {
    assert.equal(table, 'app_installations');
    return {
      where: (where: Record<string, unknown>) => {
        assert.deepEqual(where, { id: 'installation' });
        return { forUpdate: () => ({ first: async () => locked }) };
      },
    };
  };
  const knex = {
    transaction: async <T>(write: (trx: Knex.Transaction) => Promise<T>) =>
      write(trx as unknown as Knex.Transaction),
  };
  return new AppInstallationsRepository(knex as unknown as Knex);
}

const deadlock = () => Object.assign(new Error('Deadlock victim'), { code: 'ER_LOCK_DEADLOCK' });

/** A repository over a database whose transactions and inserts can be made to fail. */
function inserting() {
  const insert = vi
    .fn<(_row: Record<string, unknown>) => Promise<unknown[]>>()
    .mockResolvedValue([]);
  const trx = vi.fn((_table: string) => ({ insert }));
  const transaction = vi.fn(async (write: (connection: Knex.Transaction) => Promise<void>) => {
    await write(trx as unknown as Knex.Transaction);
  });
  const repository = new AppInstallationsRepository({ transaction } as unknown as Knex);
  return { repository, insert, trx, transaction };
}

describe('AppInstallationsRepository insert', function () {
  it('stores the manifest text, digest and icon exactly as they were given', async function () {
    const { repository, insert, trx } = inserting();

    const installed = await repository.insert(loaded, ICON_DATA_URL);

    assert.deepEqual(
      trx.mock.calls.map(([table]) => table),
      ['app_installations', 'app_installation_manifests'],
    );
    assert.deepEqual(insert.mock.calls[1][0], {
      id: insert.mock.calls[0][0].manifest_id,
      installation_id: installed.id,
      manifest_url: loaded.manifestUrl,
      manifest: loaded.serialised,
      digest: loaded.digest,
      backend_key_thumbprint: 'backend-thumbprint',
      source: 'install',
      requires_approval: false,
      created_at: insert.mock.calls[0][0].created_at,
    });
    assert.equal(installed.icon_data_url, ICON_DATA_URL);
  });

  it('restarts the whole transaction when its manifest insert deadlocks', async function () {
    const { repository, insert, trx, transaction } = inserting();
    insert.mockResolvedValueOnce([]).mockRejectedValueOnce(deadlock());

    const installed = await repository.insert(loaded, null);

    assert.equal(transaction.mock.calls.length, 2);
    assert.deepEqual(
      trx.mock.calls.map(([table]) => table),
      [
        'app_installations',
        'app_installation_manifests',
        'app_installations',
        'app_installation_manifests',
      ],
    );
    assert.deepEqual(insert.mock.calls[0], insert.mock.calls[2]);
    assert.deepEqual(insert.mock.calls[1], insert.mock.calls[3]);
    assert.equal(installed.id, insert.mock.calls[2][0].id);
  });

  it('reports a conflict when a retried install encounters the winner', async function () {
    const { repository, transaction } = inserting();
    transaction
      .mockRejectedValueOnce(deadlock())
      .mockRejectedValueOnce(Object.assign(new Error('Duplicate app'), { code: 'ER_DUP_ENTRY' }));

    await assert.rejects(repository.insert(loaded, null), {
      errorType: 'ConflictError',
      code: 'APP_ALREADY_INSTALLED',
    });
    assert.equal(transaction.mock.calls.length, 2);
  });

  it('can recover from both retryable failures within the three-attempt bound', async function () {
    const { repository, transaction } = inserting();
    transaction.mockRejectedValueOnce(deadlock()).mockRejectedValueOnce(deadlock());

    await repository.insert(loaded, null);

    assert.equal(transaction.mock.calls.length, 3);
  });

  it('propagates the last deadlock after three attempts', async function () {
    const { repository, transaction } = inserting();
    const error = deadlock();
    transaction.mockRejectedValue(error);

    await assert.rejects(repository.insert(loaded, null), (reason) => reason === error);

    assert.equal(transaction.mock.calls.length, 3);
  });

  it('does not retry unrelated database errors', async function () {
    const { repository, transaction } = inserting();
    const error = Object.assign(new Error('Connection lost'), { code: 'ECONNRESET' });
    transaction.mockRejectedValue(error);

    await assert.rejects(repository.insert(loaded, null), (reason) => reason === error);

    assert.equal(transaction.mock.calls.length, 1);
  });
});

describe('AppInstallationsRepository whileUnchanged', function () {
  it('writes while the installation is at the revision it was read at', async function () {
    const repository = lockingFinds({ status: 'active', revision: 3 });

    assert.deepEqual(await repository.whileUnchanged(installation, async () => 'written'), {
      status: 'written',
      value: 'written',
    });
  });

  it('tells a write whose result reads like a refusal apart from a refusal', async function () {
    const repository = lockingFinds({ status: 'active', revision: 3 });

    assert.deepEqual(await repository.whileUnchanged(installation, async () => 'changed'), {
      status: 'written',
      value: 'changed',
    });
  });

  it('refuses to write once the installation has been uninstalled or changed', async function () {
    for (const [locked, refused] of [
      [undefined, 'uninstalled'],
      [{ status: 'uninstalled', revision: 4 }, 'uninstalled'],
      [{ status: 'suspended', revision: 4 }, 'changed'],
    ] as const) {
      const repository = lockingFinds(locked);
      let wrote = false;

      const result = await repository.whileUnchanged(installation, async () => {
        wrote = true;
      });

      assert.deepEqual(result, { status: refused });
      assert.equal(wrote, false);
    }
  });
});

describe('AppInstallationsRepository retiredBackendKeysOf', function () {
  let knex: Knex;
  let minute: number;

  beforeEach(async function () {
    knex = createKnex({ client: 'better-sqlite3', connection: ':memory:', useNullAsDefault: true });
    await knex.schema.createTable('app_installations', (table) => {
      table.string('id').primary();
      table.string('app_id');
      table.string('identity_key_thumbprint');
    });
    await knex.schema.createTable('app_installation_manifests', (table) => {
      table.string('id').primary();
      for (const column of ['installation_id', 'manifest_url', 'manifest', 'digest', 'source']) {
        table.string(column);
      }
      table.string('backend_key_thumbprint');
      table.boolean('requires_approval');
      table.dateTime('created_at');
    });
    // Only the columns the lookup reads, so not a row the table's type would accept.
    await knex
      .insert([
        { id: 'installation', app_id: manifest.id, identity_key_thumbprint: 'identity' },
        { id: 'ended', app_id: manifest.id, identity_key_thumbprint: 'identity' },
        { id: 'other-key', app_id: manifest.id, identity_key_thumbprint: 'other' },
        { id: 'other-app', app_id: 'com.example.other', identity_key_thumbprint: 'identity' },
      ])
      .into('app_installations');
    minute = 0;
  });

  afterEach(async function () {
    await knex.destroy();
  });

  /** Adds manifest rows naming these keys, each newer than every row added before it. */
  const addRows = (installationId: string, keys: string[]) => {
    const first = minute;
    minute += keys.length;
    return knex('app_installation_manifests').insert(
      keys.map((key, index) => ({
        id: `${installationId}-${index}`,
        installation_id: installationId,
        manifest_url: loaded.manifestUrl,
        manifest: loaded.serialised,
        digest: `digest-${index}`,
        backend_key_thumbprint: key,
        source: index === 0 ? ('install' as const) : ('update' as const),
        requires_approval: false,
        created_at: new Date(Date.UTC(2026, 0, 1, 0, first + index)),
      })),
    );
  };

  it('is every key the app’s rows name under the identity key, other than the newest row’s', async function () {
    await addRows('installation', ['k1', 'k1', 'k2', 'k3']);
    await addRows('other-key', ['k4', 'k5']);
    await addRows('other-app', ['k6', 'k7']);
    const repository = new AppInstallationsRepository(knex);

    assert.deepEqual(
      await repository.retiredBackendKeysOf(manifest.id, 'identity'),
      new Set(['k1', 'k2']),
    );
    assert.deepEqual(await repository.retiredBackendKeysOf(manifest.id, 'missing'), new Set());
  });

  // Otherwise uninstalling and installing again would bring a replaced key back.
  it('counts the rows of ended installations', async function () {
    await addRows('ended', ['k1', 'k2']);
    await addRows('installation', ['k2']);

    assert.deepEqual(
      await new AppInstallationsRepository(knex).retiredBackendKeysOf(manifest.id, 'identity'),
      new Set(['k1']),
    );
  });

  // A re-check that changes nothing adds no row, but every update and approval does.
  it('reads each retired key once, however long the history', async function () {
    await addRows('installation', ['k1', 'k1', 'k1', 'k2', 'k2', 'k3', 'k3']);
    const returned: number[] = [];
    knex.on('query-response', (rows: unknown[]) => returned.push(rows.length));

    await new AppInstallationsRepository(knex).retiredBackendKeysOf(manifest.id, 'identity');

    assert.deepEqual(returned, [2]);
  });
});
