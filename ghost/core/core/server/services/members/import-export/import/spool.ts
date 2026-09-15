import crypto from 'node:crypto';
import type { StorageBase } from 'ghost-storage-base';
import type { MemberImportRow } from './row';

// remove() lets its failures out rather than hiding them: the file holds member names,
// emails and Stripe customer ids, so one left behind is worth knowing about.
export interface SpooledRows {
  read(): Promise<MemberImportRow[]>;
  remove(): Promise<void>;
}

export interface RowSpool {
  write(rows: MemberImportRow[]): Promise<SpooledRows>;
}

// Spools import rows to a JSON file in the imports storage adapter, so a deferred
// import can hand them to a background job and read them back after the request has
// already returned. The rows go in and come out as MemberImportRow, so nothing but
// the import's own row shape crosses this boundary.
export function createRowSpool(getStorage: () => StorageBase): RowSpool {
  return {
    async write(rows) {
      const storage = getStorage();
      const spoolPath = `members-import-${crypto.randomUUID()}.json`;
      await storage.saveRaw(Buffer.from(JSON.stringify(rows)), spoolPath);
      return {
        async read() {
          return JSON.parse((await storage.read({ path: spoolPath })).toString('utf8'));
        },
        async remove() {
          await storage.delete(spoolPath);
        },
      };
    },
  };
}
