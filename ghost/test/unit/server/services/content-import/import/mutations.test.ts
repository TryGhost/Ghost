import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import LocalStorageBase from '../../../../../../core/server/adapters/storage/LocalStorageBase';
import { openAssetJournal } from '../../../../../../core/server/services/content-import/import/asset-journal';
import { ImportMutations } from '../../../../../../core/server/services/content-import/import/mutations';
import { createSummary } from '../../../../../../core/server/services/content-import/import/summary';

describe('CSV import mutations', function () {
  it('recovers changes from outcomes, the run tag and durable asset storage', async function () {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'csv-mutations-'));
    try {
      const storage = new LocalStorageBase({ storagePath: directory });
      const counts = createSummary('run', 'complete').counts;
      const mutations = new ImportMutations(storage);
      const hasTag = vi.fn(async () => false);
      assert.equal(await mutations.changed(counts, hasTag), false);
      hasTag.mockResolvedValue(true);
      assert.equal(await mutations.changed(counts, hasTag), true);
      hasTag.mockClear();
      assert.equal(await mutations.changed({ ...counts, updated: 1 }, hasTag), true);
      expect(hasTag).not.toHaveBeenCalled();

      const assets = await openAssetJournal(storage);
      await assets.append({
        originalPath: 'images/one.png',
        newPath: '/images/one.png',
        stored: '/images/one.png',
      });
      await assets.flush();
      assert.equal(await new ImportMutations(storage).changed(counts, hasTag), true);
      expect(hasTag).not.toHaveBeenCalled();

      await storage.delete('assets');
      const written = mutations.recordAssetWrite();
      assert.equal(mutations.recordAssetWrite(), written);
      await written;
      assert.equal(await new ImportMutations(storage).changed(counts, hasTag), true);
      expect(hasTag).not.toHaveBeenCalled();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
