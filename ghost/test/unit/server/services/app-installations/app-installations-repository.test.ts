import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { vi } from 'vitest';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import {
  alreadyInstalled,
  AppInstallationsRepository,
  retryOnDeadlock,
} from '../../../../../core/server/services/app-installations/app-installations-repository';
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

/** A transaction in which locking the installation finds `locked`. */
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
  return {
    repository: new AppInstallationsRepository({} as Knex),
    transacting: trx as unknown as Knex.Transaction,
  };
}

const deadlock = () => Object.assign(new Error('Deadlock victim'), { code: 'ER_LOCK_DEADLOCK' });

/** A transaction whose inserts can be made to fail. */
function inserting() {
  const insert = vi
    .fn<(_row: Record<string, unknown>) => Promise<unknown[]>>()
    .mockResolvedValue([]);
  const trx = vi.fn((_table: string) => ({ insert }));
  return {
    repository: new AppInstallationsRepository({} as Knex),
    transacting: trx as unknown as Knex.Transaction,
    insert,
    trx,
  };
}

describe('AppInstallationsRepository insert', function () {
  it('stores the manifest text, digest and icon exactly as they were given', async function () {
    const { repository, transacting, insert, trx } = inserting();

    const installed = await repository.insert(loaded, ICON_DATA_URL, { transacting });

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
      icon_data_url: ICON_DATA_URL,
      source: 'install',
      requires_approval: false,
      created_at: insert.mock.calls[0][0].created_at,
    });
    assert.equal(installed.icon_data_url, ICON_DATA_URL);
  });

  it('reports a conflict when the app is already installed', async function () {
    const { repository, transacting, insert } = inserting();
    insert.mockRejectedValueOnce(
      Object.assign(new Error('Duplicate app'), { code: 'ER_DUP_ENTRY' }),
    );

    await assert.rejects(repository.insert(loaded, null, { transacting }), {
      errorType: 'ConflictError',
      code: 'APP_ALREADY_INSTALLED',
    });
    assert.equal(insert.mock.calls.length, 1);
  });
});

describe('retryOnDeadlock', function () {
  it('runs again when it deadlocks', async function () {
    const run = vi.fn<() => Promise<string>>().mockRejectedValueOnce(deadlock());
    run.mockResolvedValueOnce('written');

    assert.equal(await retryOnDeadlock(run), 'written');
    assert.equal(run.mock.calls.length, 2);
  });

  it('reports a conflict when a retried install encounters the winner', async function () {
    const run = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(deadlock())
      .mockRejectedValueOnce(alreadyInstalled(manifest.id));

    await assert.rejects(retryOnDeadlock(run), {
      errorType: 'ConflictError',
      code: 'APP_ALREADY_INSTALLED',
    });
    assert.equal(run.mock.calls.length, 2);
  });

  it('can recover from two deadlocks within the three-attempt bound', async function () {
    const run = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(deadlock())
      .mockRejectedValueOnce(deadlock())
      .mockResolvedValueOnce();

    await retryOnDeadlock(run);

    assert.equal(run.mock.calls.length, 3);
  });

  it('propagates the last deadlock after three attempts', async function () {
    const error = deadlock();
    const run = vi.fn<() => Promise<void>>().mockRejectedValue(error);

    await assert.rejects(retryOnDeadlock(run), (reason) => reason === error);

    assert.equal(run.mock.calls.length, 3);
  });

  it('does not retry unrelated database errors', async function () {
    const error = Object.assign(new Error('Connection lost'), { code: 'ECONNRESET' });
    const run = vi.fn<() => Promise<void>>().mockRejectedValue(error);

    await assert.rejects(retryOnDeadlock(run), (reason) => reason === error);

    assert.equal(run.mock.calls.length, 1);
  });
});

describe('AppInstallationsRepository whileUnchanged', function () {
  it('writes while the installation is at the revision it was read at', async function () {
    const { repository, transacting } = lockingFinds({ status: 'active', revision: 3 });

    assert.deepEqual(
      await repository.whileUnchanged(installation, async () => 'written', { transacting }),
      { status: 'written', value: 'written' },
    );
  });

  it('tells a write whose result reads like a refusal apart from a refusal', async function () {
    const { repository, transacting } = lockingFinds({ status: 'active', revision: 3 });

    assert.deepEqual(
      await repository.whileUnchanged(installation, async () => 'changed', { transacting }),
      { status: 'written', value: 'changed' },
    );
  });

  it('refuses to write once the installation has been uninstalled or changed', async function () {
    for (const [locked, refused] of [
      [undefined, 'uninstalled'],
      [{ status: 'uninstalled', revision: 4 }, 'uninstalled'],
      [{ status: 'suspended', revision: 4 }, 'changed'],
    ] as const) {
      const { repository, transacting } = lockingFinds(locked);
      let wrote = false;

      const result = await repository.whileUnchanged(
        installation,
        async () => {
          wrote = true;
        },
        { transacting },
      );

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
      table.string('manifest_id');
      table.string('pending_manifest_id');
      table.dateTime('created_at');
    });
    await knex.schema.createTable('app_installation_manifests', (table) => {
      table.string('id').primary();
      for (const column of ['installation_id', 'manifest_url', 'manifest', 'digest', 'source']) {
        table.string(column);
      }
      table.string('backend_key_thumbprint');
      table.text('icon_data_url');
      table.boolean('requires_approval');
      table.dateTime('created_at');
    });
    // Only the columns the lookup reads, so not a row the table's type would accept.
    // Each installed a day after the one before it.
    await knex
      .insert(
        [
          { id: 'ended', app_id: manifest.id, identity_key_thumbprint: 'identity' },
          { id: 'installation', app_id: manifest.id, identity_key_thumbprint: 'identity' },
          { id: 'other-key', app_id: manifest.id, identity_key_thumbprint: 'other' },
          { id: 'other-app', app_id: 'com.example.other', identity_key_thumbprint: 'identity' },
        ].map((row, day) => ({ ...row, created_at: new Date(Date.UTC(2025, 0, 1 + day)) })),
      )
      .into('app_installations');
    minute = 0;
  });

  afterEach(async function () {
    await knex.destroy();
  });

  /** A manifest row with this ID, naming this key. */
  const manifestRow = (installationId: string, id: string, key: string, createdAt: Date) => ({
    id,
    installation_id: installationId,
    manifest_url: loaded.manifestUrl,
    manifest: loaded.serialised,
    digest: `digest-${id}`,
    backend_key_thumbprint: key,
    icon_data_url: null,
    source: 'update' as const,
    requires_approval: false,
    created_at: createdAt,
  });

  /** Points the installation at its approved manifest and pending one, as a write would. */
  const point = (installationId: string, manifestId: string, pendingManifestId: string | null) =>
    knex('app_installations')
      .where({ id: installationId })
      .update({ manifest_id: manifestId, pending_manifest_id: pendingManifestId });

  /**
   * Adds manifest rows naming these keys, each newer than every row added before it, and
   * approves the last one.
   */
  const addRows = async (installationId: string, keys: string[]) => {
    const first = minute;
    minute += keys.length;
    const rows = keys.map((key, index) =>
      manifestRow(
        installationId,
        `${installationId}-${index}`,
        key,
        new Date(Date.UTC(2026, 0, 1, 0, first + index)),
      ),
    );
    await knex('app_installation_manifests').insert(rows);
    await point(installationId, rows[rows.length - 1].id, null);
  };

  it('is every key the app’s rows name under the identity key, other than the current one', async function () {
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

  // Two instances can add rows in the same second, and their IDs needn't sort in the order
  // the rows were added, so the current key can't be read off the clock.
  it('takes the current key from the installation, not from when its rows were added', async function () {
    const second = new Date(Date.UTC(2026, 0, 1));
    await knex('app_installation_manifests').insert([
      manifestRow('installation', 'b-older', 'k1', second),
      manifestRow('installation', 'a-newer', 'k2', second),
    ]);
    await point('installation', 'a-newer', null);

    assert.deepEqual(
      await new AppInstallationsRepository(knex).retiredBackendKeysOf(manifest.id, 'identity'),
      new Set(['k1']),
    );
  });

  // Otherwise whoever held the approved manifest's key could resume the app by serving it.
  it('takes the current key from a pending manifest that is the newest row', async function () {
    await addRows('installation', ['k1', 'k2']);
    await point('installation', 'installation-0', 'installation-1');

    assert.deepEqual(
      await new AppInstallationsRepository(knex).retiredBackendKeysOf(manifest.id, 'identity'),
      new Set(['k1']),
    );
  });

  // Otherwise uninstalling and installing again would bring a replaced key back. The ended
  // installation still points at k2, so only the newest installation makes k3 current.
  it('counts the rows of ended installations', async function () {
    await addRows('ended', ['k1', 'k2']);
    await addRows('installation', ['k3']);

    assert.deepEqual(
      await new AppInstallationsRepository(knex).retiredBackendKeysOf(manifest.id, 'identity'),
      new Set(['k1', 'k2']),
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
