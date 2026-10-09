import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import { vi } from 'vitest';
import { AppInstallationsService } from '../../../../../core/server/services/app-installations/service';
import type { RecordAppInstallationAction } from '../../../../../core/server/services/app-installations/actions';

const manifestUrl = 'https://podcast.example.com/ghost-app.json';
const manifest = {
  id: 'com.example.podcast',
  name: 'Podcast',
  description: 'Publish episodes.',
  author: { name: 'Example Audio', url: 'https://example.com' },
  accent_color: '#ff5500',
  icon: { name: 'audio-lines' },
  surfaces: [{ type: 'admin_page', url: '/admin' }],
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
    getManifestRules: () => ({ ghostUrls: ['https://site.example.com'] }),
    fetchManifest: vi.fn(),
  });
  const install = () => service.install({ actor: null }, { manifestUrl, manifest });
  return { install, insert, trx, transaction, recordAction };
}

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
