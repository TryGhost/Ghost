// Vitest global setup — runs once in the main process around the whole run.
// vitest-setup.ts gives each worker a session sqlite database at
// /tmp/ghost-test-<id>.db; with the unit suite running on `isolate: false`
// those files are no longer removed per test file, so they are cleaned up
// here once, after the run has completed.
import {globSync} from 'glob';
import fs from 'fs-extra';

export function teardown(): void {
    for (const file of globSync('/tmp/ghost-test-*.db*')) {
        try {
            fs.removeSync(file);
        } catch {
            // best effort — a concurrent run may have removed it already
        }
    }
}
