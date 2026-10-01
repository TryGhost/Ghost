import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import yaml from 'js-yaml';

const workflow = yaml.load(
  readFileSync(new URL('../../.github/workflows/pr-preview.yml', import.meta.url), 'utf8'),
);
const sha = 'a'.repeat(40);
const repository = 'TryGhost/Ghost';
const pr = (labels = ['preview']) => ({ state: 'open', labels, sha, repo: repository });

// Execute the workflow's actual Bash with a fake gh; jq and output handling are real.
function scenario(pull, runs = '', jobs = {}, job = 'deploy') {
  const dir = mkdtempSync(join(tmpdir(), 'preview-dispatch-'));
  writeFileSync(
    join(dir, 'gh'),
    `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n');
const path = args.find(arg => arg.startsWith('repos/'));
const input = JSON.parse(process.env.RESPONSES);
if (path.includes('/pulls/')) process.stdout.write(JSON.stringify(input.pull));
else if (path.includes('/workflows/ci.yml/runs')) process.stdout.write(input.runs);
else if (path.includes('/jobs?')) process.stdout.write(input.jobs[path.match(/runs\\/(\\d+)\\/jobs/)[1]] ?? '');
else process.exit(99);
`,
    { mode: 0o755 },
  );
  try {
    const result = spawnSync(
      'bash',
      ['-e', '-o', 'pipefail', '-c', workflow.jobs[job].steps[0].run],
      {
        cwd: dir,
        env: {
          ...process.env,
          PATH: `${dir}:${process.env.PATH}`,
          PR_NUMBER: '1',
          REPOSITORY: repository,
          BUILD_JOB_NAME: 'Build Docker Images',
          GITHUB_OUTPUT: join(dir, 'output'),
          CALLS: join(dir, 'calls'),
          RESPONSES: JSON.stringify({ pull, runs, jobs }),
        },
        encoding: 'utf8',
      },
    );
    assert.equal(existsSync(join(dir, 'compromised')), false);
    return {
      ...result,
      output: existsSync(join(dir, 'output')) ? readFileSync(join(dir, 'output'), 'utf8') : '',
      calls: readFileSync(join(dir, 'calls'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('bare and profile labels enable previews; closed or unlabelled PRs skip', () => {
  for (const labels of [['preview'], ['preview:small'], ['preview', 'preview:members-xl']]) {
    const result = scenario(pr(labels), '1 completed\n', { 1: 'completed success' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, `head_sha=${sha}\n`);
  }
  for (const pull of [pr([]), { ...pr(), state: 'closed' }]) {
    const result = scenario(pull);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, 'skip=true\n');
    assert.equal(result.calls.length, 1);
  }
});

test('multiple labels and malformed strings fail before checking builds', () => {
  const multiple = scenario(pr(['preview:small', 'preview:medium']));
  assert.equal(multiple.status, 1);
  assert.match(multiple.stdout, /Multiple/);
  for (const suffix of [
    '',
    'small,medium',
    'small\ninjected=true',
    'small\n',
    'small\r',
    '../small',
    'a b',
    '$(touch compromised)',
  ]) {
    const result = scenario(pr([`preview:${suffix}`]));
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Malformed/);
    assert.equal(result.calls.length, 1);
    assert.equal(result.output, '');
  }
});

test('live-head checks accept successful reruns and paginate runs and jobs', () => {
  const result = scenario(pr(), '1 completed\n2 completed\n', {
    1: 'completed failure',
    2: 'completed success',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output, `head_sha=${sha}\n`);
  assert.ok(result.calls[1].some((arg) => arg.includes(`head_sha=${sha}`)));
  assert.ok(result.calls.slice(1).every((args) => args.includes('--paginate')));
});

test('pending images wait for artifact refresh; finished failures and forks stop dispatch', () => {
  for (const [runs, jobs] of [
    ['', {}],
    ['1 in_progress\n', {}],
    ['1 in_progress\n', { 1: 'in_progress ' }],
    ['1 completed\n2 in_progress\n', { 1: 'completed failure' }],
  ]) {
    const result = scenario(pr(), runs, jobs);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, 'skip=true\n');
  }
  for (const status of ['', 'completed failure', 'completed cancelled', 'completed skipped']) {
    assert.equal(scenario(pr(), '1 completed\n', { 1: status }).status, 1);
  }
  assert.equal(scenario({ ...pr(), repo: 'fork/Ghost' }).status, 1);
  assert.equal(scenario({ ...pr(), sha: 'invalid' }).status, 1);
});

test('teardown rechecks live state before dispatch', () => {
  for (const pull of [pr(), pr(['preview:small'])]) {
    const result = scenario(pull, '', {}, 'destroy');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, 'skip=true\n');
  }
  for (const pull of [pr([]), { ...pr(), state: 'closed' }]) {
    const result = scenario(pull, '', {}, 'destroy');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, '');
  }
});
