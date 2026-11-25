import type { Readable } from 'node:stream';
import type { StorageBase } from 'ghost-storage-base';
import errors from '@tryghost/errors';
import type { VersionedImportStorage } from '../../../adapters/storage/import-storage';
import { ImportUploadRepository, type ImportOwner } from './upload-repository';

export interface StagedImportFile {
  key: string;
  name: string;
}

export interface DownloadedImportFile {
  path: string;
  cleanup(): Promise<void>;
}

export interface ImportFileStager {
  stage(
    file: { filePath: string; fileName: string; owner?: ImportOwner },
    id: string,
    now: Date,
  ): Promise<StagedImportFile>;
  download(file: StagedImportFile): Promise<DownloadedImportFile>;
  begin(id: string, total: number): Promise<void>;
  acknowledge(id: string): Promise<void>;
  start(id: string, now: Date): Promise<void>;
  remove(id: string, file: StagedImportFile): Promise<void>;
}

type ImportsStorage = VersionedImportStorage & Pick<StorageBase, 'save' | 'urlToPath'>;

function importsStorage(value: unknown): ImportsStorage {
  const storage = value as Partial<ImportsStorage> | undefined;
  if (
    typeof storage?.readStream !== 'function' ||
    typeof storage.save !== 'function' ||
    typeof storage.urlToPath !== 'function' ||
    typeof storage.writeStream !== 'function' ||
    typeof storage.listPrefix !== 'function' ||
    typeof storage.replaceMetadata !== 'function' ||
    typeof storage.readVersionedMetadata !== 'function' ||
    typeof storage.writeVersionedMetadata !== 'function' ||
    typeof storage.deleteVersionedMetadata !== 'function' ||
    typeof storage.delete !== 'function'
  ) {
    throw new errors.IncorrectUsageError({
      message: 'The configured imports storage adapter does not support CSV imports.',
      help: 'Use local or S3 imports storage, or configure an adapter with streaming, prefix listing and conditional metadata writes.',
    });
  }
  return storage as ImportsStorage;
}

export function createImportFileStager({
  downloadToTempFile,
  getStorage,
  namespace,
  getDefaultOwner,
}: {
  downloadToTempFile: (open: () => Promise<Readable>) => Promise<DownloadedImportFile>;
  getStorage: () => unknown;
  namespace: () => string;
  getDefaultOwner: () => Promise<ImportOwner>;
}): ImportFileStager {
  const prefix = (id: string) => `content-csv-import/${namespace()}/${id}`;
  const privateStorage = () => importsStorage(getStorage());
  const uploads = new ImportUploadRepository(
    privateStorage,
    () => `content-csv-uploads/${namespace()}`,
  );

  async function remove(id: string, file: StagedImportFile): Promise<void> {
    const discard = await uploads.change(id, (row) => {
      if (row?.state === 'accepted') {
        return { value: false, change: { state: 'finished' } };
      }
      if (row?.state === 'finished') {
        return { value: false };
      }
      return row && row.state !== 'deleting'
        ? { value: true, change: { state: 'deleting' } }
        : { value: true };
    });
    const storage = importsStorage(getStorage());
    await storage.delete(file.key);
    if (discard) {
      await uploads.remove(id);
    }
  }

  return {
    async stage({ filePath, fileName, owner }, id, now) {
      const storage = importsStorage(getStorage());
      const uploadOwner = owner ?? (await getDefaultOwner());
      const file = { key: `${prefix(id)}/source`, name: fileName };
      await uploads.create(id, uploadOwner, now, file);
      try {
        const source = { name: 'source', path: filePath, private: true };
        const url = await storage.save(source, prefix(id));
        file.key = storage.urlToPath(url);
        await uploads.change(id, (upload) => {
          if (upload?.state !== 'staging') {
            throw new errors.NotFoundError({ message: 'This CSV upload is no longer available.' });
          }
          return { value: undefined, change: { state: 'ready', file } };
        });
        return file;
      } catch (error) {
        // Leave the manifest in storage if deletion failed so expiry can retry.
        await remove(id, file).catch(() => {});
        throw error;
      }
    },

    download(file) {
      return downloadToTempFile(() => privateStorage().readStream({ path: file.key }));
    },

    async begin(id, total) {
      await uploads.change(id, (row) => {
        if (row?.state !== 'ready') {
          throw new errors.NotFoundError({ message: 'This CSV upload is no longer available.' });
        }
        return {
          value: undefined,
          change: { state: 'submitting', receipt: JSON.stringify({ total }) },
        };
      });
    },

    async acknowledge(id) {
      await uploads.change(id, (row) => ({
        value: undefined,
        ...(row?.state === 'submitting' ? { change: { state: 'accepted' as const } } : {}),
      }));
    },

    async start(id, now) {
      await uploads.change(id, (row) => {
        if (row?.state === 'accepted') {
          return { value: undefined };
        }
        if (row?.state !== 'submitting' || row.expires_at <= now) {
          throw new errors.NotFoundError({ message: 'This CSV upload is no longer available.' });
        }
        return { value: undefined, change: { state: 'accepted' } };
      });
    },

    remove,
  };
}
