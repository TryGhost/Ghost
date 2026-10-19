import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import { vi } from 'vitest';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import {
  AppInstallationsService,
  keepManifest,
} from '../../../../../core/server/services/app-installations/service';
import type { RecordAppInstallationAction } from '../../../../../core/server/services/app-installations/actions';
import { AppInstallationsRepository } from '../../../../../core/server/services/app-installations/app-installations-repository';
import type { Installation } from '../../../../../core/server/services/app-installations/codec';
import type {
  AppManifestChange,
  ManifestDecisionKind,
} from '../../../../../core/server/services/app-installations/decide-on-manifest';
import type {
  LoadedManifest,
  LoadManifest,
} from '../../../../../core/server/services/app-installations/load-manifest';

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
const deadlock = () => Object.assign(new Error('Deadlock victim'), { code: 'ER_LOCK_DEADLOCK' });

function setup() {
  const insert = vi
    .fn<(_row: Record<string, unknown>) => Promise<unknown[]>>()
    .mockResolvedValue([]);
  const trx = vi.fn((_table: string) => ({ insert }));
  const transaction = vi.fn(async (write: (connection: Knex.Transaction) => Promise<void>) => {
    await write(trx as unknown as Knex.Transaction);
  });
  const recordAction = vi.fn<RecordAppInstallationAction>().mockResolvedValue(undefined);
  const service = new AppInstallationsService({
    knex: { transaction } as unknown as Knex,
    recordAction,
    loadManifest: vi.fn<LoadManifest>().mockResolvedValue(loaded),
  });
  const install = () =>
    service.create({ actor: null }, { manifestUrl: loaded.manifestUrl, digest: loaded.digest });
  return { install, insert, trx, transaction, recordAction };
}

describe('App installation storage', function () {
  it('stores the manifest text and digest exactly as the loader produced them', async function () {
    const { install, insert, trx } = setup();

    const installed = await install();

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
});

describe('App installation transaction failures', function () {
  it('restarts the whole transaction when its manifest insert deadlocks', async function () {
    const { install, insert, trx, transaction, recordAction } = setup();
    insert.mockResolvedValueOnce([]).mockRejectedValueOnce(deadlock());

    const installed = await install();

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
    assert.equal(recordAction.mock.calls.length, 1);
    assert.equal(recordAction.mock.calls[0][0].subject, installed.id);
  });

  it('reports a conflict when a retried install encounters the winner', async function () {
    const { install, transaction, recordAction } = setup();
    transaction
      .mockRejectedValueOnce(deadlock())
      .mockRejectedValueOnce(Object.assign(new Error('Duplicate app'), { code: 'ER_DUP_ENTRY' }));

    await assert.rejects(install(), {
      errorType: 'ConflictError',
      code: 'APP_ALREADY_INSTALLED',
    });
    assert.equal(transaction.mock.calls.length, 2);
    assert.equal(recordAction.mock.calls.length, 0);
  });

  it('can recover from both retryable failures within the three-attempt bound', async function () {
    const { install, transaction, recordAction } = setup();
    transaction.mockRejectedValueOnce(deadlock()).mockRejectedValueOnce(deadlock());

    await install();

    assert.equal(transaction.mock.calls.length, 3);
    assert.equal(recordAction.mock.calls.length, 1);
  });

  it('propagates the last deadlock after three attempts without recording an install', async function () {
    const { install, transaction, recordAction } = setup();
    const error = deadlock();
    transaction.mockRejectedValue(error);

    await assert.rejects(install(), (reason) => reason === error);

    assert.equal(transaction.mock.calls.length, 3);
    assert.equal(recordAction.mock.calls.length, 0);
  });

  it('does not retry unrelated database errors', async function () {
    const { install, transaction, recordAction } = setup();
    const error = Object.assign(new Error('Connection lost'), { code: 'ECONNRESET' });
    transaction.mockRejectedValue(error);

    await assert.rejects(install(), (reason) => reason === error);

    assert.equal(transaction.mock.calls.length, 1);
    assert.equal(recordAction.mock.calls.length, 0);
  });
});

describe('keepManifest', function () {
  const silent: AppManifestChange[] = [{ path: 'description', requires_approval: false }];
  const required: AppManifestChange[] = [{ path: 'name', requires_approval: true }];

  /** Runs `keepManifest` on `loaded` and returns what was written: manifest rows, then the installation. */
  async function keep(
    kind: ManifestDecisionKind,
    source: 'approval' | 'update',
    {
      pending = null,
      changes = [],
    }: { pending?: string | null; changes?: AppManifestChange[] } = {},
  ) {
    const rows: Array<Record<string, unknown>> = [];
    const installations: Array<Record<string, unknown>> = [];
    const trx = Object.assign(
      (table: string) => ({
        insert: async (row: Record<string, unknown>) => {
          assert.equal(table, 'app_installation_manifests');
          rows.push(row);
        },
        where: (where: Record<string, unknown>) => ({
          update: async (patch: Record<string, unknown>) => {
            assert.equal(table, 'app_installations');
            assert.deepEqual(where, { id: 'installation' });
            installations.push(patch);
          },
        }),
      }),
      { raw: (sql: string, bindings: unknown[]) => ({ sql, bindings }) },
    );
    const current: Installation = {
      id: 'installation',
      app_id: manifest.id,
      status: pending ? 'suspended' : 'active',
      manifest_id: 'approved',
      pending_manifest_id: pending,
      revision: 3,
      manifest_url: loaded.manifestUrl,
      manifest,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const kept = await keepManifest(
      new AppInstallationsRepository({} as Knex),
      trx as unknown as Knex.Transaction,
      current,
      loaded,
      { kind, changes },
      source,
    );
    for (const installation of installations) {
      assert.deepEqual(installation.revision, { sql: '?? + 1', bindings: ['revision'] });
    }
    return {
      kept,
      rows: rows.map((row) => [row.source, row.requires_approval]),
      newRowId: rows[0]?.id,
      installations: installations.map(({ status, manifest_id, pending_manifest_id }) => ({
        status,
        manifest_id,
        pending_manifest_id,
      })),
    };
  }

  it('writes nothing for the approved manifest, from either source', async function () {
    for (const source of ['update', 'approval'] as const) {
      assert.deepEqual(await keep('unchanged', source), {
        kept: null,
        rows: [],
        newRowId: undefined,
        installations: [],
      });
    }
  });

  it('writes nothing when the re-check loads the pending manifest', async function () {
    assert.deepEqual(
      await keep('use_pending', 'update', { pending: 'pending', changes: required }),
      {
        kept: null,
        rows: [],
        newRowId: undefined,
        installations: [],
      },
    );
  });

  it('approves the pending manifest without adding a row', async function () {
    const { kept, rows, installations } = await keep('use_pending', 'approval', {
      pending: 'pending',
      changes: required,
    });

    assert.deepEqual(kept, { from: 'approved', to: 'pending' });
    assert.deepEqual(rows, []);
    assert.deepEqual(installations, [
      { status: 'active', manifest_id: 'pending', pending_manifest_id: null },
    ]);
  });

  it('applies silent changes from the re-check as an update row', async function () {
    const { kept, rows, newRowId, installations } = await keep('apply', 'update', {
      changes: silent,
    });

    assert.deepEqual(rows, [['update', false]]);
    assert.deepEqual(kept, { from: 'approved', to: newRowId });
    assert.deepEqual(installations, [
      { status: 'active', manifest_id: newRowId, pending_manifest_id: null },
    ]);
  });

  it('stores changes from the re-check that need approval as a pending update row, suspending the app', async function () {
    for (const pending of [null, 'older pending']) {
      const { rows, newRowId, installations } = await keep('suspend', 'update', {
        pending,
        changes: required,
      });

      assert.deepEqual(rows, [['update', true]]);
      assert.deepEqual(installations, [
        { status: 'suspended', manifest_id: undefined, pending_manifest_id: newRowId },
      ]);
    }
  });

  it('lifts a suspension with a resume row when the app reverts the pending changes', async function () {
    // The approved manifest again, with or without silent changes.
    for (const changes of [[], silent]) {
      const { kept, rows, newRowId, installations } = await keep('resume', 'update', {
        pending: 'pending',
        changes,
      });

      assert.deepEqual(rows, [['resume', false]]);
      assert.deepEqual(kept, { from: 'approved', to: newRowId });
      assert.deepEqual(installations, [
        { status: 'active', manifest_id: newRowId, pending_manifest_id: null },
      ]);
    }
  });

  it('applies an approved manifest as an approval row, whatever changed', async function () {
    for (const [kind, changes, requiresApproval, pendings] of [
      ['apply', silent, false, [null]],
      ['resume', silent, false, ['pending']],
      ['suspend', required, true, [null, 'pending']],
    ] as const) {
      for (const pending of pendings) {
        const { kept, rows, newRowId, installations } = await keep(kind, 'approval', {
          pending,
          changes,
        });

        assert.deepEqual(rows, [['approval', requiresApproval]]);
        assert.deepEqual(kept, { from: 'approved', to: newRowId });
        assert.deepEqual(installations, [
          { status: 'active', manifest_id: newRowId, pending_manifest_id: null },
        ]);
      }
    }
  });

  it('clears the pending changes without adding a row when a publisher approves the approved manifest', async function () {
    const { kept, rows, installations } = await keep('resume', 'approval', { pending: 'pending' });

    assert.deepEqual(kept, { from: 'approved', to: 'approved' });
    assert.deepEqual(rows, []);
    assert.deepEqual(installations, [
      { status: 'active', manifest_id: 'approved', pending_manifest_id: null },
    ]);
  });
});
