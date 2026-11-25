import {
  readJournalPosition,
  readMetadata,
  scopeJournalStorage,
  type JournalStorage,
} from './journal';
import type { OutcomeCounts } from './summary';

const ASSET_WRITE = 'assets-stored.txt';

export class ImportMutations {
  private storage: JournalStorage;
  private assetWrite?: Promise<void>;

  constructor(storage: JournalStorage) {
    this.storage = storage;
  }

  recordAssetWrite(): Promise<void> {
    this.assetWrite ??= this.storage.replaceMetadata(ASSET_WRITE, Buffer.from('1'));
    return this.assetWrite;
  }

  async changed(counts: OutcomeCounts, hasTaggedPosts: () => Promise<boolean>): Promise<boolean> {
    if (counts.created || counts.updated || this.assetWrite) {
      return true;
    }
    if (await readMetadata(this.storage, ASSET_WRITE)) {
      return true;
    }
    if ((await readJournalPosition(scopeJournalStorage(this.storage, 'assets'))).record > 0) {
      return true;
    }
    // A post transaction can commit before its outcome reaches the journal.
    return hasTaggedPosts();
  }
}
