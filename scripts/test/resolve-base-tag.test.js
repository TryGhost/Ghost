const {describe, it, before, after} = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const {execSync} = require('node:child_process');
const semver = require('semver');
const {resolveBaseTag} = require('../lib/resolve-base-tag');

/**
 * Create a temporary git repo with semver tags for testing.
 * Returns the repo path. Caller is responsible for cleanup.
 */
function createTestRepo() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-release-test-'));

    execSync([
        `cd ${tmpDir}`,
        'git init',
        'git config user.email "test@test.com"',
        'git config user.name "Test"',

        // Initial commit + stable tag v6.17.0
        'echo "initial" > file.txt',
        'git add .',
        'git commit -m "initial"',
        'git tag v6.17.0',

        // Second commit + stable tag v6.17.1
        'echo "patch" >> file.txt',
        'git add .',
        'git commit -m "patch release"',
        'git tag v6.17.1',

        // Third commit (no tag — simulates post-release development)
        'echo "new work" >> file.txt',
        'git add .',
        'git commit -m "post-release commit"'
    ].join(' && '));

    return tmpDir;
}

describe('resolveBaseTag', () => {
    let testRepo;

    before(() => {
        testRepo = createTestRepo();
    });

    after(() => {
        fs.rmSync(testRepo, {recursive: true, force: true});
    });

    describe('semver.prerelease detection', () => {
        it('returns null for stable versions', () => {
            assert.strictEqual(semver.prerelease('6.17.1'), null);
            assert.strictEqual(semver.prerelease('6.18.0'), null);
            assert.strictEqual(semver.prerelease('5.0.0'), null);
        });

        it('returns prerelease components for rc versions', () => {
            const result = semver.prerelease('6.19.0-rc.0');
            assert.deepStrictEqual(result, ['rc', 0]);
        });

        it('returns prerelease components for alpha versions', () => {
            const result = semver.prerelease('7.0.0-alpha.1');
            assert.deepStrictEqual(result, ['alpha', 1]);
        });
    });

    describe('stable version path', () => {
        it('constructs tag directly from version', () => {
            // Stable versions don't hit git — the tag is just v{version}
            const {tag, isPrerelease} = resolveBaseTag('6.17.1', '/nonexistent');
            assert.strictEqual(tag, 'v6.17.1');
            assert.strictEqual(isPrerelease, false);
        });

        it('works for any stable version format', () => {
            const {tag} = resolveBaseTag('5.0.0', '/nonexistent');
            assert.strictEqual(tag, 'v5.0.0');
        });
    });

    describe('prerelease version path', () => {
        it('resolves to the latest stable tag', () => {
            const {tag, isPrerelease} = resolveBaseTag('6.19.0-rc.0', testRepo);
            assert.strictEqual(isPrerelease, true);
            assert.strictEqual(tag, 'v6.17.1');
        });

        it('resolved tag is a stable version (no prerelease suffix)', () => {
            const {tag} = resolveBaseTag('6.19.0-rc.0', testRepo);
            assert.match(tag, /^v\d+\.\d+\.\d+$/);
            assert.strictEqual(semver.prerelease(tag.slice(1)), null);
        });

        it('resolved tag is a valid git ref', () => {
            const {tag} = resolveBaseTag('6.19.0-rc.0', testRepo);
            const sha = execSync(`cd ${testRepo} && git rev-parse ${tag}`, {encoding: 'utf8'});
            assert.ok(sha.trim().length > 0, 'Tag should resolve to a commit SHA');
        });

        it('git diff succeeds with the resolved tag', () => {
            const {tag} = resolveBaseTag('6.19.0-rc.0', testRepo);
            const result = execSync(
                `cd ${testRepo} && git diff --diff-filter=A --name-only ${tag} HEAD`,
                {encoding: 'utf8'}
            );
            assert.strictEqual(typeof result, 'string');
        });

        it('git log succeeds with the resolved tag', () => {
            const {tag} = resolveBaseTag('6.19.0-rc.0', testRepo);
            const result = execSync(
                `cd ${testRepo} && git log --oneline ${tag}..HEAD`,
                {encoding: 'utf8'}
            );
            assert.strictEqual(typeof result, 'string');
            // Should have at least 1 commit (the post-release commit)
            assert.ok(result.trim().length > 0, 'Should find commits after the tag');
        });
    });

    describe('prerelease excludes prerelease tags', () => {
        let repoWithPrereleaseTag;

        before(() => {
            // Create a repo that has both stable and prerelease tags
            repoWithPrereleaseTag = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-release-test-pre-'));
            execSync([
                `cd ${repoWithPrereleaseTag}`,
                'git init',
                'git config user.email "test@test.com"',
                'git config user.name "Test"',

                'echo "initial" > file.txt',
                'git add .',
                'git commit -m "initial"',
                'git tag v6.17.0',

                'echo "alpha" >> file.txt',
                'git add .',
                'git commit -m "alpha work"',
                'git tag v7.0.0-alpha.0',

                'echo "more" >> file.txt',
                'git add .',
                'git commit -m "more work"'
            ].join(' && '));
        });

        after(() => {
            fs.rmSync(repoWithPrereleaseTag, {recursive: true, force: true});
        });

        it('skips prerelease tags and finds the stable one', () => {
            const {tag} = resolveBaseTag('7.0.0-rc.0', repoWithPrereleaseTag);
            // Should find v6.17.0 (stable), NOT v7.0.0-alpha.0 (prerelease)
            assert.strictEqual(tag, 'v6.17.0');
        });
    });

    describe('semver.inc compatibility', () => {
        it('patch of an rc produces the stable release', () => {
            assert.strictEqual(semver.inc('6.19.0-rc.0', 'patch'), '6.19.0');
        });

        it('minor of an rc produces the stable release (not next minor)', () => {
            assert.strictEqual(semver.inc('6.19.0-rc.0', 'minor'), '6.19.0');
        });

        it('prerelease rc of an rc increments the rc number', () => {
            assert.strictEqual(semver.inc('6.19.0-rc.0', 'prerelease', 'rc'), '6.19.0-rc.1');
        });
    });
});
