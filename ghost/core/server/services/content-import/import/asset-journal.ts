import errors from '@tryghost/errors';
import {
  JournalBatch,
  journalRecord,
  readJSONParts,
  readJournalPosition,
  readMetadata,
  scopeJournalStorage,
  type JournalStorage,
} from './journal';

export interface StoredAsset {
  originalPath: string;
  newPath: string;
  stored: string;
}

export async function openAssetJournal(storage: JournalStorage) {
  const scoped = scopeJournalStorage(storage, 'assets');
  const failure = await readMetadata(scoped, 'failure.txt');
  if (failure) {
    throw new errors.InternalServerError({ message: failure });
  }
  const position = await readJournalPosition(scoped);
  const batch = new JournalBatch(scoped, position, false);
  const assets = new Map<string, StoredAsset>();
  for await (const asset of readJSONParts<StoredAsset>(scoped, position)) {
    assets.set(asset.originalPath, asset);
  }
  return {
    assets,
    append: (asset: StoredAsset) => batch.append({ outcome: journalRecord(asset) }),
    flush: () => batch.flush(),
    // Record the terminal decision before rollback so a crash during rollback
    // cannot replay mappings to assets that have been removed.
    stop: async (error: unknown) => {
      await batch.flush().catch(() => {});
      const message = error instanceof Error ? error.message : 'CSV asset storage failed.';
      await scoped.replaceMetadata('failure.txt', Buffer.from(message.slice(0, 1000)));
    },
  };
}

export type AssetJournal = Awaited<ReturnType<typeof openAssetJournal>>;
