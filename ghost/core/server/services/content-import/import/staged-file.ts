import crypto from 'node:crypto';
import type { Readable } from 'node:stream';
import type { StorageBase } from 'ghost-storage-base';

export interface StagedImportFile {
  key: string;
  name: string;
}

export interface DownloadedImportFile {
  path: string;
  cleanup(): Promise<void>;
}

export interface ImportFileStager {
  stage(file: { filePath: string; fileName: string }): Promise<StagedImportFile>;
  download(file: StagedImportFile): Promise<DownloadedImportFile>;
  remove(file: StagedImportFile): Promise<void>;
}

type ImportsStorage = StorageBase & {
  readStream(options: { path: string }): Promise<Readable>;
};

export function createImportFileStager(
  getStorage: () => ImportsStorage,
  downloadToTempFile: (open: () => Promise<Readable>) => Promise<DownloadedImportFile>,
): ImportFileStager {
  return {
    async stage({ filePath, fileName }) {
      const storage = getStorage();
      const name = `content-csv-import-${crypto.randomUUID()}`;

      try {
        const url = await storage.save({ name, path: filePath }, storage.storagePath);
        return { key: storage.urlToPath(url), name: fileName };
      } catch (error) {
        await storage.delete(name).catch(() => {});
        throw error;
      }
    },

    download(file) {
      return downloadToTempFile(() => getStorage().readStream({ path: file.key }));
    },

    async remove(file) {
      await getStorage().delete(file.key);
    },
  };
}
