import crypto from 'node:crypto';
import path from 'node:path';
import type { StorageBase } from 'ghost-storage-base';

export interface StagedImportFile {
  path: string;
  name: string;
}

export interface ImportFileStager {
  stage(file: { filePath: string; fileName: string }): Promise<StagedImportFile>;
  remove(file: StagedImportFile): Promise<void>;
}

// Stages uploads at the root of the imports storage adapter. The job reads the staged
// file from its path, so the adapter is the local store storage:imports defaults to.
export function createImportFileStager(getStorage: () => StorageBase): ImportFileStager {
  return {
    async stage({ filePath, fileName }) {
      const storage = getStorage();
      const name = `content-csv-import-${crypto.randomUUID()}`;

      try {
        const url = await storage.save({ name, path: filePath }, storage.storagePath);
        return { path: path.join(storage.storagePath, storage.urlToPath(url)), name: fileName };
      } catch (error) {
        await storage.delete(name).catch(() => {});
        throw error;
      }
    },

    async remove(file) {
      await getStorage().delete(path.basename(file.path));
    },
  };
}
