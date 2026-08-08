import {describe, it} from 'node:test';
import assert from 'node:assert';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {
    PUBLIC_APPS,
    DEFAULTS_PATH,
    DEFAULTS_REPO_PATH,
    appForPackageName,
    bumpVersionLine,
    parseVersionLine,
    readDefaults,
    versionLineFor,
} from '../lib/public-apps.js';
import {readJson} from '../lib/utils.js';
import { ROOT_DIR } from '../lib/constants.js';

describe('parseVersionLine', () => {
    it('splits a major.minor line', () => {
        assert.deepStrictEqual(parseVersionLine('2.69'), {major: 2, minor: 69});
        assert.deepStrictEqual(parseVersionLine('0.1'), {major: 0, minor: 1});
        assert.deepStrictEqual(parseVersionLine('10.20'), {major: 10, minor: 20});
    });

    it('rejects anything that is not a bare major.minor', () => {
        for (const bad of ['garbage', '1.2.3', '', '01.2', 'v1.2', '1']) {
            assert.throws(() => parseVersionLine(bad), /Invalid major\.minor version line/, `expected "${bad}" to throw`);
        }
    });
});

describe('bumpVersionLine', () => {
    it('bumps the minor', () => {
        assert.strictEqual(bumpVersionLine('2.69', 'minor'), '2.70');
        assert.strictEqual(bumpVersionLine('0.1', 'minor'), '0.2');
    });

    it('bumps the major and resets the minor', () => {
        assert.strictEqual(bumpVersionLine('2.69', 'major'), '3.0');
        assert.strictEqual(bumpVersionLine('0.1', 'major'), '1.0');
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

describe('versionLineFor', () => {
    it('reads the line every public app publishes on', async () => {
        const defaults = await readDefaults();

        for (const app of PUBLIC_APPS) {
            assert.doesNotThrow(() => parseVersionLine(versionLineFor(app, defaults)), `${app.packageName}`);
        }
    });

    it('throws for an app defaults.json does not pin', () => {
        assert.throws(
            () => versionLineFor({configKey: 'nope', packageName: '@tryghost/nope'}, {}),
            /has no "nope\.version"/
        );
    });
});

describe('public app package.json versions', () => {
    // The publish job overwrites this field with the version it computes from
    // defaults.json + npm, so a committed value would only ever be a stale
    // second source of truth for the version line.
    it('are placeholders, not a version line', async () => {
        for (const app of PUBLIC_APPS) {
            const {version} = await readJson(join(ROOT_DIR, app.path, 'package.json'));

            assert.strictEqual(version, '0.0.0', `${app.packageName} should pin no version in package.json`);
        }
    });
});
