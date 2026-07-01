import path from 'node:path';
import {defineConfig} from 'vitest/config';

// Root Vitest config — a single watcher across every Vitest-based package in
// the monorepo. `pnpm test:watch` runs this. Each package is a project that
// keeps its own config (environment, setup, pool); scope to one with a path
// filter, e.g. `pnpm test:watch apps/posts`.
//
// Not included: ghost-admin (Ember Mocha, pending the Ember retirement).
// admin-x-activitypub is a dead directory with no
// package.json or test config. signup-form has no Vitest unit tests (its
// test:unit is a build; test/unit holds only an empty placeholder).
export default defineConfig({
    test: {
        projects: [
            'ghost/core',
            'ghost/i18n',
            'ghost/parse-email-address',
            'apps/*',
            '!apps/admin-x-activitypub',
            '!apps/signup-form'
        ],
        // ghost/core's snapshot tests use @tryghost/jest-snapshot, which
        // manages its own __snapshots__/*.snap files. Vitest's native
        // snapshot system would otherwise adopt and rewrite them (down to the
        // header). The project-level resolveSnapshotPath in
        // ghost/core/vitest.config.ts is not honored once projects run under
        // this root config, so redirect ghost/core's native snapshots to a
        // never-written path here. App projects keep the default location.
        resolveSnapshotPath: (testPath, snapExtension) => {
            const isGhostCore = testPath.includes(`${path.sep}ghost${path.sep}core${path.sep}`);
            const dir = isGhostCore ? '__vitest_snapshots__' : '__snapshots__';
            return path.join(path.dirname(testPath), dir, path.basename(testPath) + snapExtension);
        }
    }
});
