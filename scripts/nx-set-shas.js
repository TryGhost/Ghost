// Resolves NX_BASE / NX_HEAD — the commit window `nx affected` and the CI path
// filters diff against.
//
// Replaces nrwl/nx-set-shas, which re-verified every candidate commit over the
// GitHub API (two calls per candidate, up to 60 a run) and swallowed every
// error, so a transient API failure was indistinguishable from a rewritten
// branch and hard-failed the run. Ancestry is answerable locally — job_setup
// checks out with fetch-depth 0 — so the API is only asked which runs passed:
// one request, with the retry/throttling plugins handling rate limits.

import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

import { Octokit } from '@octokit/core';
import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';

// Hash of git's empty tree — diffing against it marks everything as changed.
const EMPTY_TREE_SHA = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const PULL_REQUEST_EVENTS = new Set(['pull_request', 'pull_request_target']);
const ON_MISSING_MODES = new Set(['error', 'previous-commit']);
// A primary rate limit can reset an hour out; waiting that long would just burn
// the job's timeout, so past this we fail with the real status instead.
const MAX_THROTTLE_WAIT_SECONDS = 60;
const MAX_THROTTLE_RETRIES = 2;

function git(args) {
  const { status, stdout } = spawnSync('git', args, { encoding: 'utf8' });

  return { ok: status === 0, stdout: (stdout ?? '').trim() };
}

function isAncestor(sha, headSha) {
  // Exits 128 rather than 1 when the commit isn't in the local history, which
  // for our purposes is the same answer: not a usable base.
  return git(['merge-base', '--is-ancestor', sha, headSha]).ok;
}

export function createOctokit({ token, baseUrl = process.env.GITHUB_API_URL } = {}) {
  const CiOctokit = Octokit.plugin(retry, throttling);
  const onLimit = (retryAfter, options, octokit, retryCount) => {
    octokit.log.warn(`Rate limited on ${options.method} ${options.url}, waiting ${retryAfter}s`);

    return retryAfter <= MAX_THROTTLE_WAIT_SECONDS && retryCount < MAX_THROTTLE_RETRIES;
  };

  return new CiOctokit({
    auth: token,
    ...(baseUrl ? { baseUrl } : {}),
    throttle: { onRateLimit: onLimit, onSecondaryRateLimit: onLimit },
  });
}

/**
 * The head SHAs of the workflow's successful runs on a branch, newest first.
 *
 * @param {object} options
 * @param {object} options.octokit
 * @param {string} options.repo - owner/name
 * @param {string} options.workflow - workflow file name, e.g. ci.yml
 * @param {string} options.branch
 * @param {string} [options.event] - the trigger to match, defaults to push
 * @returns {Promise<string[]>}
 */
export async function fetchSuccessfulRunShas({ octokit, repo, workflow, branch, event = 'push' }) {
  const [owner, name] = repo.split('/');
  const { data } = await octokit.request(
    'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',
    {
      owner,
      repo: name,
      workflow_id: workflow,
      branch,
      event,
      status: 'success',
      per_page: 100,
      exclude_pull_requests: true,
    },
  );

  return data.workflow_runs.map((run) => run.head_sha);
}

/**
 * The newest run SHA usable as a base: still in this branch's history, and not
 * the commit under test — re-running a commit that already passed should
 * re-test it, not diff it against itself. Commits whose run was cancelled by a
 * faster follow-up push have no successful run, so they're skipped over and
 * their changes stay inside the window rather than going untested.
 *
 * @param {string[]} shas - candidate SHAs, newest first
 * @param {object} options
 * @param {string} options.headSha
 * @param {Function} [options.ancestorCheck] - injectable for tests
 * @returns {string|null}
 */
export function selectBaseSha(shas, { headSha, ancestorCheck = isAncestor }) {
  for (const sha of shas) {
    if (sha !== headSha && ancestorCheck(sha, headSha)) {
      return sha;
    }
  }

  return null;
}

function previousCommit(headSha) {
  const previous = git(['rev-parse', `${headSha}~1`]);

  if (previous.ok && previous.stdout) {
    return previous.stdout;
  }

  console.log(`${headSha}~1 does not exist, using the empty tree as base`);
  return EMPTY_TREE_SHA;
}

function exportShas(base, head) {
  console.log(`NX_BASE=${base}`);
  console.log(`NX_HEAD=${head}`);

  if (process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, `NX_BASE=${base}\nNX_HEAD=${head}\n`);
  }
}

/**
 * @param {object} options
 * @param {object} options.octokit
 * @param {string} options.branch - the PR's base branch, or the pushed branch
 * @param {string} options.headSha
 * @param {string} options.event - GITHUB_EVENT_NAME
 * @param {string} options.workflow
 * @param {string} options.repo
 * @param {string} options.onMissing - error | previous-commit
 * @param {Function} [options.ancestorCheck] - injectable for tests
 * @returns {Promise<string>}
 */
export async function resolveBase({
  octokit,
  branch,
  headSha,
  event,
  workflow,
  repo,
  onMissing,
  ancestorCheck,
}) {
  if (PULL_REQUEST_EVENTS.has(event)) {
    const mergeBase = git(['merge-base', `origin/${branch}`, headSha]);

    if (!mergeBase.ok || !mergeBase.stdout) {
      throw new Error(`Could not find the merge base of origin/${branch} and ${headSha}`);
    }

    return mergeBase.stdout;
  }

  const shas = await fetchSuccessfulRunShas({ octokit, repo, workflow, branch });
  const base = selectBaseSha(shas, { headSha, ancestorCheck });

  if (base) {
    console.log(`Last successful ${workflow} run on ${branch}: ${base}`);
    return base;
  }

  if (onMissing === 'error') {
    throw new Error(
      shas.length === 0
        ? `No successful ${workflow} run found on ${branch}`
        : `None of the ${shas.length} successful ${workflow} runs on ${branch} point at a commit in this ` +
            `branch's history — was ${branch} rebased?`,
    );
  }

  console.log(
    `No successful ${workflow} run found on ${branch}, falling back to the previous commit`,
  );
  return previousCommit(headSha);
}

export async function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      branch: { type: 'string' },
      head: { type: 'string' },
      event: { type: 'string', default: process.env.GITHUB_EVENT_NAME ?? 'push' },
      workflow: { type: 'string', default: 'ci.yml' },
      repo: { type: 'string', default: process.env.GITHUB_REPOSITORY },
      // What to do when no successful run can be found: fail, for a
      // canonical branch where too narrow a base means untested commits
      // land, or fall back to HEAD~1 for forks, which may have no run
      // history at all.
      'on-missing': { type: 'string', default: 'previous-commit' },
    },
  });

  const onMissing = values['on-missing'];

  if (!ON_MISSING_MODES.has(onMissing)) {
    throw new Error(`--on-missing must be one of: ${[...ON_MISSING_MODES].join(', ')}`);
  }

  if (!values.branch) {
    throw new Error('--branch is required');
  }

  if (!values.repo) {
    throw new Error('--repo is required when GITHUB_REPOSITORY is unset');
  }

  const headSha = values.head || git(['rev-parse', 'HEAD']).stdout;

  if (!headSha) {
    throw new Error('Could not resolve HEAD');
  }

  const base = await resolveBase({
    octokit: createOctokit({ token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN }),
    branch: values.branch,
    headSha,
    event: values.event,
    workflow: values.workflow,
    repo: values.repo,
    onMissing,
  });

  exportShas(base, headSha);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
