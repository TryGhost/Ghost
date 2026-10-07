import crypto from 'node:crypto';
import type { StorageBase } from 'ghost-storage-base';
import type { MemberImportRow } from './row';

// write() returns the key the rows are stored under: a plain string a background job can
// carry and hand back to read() and remove(), whichever spool instance its process built.
// remove() lets its failures out rather than hiding them: the file holds member names,
// emails and Stripe customer ids, so one left behind is worth knowing about.
export interface RowSpool {
  write(rows: MemberImportRow[]): Promise<string>;
  read(key: string): Promise<MemberImportRow[]>;
  remove(key: string): Promise<void>;
}

// Spools import rows to a JSON file in the imports storage adapter, so a deferred
// import can hand them to a background job and read them back after the request has
// already returned. The rows go in and come out as MemberImportRow, so nothing but
// the import's own row shape crosses this boundary.
export function createRowSpool(storage: StorageBase): RowSpool {
  return {
    async write(rows) {
      const key = `members-import-${crypto.randomUUID()}.json`;
      await storage.saveRaw(Buffer.from(JSON.stringify(rows)), key);
      return key;
    },
    async read(key) {
      return JSON.parse((await storage.read({ path: key })).toString('utf8'));
    },
    async remove(key) {
      await storage.delete(key);
    },
  };
}
