import type { Readable } from 'node:stream';
import type { StorageBase } from 'ghost-storage-base';
import errors from '@tryghost/errors';
import { z } from 'zod';
import type { VersionedImportStorage } from '../../../adapters/storage/import-storage';
import { ImportUploadRepository, type ImportOwner, type ImportUpload } from './upload-repository';

export interface StagedImportFile {
  key: string;
  name: string;
}

export interface DownloadedImportFile {
  path: string;
  cleanup(): Promise<void>;
}

type Submission =
  | { status: 'ready'; file: StagedImportFile }
  | { status: 'accepted'; total: number };

const receiptSchema = z.object({ total: z.number().int().nonnegative() });

function assertOwnedUpload(
  row: ImportUpload | undefined,
  owner: ImportOwner,
  now: Date,
): asserts row is ImportUpload {
  if (!row || row.owner_id !== owner.id || row.owner_type !== owner.type || row.expires_at <= now) {
    throw new errors.NotFoundError({ message: 'This CSV upload is no longer available.' });
  }
}

export function uncertainSubmission(error?: unknown) {
  return new errors.ConflictError({
    message: 'CSV import submission uncertain; upload again.',
    code: 'CSV_IMPORT_SUBMISSION_UNCERTAIN',
    err: error instanceof Error ? error : undefined,
  });
}

function receipt(row: ImportUpload): number | undefined {
  if (row.state === 'accepted' || row.state === 'finished') {
    return receiptSchema.parse(JSON.parse(row.receipt ?? '{}')).total;
  }
  if (row.state === 'submitting') {
    throw uncertainSubmission();
  }
  if (row.state !== 'ready') {
    throw new errors.NotFoundError({ message: 'This CSV upload is no longer available.' });
  }
  return undefined;
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
  cancel(id: string, owner: ImportOwner): Promise<void>;
  lookup(id: string, owner: ImportOwner, now: Date): Promise<Submission>;
  claim(id: string, owner: ImportOwner, now: Date, total: number): Promise<number | undefined>;
  cleanupExpired(now: Date, report: (error: unknown) => void): Promise<void>;
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

  function assertSourceKey(id: string, key: string): void {
    const directory = prefix(id) + '/';
    const name = key.slice(directory.length);
    if (!key.startsWith(directory) || !name || name === '.' || name === '..' || /[/\\]/.test(name)) {
      throw new errors.InternalServerError({ message: 'Invalid CSV upload source.' });
    }
  }

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
        const key = storage.urlToPath(url);
        assertSourceKey(id, key);
        file.key = key;
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

    async lookup(id, owner, now) {
      const row = await uploads.get(id);
      assertOwnedUpload(row, owner, now);
      const total = receipt(row);
      if (total !== undefined) {
        return { status: 'accepted', total };
      }
      const { file } = row;
      assertSourceKey(id, file.key);
      return { status: 'ready', file };
    },

    async claim(id, owner, now, total) {
      return uploads.change(id, (row) => {
        assertOwnedUpload(row, owner, now);
        const existing = receipt(row);
        if (existing !== undefined) {
          return { value: existing };
        }
        return {
          value: undefined,
          change: { state: 'submitting', receipt: JSON.stringify({ total }) },
        };
      });
    },

    async cleanupExpired(now, report) {
      for await (const id of uploads.ids()) {
        try {
          const eligible = await uploads.change(id, (row) => {
            if (!row || row.state === 'deleting') {
              return { value: true };
            }
            if (row.state !== 'accepted' && row.expires_at <= now) {
              return { value: true, change: { state: 'deleting' } };
            }
            return { value: false };
          });
          if (eligible) {
            const storage = importsStorage(getStorage());
            const directory = prefix(id);
            let cursor: string | undefined;
            do {
              const page = await storage.listPrefix(directory, { cursor });
              for (const key of page.keys) {
                if (key.startsWith(`${directory}/`)) {
                  await storage.delete(key);
                }
              }
              cursor = page.cursor;
            } while (cursor);
            await storage.delete(directory);
            await uploads.remove(id);
          }
        } catch (error) {
          // Leave the manifest eligible so the next tick can retry cleanup.
          report(error);
        }
      }
    },

    async cancel(id, owner) {
      const file = await uploads.change(id, (row) => {
        if (!row || row.owner_id !== owner.id || row.owner_type !== owner.type) {
          throw new errors.NotFoundError({ message: 'This CSV upload is no longer available.' });
        }
        if (row.state !== 'ready' && row.state !== 'deleting') {
          throw new errors.ConflictError({
            message: 'This CSV upload can no longer be cancelled.',
          });
        }
        assertSourceKey(id, row.file.key);
        return row.state === 'deleting'
          ? { value: row.file }
          : { value: row.file, change: { state: 'deleting' } };
      });
      await remove(id, file);
    },

    remove,
  };
}
