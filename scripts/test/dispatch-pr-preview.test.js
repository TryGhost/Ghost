import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPreview, keepPreview, previewProfile } from '../dispatch-pr-preview.js';

const sha = 'a'.repeat(40);
const repository = 'TryGhost/Ghost';
const pr = (labels = ['preview']) => ({
  state: 'open',
  labels: labels.map((name) => ({ name })),
  head: { sha, repo: { full_name: repository } },
});
const job = (status, conclusion) => ({ name: 'Docker', status, conclusion });

function scenario(pull, runs = [], jobs = {}) {
  const calls = [];
  const api = async (path, paginate) => {
    calls.push({ path, paginate });
    if (path.startsWith('pulls/')) {
      return pull;
    }
    if (path.includes('workflows/ci.yml/runs')) {
      return [{ workflow_runs: runs }];
    }
    const id = path.match(/runs\/(\d+)\/jobs/)[1];
    return [{ jobs: [] }, { jobs: jobs[id] ?? [] }];
  };
  return {
    calls,
    check: () => checkPreview({ api, repository, prNumber: '1', jobName: 'Docker' }),
  };
}

test('bare or profile labels enable previews, while closed or unlabelled PRs skip', async () => {
  for (const labels of [['preview'], ['preview:small'], ['preview', 'preview:members-xl']]) {
    assert.equal(previewProfile({ state: 'open', labels }).skip, false);
  }
  for (const pull of [pr([]), { ...pr(), state: 'closed' }]) {
    const run = scenario(pull);
    assert.deepEqual(await run.check(), { skip: true });
    assert.equal(run.calls.length, 1);
    assert.equal(keepPreview(pull), false);
  }
  assert.equal(keepPreview(pr(['preview:small'])), true);
  assert.throws(
    () => previewProfile({ state: 'open', labels: ['preview:small', 'preview:medium'] }),
    /Multiple/,
  );
  for (const suffix of [
    '',
    'small\ninjected=true',
    'small\n',
    'small\r',
    '../small',
    'a b',
    '$(touch compromised)',
  ]) {
    assert.throws(
      () => previewProfile({ state: 'open', labels: [`preview:${suffix}`] }),
      /Malformed/,
    );
  }
});

test('live-head build checks accept successful reruns and paginate jobs', async () => {
  const run = scenario(
    pr(),
    [
      { id: 1, status: 'completed' },
      { id: 2, status: 'completed' },
    ],
    { 1: [job('completed', 'failure')], 2: [job('completed', 'success')] },
  );
  assert.deepEqual(await run.check(), { skip: false, head_sha: sha });
  assert.match(run.calls[1].path, new RegExp(`head_sha=${sha}`));
  assert.ok(run.calls.slice(1).every((call) => call.paginate));
});

test('pending or not-yet-visible CI leaves refresh to the artifact dispatch', async () => {
  for (const [runs, jobs] of [
    [[], {}],
    [[{ id: 1, status: 'in_progress' }], {}],
    [[{ id: 1, status: 'in_progress' }], { 1: [job('in_progress', null)] }],
    [
      [
        { id: 1, status: 'completed' },
        { id: 2, status: 'in_progress' },
      ],
      { 1: [job('completed', 'failure')] },
    ],
  ]) {
    assert.deepEqual(await scenario(pr(), runs, jobs).check(), { skip: true });
  }
});

test('forks, malformed heads and finished CI without a successful Docker build fail', async () => {
  await assert.rejects(
    scenario({ ...pr(), head: { sha, repo: { full_name: 'fork/Ghost' } } }).check(),
    /Fork/,
  );
  await assert.rejects(
    scenario({ ...pr(), head: { sha: `${sha}\n`, repo: { full_name: repository } } }).check(),
    /Invalid PR head/,
  );
  for (const jobs of [
    [],
    [job('completed', 'failure')],
    [job('completed', 'cancelled')],
    [job('completed', 'skipped')],
  ]) {
    await assert.rejects(
      scenario(pr(), [{ id: 1, status: 'completed' }], { 1: jobs }).check(),
      /did not succeed/,
    );
  }
});
