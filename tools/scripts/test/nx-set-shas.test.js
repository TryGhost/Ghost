import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fetchSuccessfulRuns, resolveBase, selectBaseSha } from '../nx-set-shas.js';

const HEAD = 'head0000000000000000000000000000000000000';
const GREEN = 'green000000000000000000000000000000000000';
const OLDER = 'older000000000000000000000000000000000000';
const REBASED = 'gone0000000000000000000000000000000000000';
const NOW = new Date('2026-10-01T10:00:00Z');
const RECENT_RANGE = '2026-09-24T10:00:00Z..2026-10-01T10:00:00Z';
const OLDER_RANGE = '<=2026-09-24T09:59:59Z';
const recentRun = (sha) => ({ head_sha: sha, created_at: '2026-09-30T10:00:00Z' });

// The branch as CI sees it: HEAD plus the two commits behind it.
const ancestors = new Set([HEAD, GREEN, OLDER]);
const ancestorCheck = (sha) => ancestors.has(sha);

function octokitWithPages(getRuns) {
  const calls = [];

  return {
    calls,
    request: async (route, params) => {
      calls.push({ route, params });
      return { data: { workflow_runs: getRuns(params) } };
    },
  };
}

function octokitReturning(shas) {
  return octokitWithPages(({ created }) => (created === RECENT_RANGE ? shas.map(recentRun) : []));
}

describe('selectBaseSha', () => {
  it('takes the newest successful run still on the branch', () => {
    assert.strictEqual(selectBaseSha([GREEN, OLDER], { headSha: HEAD, ancestorCheck }), GREEN);
  });

  it('skips commits that are no longer on the branch', () => {
    assert.strictEqual(selectBaseSha([REBASED, GREEN], { headSha: HEAD, ancestorCheck }), GREEN);
  });

  it('skips a successful run of the commit under test so a re-run re-tests it', () => {
    assert.strictEqual(selectBaseSha([HEAD, GREEN], { headSha: HEAD, ancestorCheck }), GREEN);
  });

  it('returns null when nothing is usable', () => {
    assert.strictEqual(selectBaseSha([REBASED], { headSha: HEAD, ancestorCheck }), null);
    assert.strictEqual(selectBaseSha([], { headSha: HEAD, ancestorCheck }), null);
  });
});

describe('fetchSuccessfulRuns', () => {
  it('asks for recent successful runs of the workflow on the branch', async () => {
    const octokit = octokitReturning([GREEN, OLDER]);
    const pages = fetchSuccessfulRuns({
      octokit,
      repo: 'TryGhost/Ghost',
      workflow: 'ci.yml',
      branch: 'main',
      now: NOW,
    });
    const { value: runs } = await pages.next();

    assert.deepStrictEqual(
      runs.map((run) => run.head_sha),
      [GREEN, OLDER],
    );
    assert.strictEqual(octokit.calls.length, 1);
    assert.deepStrictEqual(octokit.calls[0].params, {
      owner: 'TryGhost',
      repo: 'Ghost',
      workflow_id: 'ci.yml',
      branch: 'main',
      event: 'push',
      status: 'success',
      per_page: 100,
      page: 1,
      created: RECENT_RANGE,
      exclude_pull_requests: true,
    });
  });

  it('rejects a response outside the date filter instead of accepting a stale base', async () => {
    const pages = fetchSuccessfulRuns({
      octokit: octokitWithPages(() => [{ head_sha: GREEN, created_at: '2026-09-15T10:00:00Z' }]),
      repo: 'TryGhost/Ghost',
      workflow: 'ci.yml',
      branch: 'main',
      now: NOW,
    });

    await assert.rejects(pages.next(), /outside the requested creation range/);
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
    ancestorCheck,
    now: NOW,
  };

  it('resolves to the last successful run on the branch', async () => {
    const octokit = octokitReturning([GREEN]);
    const base = await resolveBase({ ...pushRun, octokit });

    assert.strictEqual(base, GREEN);
    assert.strictEqual(octokit.calls.length, 1);
  });

  it('skips the head and rewritten commits before choosing a successful ancestor', async () => {
    const base = await resolveBase({
      ...pushRun,
      octokit: octokitReturning([HEAD, REBASED, GREEN]),
    });

    assert.strictEqual(base, GREEN);
  });

  it('searches a second page before falling back to older runs', async () => {
    const octokit = octokitWithPages(({ page }) =>
      page === 1 ? Array.from({ length: 100 }, () => recentRun(REBASED)) : [recentRun(GREEN)],
    );
    const base = await resolveBase({ ...pushRun, octokit });

    assert.strictEqual(base, GREEN);
    assert.deepStrictEqual(
      octokit.calls.map(({ params }) => [params.created, params.page]),
      [
        [RECENT_RANGE, 1],
        [RECENT_RANGE, 2],
      ],
    );
  });

  it('checks duplicate successful-run commits only once across pages', async () => {
    const checked = [];
    const octokit = octokitWithPages(({ page }) =>
      page === 1
        ? Array.from({ length: 100 }, () => recentRun(REBASED))
        : [recentRun(REBASED), recentRun(GREEN)],
    );
    const base = await resolveBase({
      ...pushRun,
      octokit,
      ancestorCheck: (sha) => {
        checked.push(sha);
        return ancestorCheck(sha);
      },
    });

    assert.strictEqual(base, GREEN);
    assert.deepStrictEqual(checked, [REBASED, GREEN]);
  });

  it('finds an older success on a quiet branch without narrowing to the previous commit', async () => {
    const octokit = octokitWithPages(({ created }) =>
      created === RECENT_RANGE ? [] : [{ head_sha: GREEN, created_at: '2026-09-01T10:00:00Z' }],
    );
    const base = await resolveBase({ ...pushRun, octokit });

    assert.strictEqual(base, GREEN);
    assert.deepStrictEqual(
      octokit.calls.map(({ params }) => params.created),
      [RECENT_RANGE, OLDER_RANGE],
    );
  });

  it('can rerun an old commit even when all recent successes are ahead of it', async () => {
    const octokit = octokitWithPages(({ created }) =>
      created === RECENT_RANGE
        ? [recentRun(REBASED)]
        : [
            { head_sha: HEAD, created_at: '2026-09-10T10:00:00Z' },
            { head_sha: GREEN, created_at: '2026-09-09T10:00:00Z' },
          ],
    );
    const base = await resolveBase({ ...pushRun, octokit });

    assert.strictEqual(base, GREEN);
  });

  it('continues past the filtered API limit without dropping the boundary second', async () => {
    const boundary = '2026-09-14T10:00:00Z';
    const octokit = octokitWithPages(({ created, page }) => {
      if (created === RECENT_RANGE) {
        return [];
      }
      if (created === OLDER_RANGE) {
        return Array.from({ length: 100 }, () => ({
          head_sha: REBASED,
          created_at: `2026-09-${String(24 - page).padStart(2, '0')}T10:00:00Z`,
        }));
      }

      assert.strictEqual(created, `<=${boundary}`);
      return [
        { head_sha: REBASED, created_at: boundary },
        { head_sha: GREEN, created_at: boundary },
      ];
    });
    const base = await resolveBase({ ...pushRun, octokit });

    assert.strictEqual(base, GREEN);
    assert.strictEqual(octokit.calls.length, 12);
  });

  it('fails safely if the API cap prevents advancing the date bound', async () => {
    const octokit = octokitWithPages(({ created }) =>
      created === RECENT_RANGE
        ? []
        : Array.from({ length: 100 }, () => ({
            head_sha: REBASED,
            created_at: '2026-09-14T10:00:00Z',
          })),
    );

    await assert.rejects(
      resolveBase({ ...pushRun, octokit }),
      /Cannot safely search past GitHub's 1,000-run limit/,
    );
  });

  it('keeps API failures during the older search distinct from missing history', async () => {
    let calls = 0;
    const octokit = {
      request: async () => {
        calls += 1;
        if (calls === 1) {
          return { data: { workflow_runs: [] } };
        }
        throw new Error('GitHub API responded 503');
      },
    };

    await assert.rejects(resolveBase({ ...pushRun, octokit }), /503/);
  });

  it('errors rather than narrowing the window when nothing is usable', async () => {
    await assert.rejects(
      resolveBase({ ...pushRun, octokit: octokitReturning([REBASED]) }),
      /was main rebased/,
    );
  });

  it('errors when the branch has no successful runs at all', async () => {
    await assert.rejects(
      resolveBase({ ...pushRun, octokit: octokitReturning([]) }),
      /No successful ci.yml run found on main/,
    );
  });

  it('surfaces an API failure instead of treating it as no successful run', async () => {
    const octokit = {
      request: async () => {
        throw new Error('GitHub API responded 403');
      },
    };

    await assert.rejects(resolveBase({ ...pushRun, octokit }), /403/);
  });
});
