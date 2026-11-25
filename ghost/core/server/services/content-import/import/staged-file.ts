import type { Readable } from 'node:stream';
import type { StorageBase } from 'ghost-storage-base';
import errors from '@tryghost/errors';
import {
  clearImportPrefix,
  type VersionedImportStorage,
} from '../../../adapters/storage/import-storage';
import {
  ImportUploadRepository,
  type ImportOwner,
  type ImportUpload,
  type ImportProgress,
} from './upload-repository';
import { readJournalPosition, type JournalStorage } from './journal';
import { createReportArchive } from './report-archive';

export interface StagedImportFile {
  key: string;
  name: string;
}

export interface DownloadedImportFile {
  path: string;
  cleanup(): Promise<void>;
}

type Submission = { status: 'ready'; file: StagedImportFile } | { status: 'accepted' };

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

function isAccepted(row: ImportUpload): boolean {
  if (row.state === 'accepted' || row.state === 'finished') {
    return true;
  }
  if (row.state === 'submitting') {
    throw uncertainSubmission();
  }
  if (row.state !== 'ready') {
    throw new errors.NotFoundError({ message: 'This CSV upload is no longer available.' });
  }
  return false;
}

export interface ImportFileStager {
  reports: ReturnType<typeof createReportArchive>;
  stage(
    file: { filePath: string; fileName: string; owner?: ImportOwner; total?: number },
    id: string,
    now: Date,
  ): Promise<StagedImportFile>;
  download(file: StagedImportFile): Promise<DownloadedImportFile>;
  artifacts(id: string): JournalStorage;
  clearArtifacts(id: string): Promise<void>;
  begin(id: string): Promise<void>;
  acknowledge(id: string): Promise<void>;
  start(id: string, now: Date): Promise<boolean>;
  claimEmail(id: string): Promise<boolean>;
  claimCacheInvalidation(id: string): Promise<boolean>;
  progress(id: string, owner: ImportOwner, now: Date): Promise<ImportProgress>;
  finalizeProgress(id: string, outcome: 'complete' | 'failed'): Promise<void>;
  finishProgress(id: string): Promise<void>;
  remove(id: string, file: StagedImportFile): Promise<void>;
  cancel(id: string, owner: ImportOwner): Promise<void>;
  lookup(id: string, owner: ImportOwner, now: Date): Promise<Submission>;
  claim(id: string, owner: ImportOwner, now: Date): Promise<boolean>;
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
    if (
      !key.startsWith(directory) ||
      !name ||
      name === '.' ||
      name === '..' ||
      /[/\\]/.test(name)
    ) {
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
    if (discard) {
      // A failed save may have created an object before returning its actual key.
      await clearImportPrefix(storage, prefix(id));
      await uploads.remove(id);
    } else {
      await storage.delete(file.key);
    }
  }

  function artifacts(id: string): JournalStorage {
    const storage = importsStorage(getStorage());
    const key = (name: string) => `${prefix(id)}/journal/${name}`;
    return {
      readStream: ({ path: name }) => storage.readStream({ path: key(name) }),
      writeStream: (name, source) => storage.writeStream(key(name), source),
      replaceMetadata: (name, bytes) => storage.replaceMetadata(key(name), bytes),
    };
  }

  function assertProgressOwner(
    row: ImportUpload | undefined,
    owner: ImportOwner,
    now: Date,
  ): asserts row is ImportUpload & { progress: NonNullable<ImportUpload['progress']> } {
    // Accepted imports remain protected while queued/running, even past staging expiry.
    if (
      !row ||
      (row.state !== 'accepted' && row.state !== 'finished') ||
      row.owner_id !== owner.id ||
      row.owner_type !== owner.type ||
      (row.state === 'finished' && row.expires_at <= now) ||
      !row.progress
    ) {
      throw new errors.NotFoundError({
        message: 'This CSV import progress is no longer available.',
      });
    }
  }

  return {
    reports: createReportArchive(privateStorage, namespace),
    artifacts,
    clearArtifacts(id) {
      return clearImportPrefix(privateStorage(), `${prefix(id)}/journal`);
    },
    async stage({ filePath, fileName, owner, total }, id, now) {
      const storage = importsStorage(getStorage());
      const uploadOwner = owner ?? (await getDefaultOwner());
      const file = { key: `${prefix(id)}/source`, name: fileName };
      await uploads.create(id, uploadOwner, now, file, total);
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

    async begin(id) {
      await uploads.change(id, (row) => {
        if (row?.state !== 'ready') {
          throw new errors.NotFoundError({ message: 'This CSV upload is no longer available.' });
        }
        return {
          value: undefined,
          change: { state: 'submitting' },
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
      return uploads.change(id, (row) => {
        if (row?.state === 'accepted' && row.receipt === 'email-claimed') {
          return { value: false };
        }
        if (
          !row ||
          (row.state !== 'accepted' && (row.state !== 'submitting' || row.expires_at <= now))
        ) {
          throw new errors.NotFoundError({ message: 'This CSV upload is no longer available.' });
        }
        return {
          value: true,
          change: {
            state: 'accepted',
            progress: { processed: 0, total: null, ...row.progress, status: 'running' },
          },
        };
      });
    },

    async progress(id, owner, now) {
      let row = await uploads.get(id);
      assertProgressOwner(row, owner, now);
      let processed = row.progress.processed;
      if (row.progress.status === 'running') {
        let checkpointError: unknown;
        try {
          processed = (await readJournalPosition(artifacts(id))).record;
        } catch (error) {
          checkpointError = error;
        }
        // Finalization can delete the checkpoint during a poll. Re-read the manifest
        // to use its retained final count rather than reporting zero after cleanup.
        row = await uploads.get(id);
        assertProgressOwner(row, owner, now);
        if (checkpointError && row.progress.status === 'running') {
          throw checkpointError;
        }
      }
      const progress = row.progress;
      return {
        status: progress.status,
        total: progress.total,
        processed: Math.max(processed, progress.processed),
      };
    },

    async finalizeProgress(id, outcome) {
      const { record } = await readJournalPosition(artifacts(id));
      await uploads.change(id, (row) => ({
        value: undefined,
        ...(row?.state === 'accepted'
          ? {
              change: {
                progress: {
                  status: 'finalizing' as const,
                  processed: record,
                  total: row.progress?.total ?? (outcome === 'complete' ? record : null),
                  outcome,
                },
              },
            }
          : {}),
      }));
    },

    async finishProgress(id) {
      // Redelivery after the email claim skips processing, but must retain its outcome.
      await uploads.change(id, (row) => ({
        value: undefined,
        ...(row?.progress?.outcome
          ? { change: { progress: { ...row.progress, status: row.progress.outcome } } }
          : {}),
      }));
    },

    async claimEmail(id) {
      return uploads.change(id, (row) => {
        if (row?.state !== 'accepted' || row.receipt === 'email-claimed') {
          return { value: false };
        }
        return { value: true, change: { receipt: 'email-claimed' } };
      });
    },

    async claimCacheInvalidation(id) {
      return uploads.change(id, (row) => {
        if (row?.state !== 'accepted' || row.receipt !== null) {
          return { value: false };
        }
        return { value: true, change: { receipt: 'cache-invalidation-claimed' } };
      });
    },

    async lookup(id, owner, now) {
      const row = await uploads.get(id);
      assertOwnedUpload(row, owner, now);
      if (isAccepted(row)) {
        return { status: 'accepted' };
      }
      const { file } = row;
      assertSourceKey(id, file.key);
      return { status: 'ready', file };
    },

    async claim(id, owner, now) {
      return uploads.change(id, (row) => {
        assertOwnedUpload(row, owner, now);
        if (isAccepted(row)) {
          return { value: false };
        }
        return {
          value: true,
          change: { state: 'submitting' },
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
            await clearImportPrefix(privateStorage(), prefix(id));
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
