import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../summarize-admin-acceptance.js';

const assertion = (fullName, duration, extra = {}) => ({
  fullName,
  duration,
  status: 'passed',
  failureMessages: [],
  ...extra,
});
const file = (name, assertions, extra = {}) => ({
  name: `/home/runner/work/Ghost/Ghost/apps/admin/${name}`,
  startTime: 1000,
  endTime: 5000,
  status: 'passed',
  message: '',
  assertionResults: assertions,
  ...extra,
});
const report = (files, extra = {}) => ({
  startTime: 1000,
  numPassedTests: 2,
  numFailedTests: 0,
  numPendingTests: 0,
  numTodoTests: 0,
  testResults: files,
  ...extra,
});

describe('Admin acceptance summary', () => {
  it('shows counts and suite elapsed separately from parallel test totals', () => {
    const output = render(
      report([
        file('src/fast.acceptance.test.tsx', [assertion('fast', 1500)]),
        file('src/slow.acceptance.test.tsx', [assertion('slow', 3000)], { endTime: 6000 }),
      ]),
      '2/2',
    );
    assert.match(output, /shard 2\/2/);
    assert.match(output, /2 passed, 0 failed, 0 pending, 0 todo/);
    assert.match(output, /Suite elapsed:\*\* 5\.0s/);
    assert.match(output, /src\/slow.acceptance.test.tsx \| 1 \| 3\.0s/);
    assert.ok(
      output.indexOf('src/slow.acceptance.test.tsx') <
        output.indexOf('src/fast.acceptance.test.tsx'),
    );
    assert.doesNotMatch(output, /home\/runner/);
  });

  it('reports failures and safely displays test names and ANSI error output', () => {
    const output = render(
      report(
        [
          file('src/failure.acceptance.test.tsx', [
            assertion('test | `[link](url)` <script>', null, {
              status: 'failed',
              failureMessages: ['\u001b[31mfirst\nerror | <details>\u001b[0m', 'second error'],
            }),
          ]),
        ],
        { numPassedTests: 0, numFailedTests: 1 },
      ),
    );
    assert.match(output, /### Failed tests/);
    assert.match(output, /test &#124; &#96;&#91;link&#93;\(url\)&#96; &lt;script&gt;/);
    assert.match(output, /first error &#124; &lt;details&gt;/);
    assert.doesNotMatch(output, /second error/);
    assert.ok(!output.includes('\u001b'));
    assert.doesNotMatch(output, /NaN/);
  });

  it('shows collection and hook failures without failed assertions', () => {
    const output = render(
      report([
        file('src/broken.acceptance.test.tsx', [], {
          status: 'failed',
          message: 'Could not collect tests',
        }),
      ]),
    );
    assert.match(output, /### File or hook failures/);
    assert.match(output, /src\/broken.acceptance.test.tsx \| Could not collect tests/);
  });

  it('bounds rows and error lengths while retaining a pointer to all failures', () => {
    const output = render(
      report([
        file(
          'src/many.acceptance.test.tsx',
          Array.from({ length: 14 }, (_, index) =>
            assertion(`failure ${index}`, index * 1000, {
              status: 'failed',
              failureMessages: ['x'.repeat(2000)],
            }),
          ),
        ),
      ]),
    );
    assert.match(output, /4 more failed tests in the JSON artifact/);
    assert.doesNotMatch(output, /x{501}/);
    const slowTests = output.split('### Slowest tests')[1];
    assert.match(slowTests, /failure 13 \| 13\.0s/);
    assert.doesNotMatch(slowTests, /failure 0 \|/);
  });

  it('handles an empty run and missing report without claiming success', () => {
    assert.match(render(null, '1/2'), /No JSON report was produced/);
    assert.match(render(report([], { numPassedTests: 0 })), /Suite elapsed:\*\* 0\.0s/);
    assert.throws(() => render({}), /Invalid Vitest report/);
  });

  it('does not invent timings for assertions that did not run', () => {
    const output = render(
      report([
        file('src/skipped.acceptance.test.tsx', [
          assertion('skipped', undefined, { status: 'pending' }),
        ]),
      ]),
    );
    assert.match(output, /No per-test timings were recorded/);
    assert.doesNotMatch(output, /NaN/);
  });

  it('allows missing artifacts but reports malformed JSON to the caller', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'admin-acceptance-summary-'));
    try {
      const entrypoint = fileURLToPath(
        new URL('../summarize-admin-acceptance.js', import.meta.url),
      );
      const path = join(directory, 'acceptance.json');
      const missing = spawnSync(process.execPath, [entrypoint, `--report=${path}`], {
        encoding: 'utf8',
      });
      assert.equal(missing.status, 0);
      assert.match(missing.stdout, /No JSON report was produced/);
      await writeFile(path, '{');
      const malformed = spawnSync(process.execPath, [entrypoint, `--report=${path}`], {
        encoding: 'utf8',
      });
      assert.notEqual(malformed.status, 0);
      assert.match(malformed.stderr, /SyntaxError/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
