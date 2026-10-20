import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import { vi } from 'vitest';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import { AppInstallationsRepository } from '../../../../../core/server/services/app-installations/app-installations-repository';
import type { Installation } from '../../../../../core/server/services/app-installations/codec';
import type { LoadedManifest } from '../../../../../core/server/services/app-installations/load-manifest';

const manifest: AppManifest = {
  id: 'com.example.podcast',
  name: 'Podcast',
  description: 'Publish episodes.',
  author: { name: 'Example Audio', url: 'https://example.com/' },
  accent_color: '#ff5500',
  icon: { name: 'audio-lines' },
  surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
};
const loaded: LoadedManifest = {
  manifestUrl: 'https://podcast.example.com/ghost-app.json',
  manifest,
  // Differs from what re-encoding the manifest gives, so a test can check the loader's text is stored.
  serialised: JSON.stringify(manifest, null, 2),
  digest: 'reviewed-digest',
};
const installation: Installation = {
  id: 'installation',
  app_id: manifest.id,
  status: 'active',
  manifest_id: 'approved',
  pending_manifest_id: null,
  revision: 3,
  manifest_url: 'https://podcast.example.com/ghost-app.json',
  manifest,
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
  it('stores the manifest text and digest exactly as the loader produced them', async function () {
    const { repository, insert, trx } = inserting();

    const installed = await repository.insert(loaded);

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
      source: 'install',
      requires_approval: false,
      created_at: insert.mock.calls[0][0].created_at,
    });
  });

  it('restarts the whole transaction when its manifest insert deadlocks', async function () {
    const { repository, insert, trx, transaction } = inserting();
    insert.mockResolvedValueOnce([]).mockRejectedValueOnce(deadlock());

    const installed = await repository.insert(loaded);

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

    await assert.rejects(repository.insert(loaded), {
      errorType: 'ConflictError',
      code: 'APP_ALREADY_INSTALLED',
    });
    assert.equal(transaction.mock.calls.length, 2);
  });

  it('can recover from both retryable failures within the three-attempt bound', async function () {
    const { repository, transaction } = inserting();
    transaction.mockRejectedValueOnce(deadlock()).mockRejectedValueOnce(deadlock());

    await repository.insert(loaded);

    assert.equal(transaction.mock.calls.length, 3);
  });

  it('propagates the last deadlock after three attempts', async function () {
    const { repository, transaction } = inserting();
    const error = deadlock();
    transaction.mockRejectedValue(error);

    await assert.rejects(repository.insert(loaded), (reason) => reason === error);

    assert.equal(transaction.mock.calls.length, 3);
  });

  it('does not retry unrelated database errors', async function () {
    const { repository, transaction } = inserting();
    const error = Object.assign(new Error('Connection lost'), { code: 'ECONNRESET' });
    transaction.mockRejectedValue(error);

    await assert.rejects(repository.insert(loaded), (reason) => reason === error);

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
