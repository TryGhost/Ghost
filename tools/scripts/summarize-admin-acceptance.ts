import fs from 'node:fs/promises';
import { parseArgs, stripVTControlCharacters } from 'node:util';

const LIMIT = 10;
const seconds = (milliseconds) => `${(milliseconds / 1000).toFixed(1)}s`;
// Report content comes from the tests, including PR-authored names and errors.
const cell = (value) =>
  stripVTControlCharacters(String(value))
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '&#124;')
    .replaceAll('`', '&#96;')
    .replaceAll('*', '&#42;')
    .replaceAll('_', '&#95;')
    .replaceAll('[', '&#91;')
    .replaceAll(']', '&#93;')
    .replace(/\s+/g, ' ');
const relativeFile = (file) => file.replaceAll('\\', '/').split('/apps/admin/').at(-1);
const duration = (assertion) => Math.max(0, assertion.duration ?? 0);

/** Render Vitest's JSON report as a bounded GitHub Actions step summary. */
export function render(report, shard = '') {
  const heading = `## React Admin acceptance${shard ? ` (shard ${cell(shard)})` : ''}`;
  if (!report) {
    return `${heading}\n\nNo JSON report was produced. Check the setup and test step logs.\n`;
  }
  if (!Array.isArray(report.testResults)) {
    throw new Error('Invalid Vitest report: testResults must be an array');
  }

  const files = report.testResults;
  const assertions = files.flatMap((file) =>
    file.assertionResults.map((assertion) => ({ ...assertion, file: relativeFile(file.name) })),
  );
  const endTime = Math.max(report.startTime, ...files.map((file) => file.endTime));
  const lines = [
    heading,
    '',
    `**${report.numPassedTests} passed, ${report.numFailedTests} failed, ${report.numPendingTests} pending, ${report.numTodoTests} todo** across ${files.length} test files.`,
    `**Suite elapsed:** ${seconds(endTime - report.startTime)}. Test durations include setup and cleanup; parallel durations do not add up to suite elapsed.`,
    '',
  ];

  const failed = assertions.filter((assertion) => assertion.status === 'failed');
  if (failed.length) {
    lines.push(
      '### Failed tests',
      '',
      '| File | Test | Duration | First error |',
      '|---|---|---|---|',
    );
    for (const assertion of failed.slice(0, LIMIT)) {
      const error = stripVTControlCharacters(assertion.failureMessages?.[0] ?? '').slice(0, 500);
      lines.push(
        `| ${cell(assertion.file)} | ${cell(assertion.fullName)} | ${typeof assertion.duration === 'number' ? seconds(duration(assertion)) : '—'} | ${cell(error)} |`,
      );
    }
    if (failed.length > LIMIT) {
      lines.push('', `${failed.length - LIMIT} more failed tests in the JSON artifact.`);
    }
    lines.push('');
  }

  // A file can fail during collection or a hook without a failed assertion.
  const failedFiles = files.filter(
    (file) =>
      file.status === 'failed' && !file.assertionResults.some((test) => test.status === 'failed'),
  );
  if (failedFiles.length) {
    lines.push('### File or hook failures', '', '| File | Error |', '|---|---|');
    for (const file of failedFiles.slice(0, LIMIT)) {
      lines.push(
        `| ${cell(relativeFile(file.name))} | ${cell(stripVTControlCharacters(file.message ?? '').slice(0, 500))} |`,
      );
    }
    if (failedFiles.length > LIMIT) {
      lines.push('', `${failedFiles.length - LIMIT} more file failures in the JSON artifact.`);
    }
    lines.push('');
  }

  lines.push('### Slowest files', '', '| File | Tests | Total test duration |', '|---|---|---|');
  const slowFiles = files
    .map((file) => ({
      file: relativeFile(file.name),
      tests: file.assertionResults.length,
      duration: file.assertionResults.reduce((sum, assertion) => sum + duration(assertion), 0),
    }))
    .sort((a, b) => b.duration - a.duration);
  for (const file of slowFiles.slice(0, LIMIT)) {
    lines.push(`| ${cell(file.file)} | ${file.tests} | ${seconds(file.duration)} |`);
  }
  lines.push('', '### Slowest tests', '', '| File | Test | Duration |', '|---|---|---|');
  const slowTests = assertions
    .filter((assertion) => typeof assertion.duration === 'number')
    .sort((a, b) => duration(b) - duration(a));
  for (const assertion of slowTests.slice(0, LIMIT)) {
    lines.push(
      `| ${cell(assertion.file)} | ${cell(assertion.fullName)} | ${seconds(duration(assertion))} |`,
    );
  }
  if (!slowTests.length) {
    lines.push('', 'No per-test timings were recorded.');
  }
  lines.push(
    '',
    'Full timings and failure details are in this shard’s `admin-acceptance-results` JSON artifact. Failure screenshots are uploaded separately.',
    'A failure alone does not establish flakiness; compare repeated runs of the same commit.',
    '',
  );
  return lines.join('\n');
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: { report: { type: 'string' }, shard: { type: 'string' } },
  });
  if (!values.report) {
    throw new Error('Usage: summarize-admin-acceptance.js --report=<file> [--shard=<index/total>]');
  }
  let report = null;
  try {
    report = JSON.parse(await fs.readFile(values.report, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  console.log(render(report, values.shard));
}
