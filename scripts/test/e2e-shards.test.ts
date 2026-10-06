import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { JSONReport } from '@playwright/test/reporter';

import { parseTimings, planShards, recordTimings, summarizeReport } from '../e2e-shards.ts';

const report = {
  suites: [
    {
      file: 'tests/admin/a.test.ts',
      specs: [
        {
          file: 'tests/admin/a.test.ts',
          tests: [
            { projectName: 'main', results: [{ duration: 4000 }] },
            { projectName: 'main', results: [{ duration: 90000 }, { duration: 6000 }] },
            { projectName: 'global-setup', results: [{ duration: 10000 }] },
          ],
        },
      ],
      suites: [
        {
          specs: [
            {
              file: 'tests/admin/shared-steps.ts',
              tests: [{ projectName: 'main', results: [{ duration: 2000 }] }],
            },
          ],
        },
      ],
    },
    {
      file: 'tests/public/b.test.ts',
      specs: [{ file: 'tests/public/b.test.ts', tests: [{ projectName: 'main', results: [] }] }],
    },
  ],
} as unknown as JSONReport;

describe('summarizeReport', () => {
  it('groups tests by the loaded file, noting helpers that register them', () => {
    assert.deepEqual(
      summarizeReport(report, 'main'),
      new Map([
        [
          'tests/admin/a.test.ts',
          { tests: 3, seconds: 12, definedIn: new Set(['tests/admin/shared-steps.ts']) },
        ],
        ['tests/public/b.test.ts', { tests: 1, seconds: 0, definedIn: new Set() }],
      ]),
    );
  });
});

describe('planShards', () => {
  it('balances recorded durations instead of test counts', () => {
    const tests = new Map([
      ['slow.test.ts', 2],
      ['medium.test.ts', 2],
      ['fast-1.test.ts', 2],
      ['fast-2.test.ts', 2],
    ]);
    const timings = {
      'slow.test.ts': { seconds: 90, tests: 2 },
      'medium.test.ts': { seconds: 50, tests: 2 },
      'fast-1.test.ts': { seconds: 20, tests: 2 },
      'fast-2.test.ts': { seconds: 20, tests: 2 },
    };

    assert.deepEqual(planShards(tests, timings, 2), {
      files: [['slow.test.ts'], ['fast-1.test.ts', 'fast-2.test.ts', 'medium.test.ts']],
      seconds: [90, 90],
    });
  });

  it('estimates unrecorded files from the recorded rate per test', () => {
    const tests = new Map([
      ['known.test.ts', 4],
      ['new.test.ts', 2],
    ]);

    assert.deepEqual(
      planShards(tests, { 'known.test.ts': { seconds: 40, tests: 4 } }, 2).seconds,
      [40, 20],
    );
  });

  it('rescales a recorded time when the file has a different number of tests', () => {
    const tests = new Map([['split.test.ts', 13]]);

    assert.deepEqual(
      planShards(tests, { 'split.test.ts': { seconds: 360, tests: 36 } }, 1).seconds,
      [130],
    );
  });

  it('falls back to a default rate without any timings', () => {
    assert.deepEqual(planShards(new Map([['a.test.ts', 3]]), {}, 1).seconds, [30]);
  });

  it('assigns every file exactly once and skips files without tests', () => {
    const tests = new Map<string, number>(
      Array.from({ length: 25 }, (_, index) => [`file-${index}.test.ts`, (index % 4) + 1] as const),
    );
    tests.set('global.setup.ts', 0);
    const { files } = planShards(tests, {}, 4);

    assert.deepEqual(
      files.flat().sort(),
      [...tests.keys()].filter((file) => file !== 'global.setup.ts').sort(),
    );
  });
});

describe('recordTimings', () => {
  const current = new Map([
    ['kept.test.ts', { tests: 1, seconds: 30, definedIn: new Set<string>() }],
    ['new.test.ts', { tests: 1, seconds: 12.34, definedIn: new Set<string>() }],
    ['split.test.ts', { tests: 13, seconds: 120, definedIn: new Set<string>() }],
  ]);
  const previous = {
    'kept.test.ts': { seconds: 10, tests: 1 },
    'deleted.test.ts': { seconds: 5, tests: 1 },
    'split.test.ts': { seconds: 360, tests: 36 },
  };

  it('averages with previous timings and drops missing files on a complete run', () => {
    assert.deepEqual(recordTimings(current, previous, true), {
      'kept.test.ts': { seconds: 20, tests: 1 },
      'new.test.ts': { seconds: 12.3, tests: 1 },
      'split.test.ts': { seconds: 125, tests: 13 },
    });
  });

  it('keeps previous timings for files missing from an incomplete run', () => {
    assert.deepEqual(recordTimings(current, previous, false), {
      'deleted.test.ts': { seconds: 5, tests: 1 },
      'kept.test.ts': { seconds: 20, tests: 1 },
      'new.test.ts': { seconds: 12.3, tests: 1 },
      'split.test.ts': { seconds: 125, tests: 13 },
    });
  });
});

describe('parseTimings', () => {
  it('reads seconds and test counts per file', () => {
    assert.deepEqual(parseTimings('{"a.test.ts":{"seconds":12.5,"tests":2}}'), {
      'a.test.ts': { seconds: 12.5, tests: 2 },
    });
  });

  it('treats an empty file as no timings', () => {
    assert.deepEqual(parseTimings(' \n'), {});
  });

  it('ignores malformed timings instead of failing the plan', (t) => {
    t.mock.method(console, 'warn', () => {});
    for (const content of [
      'null',
      '[]',
      '"text"',
      '{"a.test.ts":12.5}',
      '{"a.test.ts":{"seconds":"12","tests":2}}',
      '{"a.test.ts":{"seconds":12,"tests":0}}',
      '{"a.test.ts":{"seconds":12}}',
      '{"a.test.ts":null}',
      '{not json',
    ]) {
      assert.deepEqual(parseTimings(content), {}, content);
    }
  });
});
