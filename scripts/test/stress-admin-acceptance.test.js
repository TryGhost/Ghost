import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { discoverFiles, inspectReport, inspectRound } from '../stress-admin-acceptance.js';

const file = (name, overrides = {}) => ({
  name: `/Users/example/Ghost/apps/admin/src/${name}.acceptance.test.tsx`,
  status: 'passed',
  assertionResults: [{ fullName: 'journey', status: 'passed', failureMessages: [] }],
  ...overrides,
});
const report = (files = [file('one')], overrides = {}) => ({
  success: true,
  numPassedTests: 1,
  numFailedTests: 0,
  numPendingTests: 0,
  testResults: files,
  ...overrides,
});

describe('Admin acceptance stress accounting', () => {
  it('discovers real tests without counting screenshot directories named after tests', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'admin-stress-discovery-'));
    try {
      await mkdir(join(directory, 'src/editor/__screenshots__/settings.acceptance.test.tsx'), {
        recursive: true,
      });
      await writeFile(join(directory, 'src/editor/settings.acceptance.test.tsx'), '');
      await writeFile(join(directory, 'src/editor/card.component.test.tsx'), '');
      await writeFile(join(directory, 'src/editor/other.test.tsx'), '');
      assert.deepEqual(await discoverFiles(directory), [
        'src/editor/card.component.test.tsx',
        'src/editor/settings.acceptance.test.tsx',
      ]);
      assert.deepEqual(await discoverFiles(directory, ['editor/settings']), [
        'src/editor/settings.acceptance.test.tsx',
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('requires a successful process and a nonempty successful report', () => {
    assert.equal(inspectReport(report(), 0).clean, true);
    assert.equal(inspectReport(report(), 1).clean, false);
    assert.equal(inspectReport(report(), null).clean, false);
    assert.equal(inspectReport(null, 0).clean, false);
    assert.equal(inspectReport(report([], { numPassedTests: 0 }), 0).clean, false);
    assert.equal(
      inspectReport(report([file('one'), file('empty', { assertionResults: [] })]), 0).clean,
      false,
    );
    assert.equal(inspectReport(report(undefined, { success: false }), 0).clean, false);
    assert.equal(inspectReport(report(undefined, { numPendingTests: 1 }), 0).clean, false);
    assert.equal(
      inspectReport(
        report([
          file('one', {
            assertionResults: [{ fullName: 'journey', status: 'pending', failureMessages: [] }],
          }),
        ]),
        0,
      ).clean,
      false,
    );
  });

  it('retains assertion and file failures even when the report totals disagree', () => {
    const result = inspectReport(
      report([
        file('one', {
          assertionResults: [{ fullName: 'race', status: 'failed', failureMessages: ['timeout'] }],
        }),
        file('two', { status: 'failed', assertionResults: [], message: 'collection failed' }),
      ]),
      0,
    );
    assert.equal(result.clean, false);
    assert.deepEqual(
      result.failures.map((failure) => failure.errors),
      [['timeout'], ['collection failed']],
    );
    assert.equal(result.failures[1].test, '(file/hook)');
  });

  it('counts a full round only when every expected file appears in exactly one successful shard', () => {
    const shard = (name) => ({ clean: true, files: [name], passed: 3, failed: 0, pending: 0 });
    const expected = ['one', 'two'];
    const clean = inspectRound([shard('two'), shard('one')], expected);
    assert.equal(clean.clean, true);
    assert.equal(clean.passed, 6);
    assert.equal(inspectRound([shard('one')], expected).clean, false);
    assert.equal(inspectRound([shard('one'), shard('one'), shard('two')], expected).clean, false);
    assert.equal(inspectRound([shard('one'), shard('two'), shard('extra')], expected).clean, false);
    assert.equal(
      inspectRound([shard('one'), { ...shard('two'), clean: false }], expected).clean,
      false,
    );
    assert.equal(
      inspectRound([shard('one'), shard('two')], expected, ['missing test']).clean,
      false,
    );
  });
});
