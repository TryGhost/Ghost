import {describe, it} from 'node:test';
import assert from 'node:assert';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {
    PUBLIC_APPS,
    DEFAULTS_PATH,
    DEFAULTS_REPO_PATH,
    appForPackageName,
    majorMinor,
    readDefaults,
} from '../lib/public-apps.js';
import {readJson} from '../lib/utils.js';
import { ROOT_DIR } from '../lib/constants.js';

describe('majorMinor', () => {
    it('reduces a version to its major.minor line', () => {
        assert.strictEqual(majorMinor('2.69.16'), '2.69');
        assert.strictEqual(majorMinor('0.1.11'), '0.1');
        assert.strictEqual(majorMinor('10.20.30'), '10.20');
    });

    it('ignores prerelease and build metadata', () => {
        assert.strictEqual(majorMinor('6.19.0-rc.0'), '6.19');
        assert.strictEqual(majorMinor('1.2.3+build.5'), '1.2');
    });

    it('accepts a leading v', () => {
        assert.strictEqual(majorMinor('v6.17.1'), '6.17');
    });

    it('rejects anything that is not a full semver version', () => {
        for (const bad of ['garbage', '1.2', '', '01.2.3', '1.2.3.4']) {
            assert.throws(() => majorMinor(bad), /Invalid semver version/, `expected "${bad}" to throw`);
        }
    });
});

describe('appForPackageName', () => {
    it('finds a public app', () => {
        assert.strictEqual(appForPackageName('@tryghost/comments-ui').configKey, 'comments');
    });

    it('throws for a package that is not an app', () => {
        assert.throws(() => appForPackageName('@tryghost/admin'), /not found in public-apps/);
    });
});

describe('paths', () => {
    it('resolves defaults.json to a file that exists', () => {
        assert.ok(existsSync(DEFAULTS_PATH));
    });

    it('derives the absolute path from the repo-relative one', () => {
        assert.ok(DEFAULTS_PATH.endsWith(`/${DEFAULTS_REPO_PATH}`));
    });
});

describe('the major.minor invariant', () => {
    // This is the rule release-apps writes and check-app-version-bump verifies.
    // If the repo ever violates it, one of those two is broken — or someone
    // hand-edited a version without running "pnpm ship".
    it('holds for every public app in the repo right now', async () => {
        const defaults = await readDefaults();

        for (const app of PUBLIC_APPS) {
            const {version} = await readJson(join(ROOT_DIR, app.path, 'package.json'));

            assert.strictEqual(
                defaults[app.configKey].version,
                majorMinor(version),
                `${app.packageName}: package.json is ${version}, defaults.json says ${defaults[app.configKey].version}`
            );
        }
    });
});
