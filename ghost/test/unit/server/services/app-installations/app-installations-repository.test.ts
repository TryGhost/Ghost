import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import { AppInstallationsRepository } from '../../../../../core/server/services/app-installations/app-installations-repository';
import type { Installation } from '../../../../../core/server/services/app-installations/codec';

const manifest: AppManifest = {
  id: 'com.example.podcast',
  name: 'Podcast',
  description: 'Publish episodes.',
  author: { name: 'Example Audio', url: 'https://example.com/' },
  accent_color: '#ff5500',
  icon: { name: 'audio-lines' },
  surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
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
