import {describe, it} from 'node:test';
import assert from 'node:assert';
import {fetchSuccessfulRunShas, resolveBase, selectBaseSha} from '../nx-set-shas.js';

const HEAD = 'head0000000000000000000000000000000000000';
const GREEN = 'green000000000000000000000000000000000000';
const OLDER = 'older000000000000000000000000000000000000';
const REBASED = 'gone0000000000000000000000000000000000000';

// The branch as CI sees it: HEAD plus the two commits behind it.
const ancestors = new Set([HEAD, GREEN, OLDER]);
const ancestorCheck = sha => ancestors.has(sha);

function octokitReturning(shas) {
    const calls = [];

    return {
        calls,
        request: async (route, params) => {
            calls.push({route, params});
            return {data: {workflow_runs: shas.map(sha => ({head_sha: sha}))}};
        }
    };
}

describe('selectBaseSha', () => {
    it('takes the newest successful run still on the branch', () => {
        assert.strictEqual(selectBaseSha([GREEN, OLDER], {headSha: HEAD, ancestorCheck}), GREEN);
    });

    it('skips commits that are no longer on the branch', () => {
        assert.strictEqual(selectBaseSha([REBASED, GREEN], {headSha: HEAD, ancestorCheck}), GREEN);
    });

    it('skips a successful run of the commit under test so a re-run re-tests it', () => {
        assert.strictEqual(selectBaseSha([HEAD, GREEN], {headSha: HEAD, ancestorCheck}), GREEN);
    });

    it('returns null when nothing is usable', () => {
        assert.strictEqual(selectBaseSha([REBASED], {headSha: HEAD, ancestorCheck}), null);
        assert.strictEqual(selectBaseSha([], {headSha: HEAD, ancestorCheck}), null);
    });
});

describe('fetchSuccessfulRunShas', () => {
    it('asks for successful runs of the workflow on the branch', async () => {
        const octokit = octokitReturning([GREEN, OLDER]);
        const shas = await fetchSuccessfulRunShas({
            octokit,
            repo: 'TryGhost/Ghost',
            workflow: 'ci.yml',
            branch: 'main'
        });

        assert.deepStrictEqual(shas, [GREEN, OLDER]);
        assert.strictEqual(octokit.calls.length, 1);
        assert.deepStrictEqual(octokit.calls[0].params, {
            owner: 'TryGhost',
            repo: 'Ghost',
            workflow_id: 'ci.yml',
            branch: 'main',
            event: 'push',
            status: 'success',
            per_page: 100,
            exclude_pull_requests: true
        });
    });
});

describe('resolveBase', () => {
    const pushRun = {
        branch: 'main',
        headSha: HEAD,
        event: 'push',
        workflow: 'ci.yml',
        repo: 'TryGhost/Ghost',
        onMissing: 'error',
        ancestorCheck
    };

    it('resolves to the last successful run on the branch', async () => {
        const base = await resolveBase({...pushRun, octokit: octokitReturning([GREEN])});

        assert.strictEqual(base, GREEN);
    });

    it('errors rather than narrowing the window when nothing is usable', async () => {
        await assert.rejects(
            resolveBase({...pushRun, octokit: octokitReturning([REBASED])}),
            /was main rebased/
        );
    });

    it('errors when the branch has no successful runs at all', async () => {
        await assert.rejects(
            resolveBase({...pushRun, octokit: octokitReturning([])}),
            /No successful ci.yml run found on main/
        );
    });

    it('surfaces an API failure instead of treating it as no successful run', async () => {
        const octokit = {
            request: async () => {
                throw new Error('GitHub API responded 403');
            }
        };

        await assert.rejects(resolveBase({...pushRun, octokit}), /403/);
    });
});
