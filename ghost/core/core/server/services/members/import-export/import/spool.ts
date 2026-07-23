import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import type {MemberImportRow} from './row';

// A handle to rows written to a spool: the deferred job reads them back once it
// runs, then removes the file. Removal swallows errors -- a failed cleanup must
// never fail the import it was cleaning up after.
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
                    await fs.remove(spoolPath).catch(() => {});
                }
            };
        }
    };
}
