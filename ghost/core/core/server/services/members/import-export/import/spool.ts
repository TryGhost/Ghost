import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import type {MemberImportRow} from './row';

// A handle to rows written to a spool: the deferred job reads them back once it
// runs, then removes the file. Removal reports its failures rather than hiding
// them: the file holds member names, emails and Stripe customer ids, so one left
// behind is worth knowing about. Keeping a failed cleanup from failing the import
// is the caller's business, and it is the caller that can say so.
export interface SpooledRows {
    read(): Promise<MemberImportRow[]>;
    remove(): Promise<void>;
}

export interface RowSpool {
    write(rows: MemberImportRow[]): Promise<SpooledRows>;
}

// Spools import rows to a private JSON file under the OS temp dir, so a deferred
// import can hand them to a background job and read them back after the request has
// already returned. The rows go in and come out as MemberImportRow, so nothing but
// the import's own row shape crosses this boundary.
export function createRowSpool(): RowSpool {
    return {
        async write(rows) {
            const spoolPath = path.join(os.tmpdir(), `members-import-${crypto.randomUUID()}.json`);
            await fs.writeFile(spoolPath, JSON.stringify(rows), {mode: 0o600});
            return {
                async read() {
                    return JSON.parse(await fs.readFile(spoolPath, 'utf8'));
                },
                async remove() {
                    await fs.remove(spoolPath);
                }
            };
        }
    };
}
