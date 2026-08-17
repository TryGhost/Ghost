import {describe, it} from 'node:test';
import assert from 'node:assert';

import {getFileFromCommit} from '../lib/git.js';

// These run against the live repo. git.js binds git to ROOT_DIR, so the paths
// here are repo-relative regardless of the process working directory.
const EXISTING_PATH = 'package.json'; // the repo-root manifest, present at HEAD
const MISSING_PATH = 'this/path/does/not/exist.json';
const INVALID_COMMIT = 'not-a-real-ref-zzzzzz';

describe('getFileFromCommit', () => {
    it('returns file contents for a path present in the commit', async () => {
        const contents = await getFileFromCommit('HEAD', EXISTING_PATH);
        assert.match(contents, /"name"/);
    });

    it('throws for a missing path by default', async () => {
        await assert.rejects(
            () => getFileFromCommit('HEAD', MISSING_PATH),
            /Failed to retrieve file from commit/
        );
    });

    it('returns null for a missing path when allowMissing is set', async () => {
        const contents = await getFileFromCommit('HEAD', MISSING_PATH, {allowMissing: true});
        assert.strictEqual(contents, null);
    });

    it('still throws for an invalid commit even when allowMissing is set', async () => {
        await assert.rejects(
            () => getFileFromCommit(INVALID_COMMIT, EXISTING_PATH, {allowMissing: true}),
            /Failed to retrieve file from commit/
        );
    });
});
