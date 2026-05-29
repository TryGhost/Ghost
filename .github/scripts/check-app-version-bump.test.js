const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {execFileSync, spawnSync} = require('node:child_process');

const scriptPath = path.resolve(__dirname, 'check-app-version-bump.js');

function git(cwd, args) {
    return execFileSync('git', args, {cwd, encoding: 'utf8'}).trim();
}

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 4)}\n`);
}

function setupRepo() {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'check-app-version-bump-'));

    fs.mkdirSync(path.join(repo, '.github/scripts'), {recursive: true});
    fs.copyFileSync(scriptPath, path.join(repo, '.github/scripts/check-app-version-bump.js'));

    git(repo, ['init', '-b', 'main']);
    git(repo, ['config', 'user.email', 'test@example.com']);
    git(repo, ['config', 'user.name', 'Test User']);

    writeJson(path.join(repo, 'apps/comments-ui/package.json'), {
        name: '@tryghost/comments-ui',
        version: '1.5.4'
    });
    writeJson(path.join(repo, 'ghost/core/core/shared/config/defaults.json'), {
        comments: {
            url: 'https://cdn.jsdelivr.net/ghost/comments-ui@~{version}/umd/comments-ui.min.js',
            version: '1.4'
        }
    });

    git(repo, ['add', '.']);
    git(repo, ['commit', '-m', 'Initial commit']);
    const baseSha = git(repo, ['rev-parse', 'HEAD']);
    git(repo, ['update-ref', 'refs/remotes/origin/main', baseSha]);

    writeJson(path.join(repo, 'apps/comments-ui/package.json'), {
        name: '@tryghost/comments-ui',
        version: '1.5.5'
    });
    git(repo, ['add', 'apps/comments-ui/package.json']);
    git(repo, ['commit', '-m', 'Bumped comments patch']);
    const compareSha = git(repo, ['rev-parse', 'HEAD']);

    return {baseSha, compareSha, repo};
}

test('fails patch app bumps when defaults.json is stale for the package major/minor', () => {
    const {baseSha, compareSha, repo} = setupRepo();

    const result = spawnSync(process.execPath, ['.github/scripts/check-app-version-bump.js'], {
        cwd: repo,
        encoding: 'utf8',
        env: {
            ...process.env,
            PR_BASE_SHA: baseSha,
            PR_COMPARE_SHA: compareSha
        }
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /defaults\.json still has comments\.version set to 1\.4/);
});
