import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, copyFile, stat, writeFile } from 'node:fs/promises';
import { arch, platform } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const root = resolve(import.meta.dirname, '..');
const app = join(root, 'apps/admin');
const children = new Set();
let interrupted = false;

const git = (...args) => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  }
  return result.stdout;
};
const digest = (value) => createHash('sha256').update(value).digest('hex');
const sourceState = () => `${git('rev-parse', 'HEAD')}${git('diff', 'HEAD')}`;
const positiveInteger = (value, name) => {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return Number(value);
};

export async function discoverFiles(directory, filters = []) {
  const entries = await readdir(join(directory, 'src'), { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(acceptance|component)\.test\.tsx$/.test(entry.name))
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
    .filter((file) => !filters.length || filters.some((filter) => file.includes(filter)))
    .sort();
}

export function inspectReport(report, exitCode) {
  const files = report?.testResults ?? [];
  const collectedAssertions = files.flatMap((file) =>
    (file.assertionResults ?? []).map((test) => `${relative(app, file.name)}\0${test.fullName}`),
  );
  const failures = files.flatMap((file) => {
    const assertions = (file.assertionResults ?? [])
      .filter((test) => test.status === 'failed')
      .map((test) => ({
        file: relative(app, file.name),
        test: test.fullName,
        errors: test.failureMessages,
      }));
    if (file.status === 'failed' && assertions.length === 0) {
      assertions.push({
        file: relative(app, file.name),
        test: '(file/hook)',
        errors: [file.message],
      });
    }
    return assertions;
  });
  return {
    clean:
      exitCode === 0 &&
      report?.success === true &&
      files.length > 0 &&
      report.numPassedTests > 0 &&
      report.numFailedTests === 0 &&
      report.numPendingTests === 0 &&
      files.every(
        (file) =>
          file.status === 'passed' &&
          file.assertionResults?.length > 0 &&
          file.assertionResults.every((test) => test.status === 'passed'),
      ) &&
      failures.length === 0,
    passed: report?.numPassedTests ?? 0,
    failed: report?.numFailedTests ?? 0,
    pending: report?.numPendingTests ?? 0,
    files: files.map((file) => relative(app, file.name)).sort(),
    assertions: collectedAssertions.sort(),
    failures,
  };
}

export function inspectRound(shards, expectedFiles, expectedAssertions = null) {
  const files = shards.flatMap((shard) => shard.files).sort();
  const missing = expectedFiles.filter((file) => !files.includes(file));
  const unexpected = files.filter((file) => !expectedFiles.includes(file));
  const duplicated = files.filter((file, index) => files.indexOf(file) !== index);
  const assertions = shards.flatMap((shard) => shard.assertions ?? []).sort();
  const changedAssertions =
    expectedAssertions !== null &&
    JSON.stringify(assertions) !== JSON.stringify(expectedAssertions);
  return {
    clean:
      shards.every((shard) => shard.clean) &&
      !missing.length &&
      !unexpected.length &&
      !duplicated.length &&
      !changedAssertions,
    missing,
    unexpected,
    duplicated,
    changedAssertions,
    assertions,
    passed: shards.reduce((sum, shard) => sum + shard.passed, 0),
    failed: shards.reduce((sum, shard) => sum + shard.failed, 0),
    pending: shards.reduce((sum, shard) => sum + shard.pending, 0),
  };
}

const markdownCell = (value) =>
  String(value ?? '')
    .replaceAll('|', '\\|')
    .replace(/\s+/g, ' ');

export function renderSummary(summary) {
  const failures = new Map();
  for (const round of summary.rounds) {
    for (const shard of round.shards) {
      for (const failure of shard.failures) {
        const key = `${failure.file}\n${failure.test}`;
        const entry = failures.get(key) ?? { ...failure, rounds: [] };
        entry.rounds.push(
          `${round.round}/${shard.shard}${round.seed === null ? '' : ` (seed ${round.seed})`}`,
        );
        failures.set(key, entry);
      }
    }
  }
  const lines = [
    '# Admin acceptance stress results',
    '',
    `Commit: \`${summary.commit}\`. Source hash: \`${summary.sourceHash}\`.`,
    `Scope: ${summary.filters.length ? `filtered (${summary.filters.join(', ')})` : 'entire suite'}; ${summary.expectedFiles.length} files; ${summary.shards} shards × ${summary.workers} workers.`,
    `Completed ${summary.completed}/${summary.runs} rounds: ${summary.cleanRounds} clean, ${summary.failedRounds} failed; ${summary.consecutiveClean} consecutive clean rounds.`,
    'Retries disabled. Every round starts fresh test processes. A clean round requires successful, nonempty reports and complete file coverage.',
    '',
    '| Round | Order | Seed | Passed | Failed | Result |',
    '| --- | --- | --- | --- | --- | --- |',
    ...summary.rounds.map(
      (round) =>
        `| ${round.round} | ${round.order} | ${round.seed ?? '—'} | ${round.passed} | ${round.failed} | ${round.clean ? 'PASS' : 'FAIL'} |`,
    ),
  ];
  if (failures.size) {
    lines.push(
      '',
      '## Reproduced failures',
      '',
      '| File | Test | Round/shard | First error |',
      '| --- | --- | --- | --- |',
    );
    for (const failure of failures.values()) {
      lines.push(
        `| ${markdownCell(failure.file)} | ${markdownCell(failure.test)} | ${markdownCell(failure.rounds.join(', '))} | ${markdownCell(failure.errors?.[0]?.slice(0, 300))} |`,
      );
    }
  }
  for (const round of summary.rounds.filter((entry) => !entry.clean)) {
    if (round.changedAssertions) {
      lines.push(
        '',
        `Round ${round.round}: collected tests differ from the first complete clean round.`,
      );
    }
    for (const kind of ['missing', 'unexpected', 'duplicated']) {
      if (round[kind].length) {
        lines.push(
          '',
          `Round ${round.round}: ${kind} files: ${round[kind].map(markdownCell).join(', ')}.`,
        );
      }
    }
  }
  lines.push(
    '',
    'See each `run-NNN/shard-N/` directory for the exact command, full report, console log, and failure screenshots. Process or report errors can fail a round even with zero failed assertions.',
    '',
  );
  return lines.join('\n');
}

async function preserveScreenshots(destination, startedAt) {
  const files = await readdir(join(app, 'src'), { recursive: true });
  for (const file of files.filter(
    (name) => name.includes('__screenshots__/') && name.endsWith('.png'),
  )) {
    const source = join(app, 'src', file);
    if ((await stat(source)).mtimeMs >= startedAt) {
      const target = join(destination, 'screenshots', file);
      await mkdir(resolve(target, '..'), { recursive: true });
      await copyFile(source, target);
    }
  }
}

async function runShard({ directory, round, shard, shards, workers, seed, shuffle, filters }) {
  const destination = join(directory, `run-${String(round).padStart(3, '0')}`, `shard-${shard}`);
  await mkdir(destination, { recursive: true });
  const reportPath = join(destination, 'report.json');
  const args = [
    '--dir',
    app,
    'test:acceptance',
    ...filters,
    `--shard=${shard}/${shards}`,
    `--maxWorkers=${workers}`,
    '--retry=0',
    '--reporter=minimal',
    '--reporter=json',
    `--outputFile.json=${reportPath}`,
  ];
  if (shuffle) {
    args.push('--sequence.shuffle', `--sequence.seed=${seed}`);
  }
  const startedAt = Date.now();
  const log = createWriteStream(join(destination, 'console.log'));
  const child = spawn('pnpm', args, {
    cwd: root,
    env: { ...process.env, CI: 'true', DISABLE_V8_COMPILE_CACHE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  children.add(child);
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  const exitCode = await new Promise((accept, reject) => {
    child.once('error', reject);
    child.once('close', (code) => accept(code));
  });
  children.delete(child);
  await new Promise((accept) => {
    log.end(accept);
  });
  let report = null;
  try {
    report = JSON.parse(await readFile(reportPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  const result = {
    round,
    shard,
    seed: shuffle ? seed : null,
    order: shuffle ? 'shuffled' : 'default',
    command: ['pnpm', ...args],
    startedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    exitCode,
    ...inspectReport(report, exitCode),
  };
  if (!result.clean) {
    await preserveScreenshots(destination, startedAt);
  }
  await writeFile(join(destination, 'result.json'), JSON.stringify(result, null, 2));
  console.log(
    `Run ${round}, shard ${shard}/${shards}: ${result.clean ? 'PASS' : 'FAIL'} (${result.passed} passed, ${result.failed} failed, ${(result.durationMs / 1000).toFixed(1)}s)`,
  );
  return result;
}

async function main() {
  const { values, positionals: filters } = parseArgs({
    allowPositionals: true,
    options: {
      runs: { type: 'string', default: '30' },
      'until-clean': { type: 'string' },
      'review-after': { type: 'string' },
      shards: { type: 'string', default: '2' },
      workers: { type: 'string', default: '3' },
      seed: { type: 'string', default: '31317' },
      order: { type: 'string', default: 'mixed' },
      output: { type: 'string' },
    },
  });
  const runs = positiveInteger(values.runs, 'runs');
  const target = values['until-clean']
    ? positiveInteger(values['until-clean'], 'until-clean')
    : null;
  const reviewAfter = values['review-after']
    ? positiveInteger(values['review-after'], 'review-after')
    : null;
  const shards = positiveInteger(values.shards, 'shards');
  const workers = positiveInteger(values.workers, 'workers');
  const seed = positiveInteger(values.seed, 'seed');
  if (!['mixed', 'default', 'shuffled'].includes(values.order)) {
    throw new Error('order must be mixed, default, or shuffled');
  }
  const directory = resolve(
    root,
    values.output ??
      `apps/admin/test-results/stress/${new Date().toISOString().replaceAll(':', '-')}`,
  );
  // Refuse reuse: every attempt needs its own reports, logs, and source snapshot.
  await mkdir(directory, { recursive: true });
  const state = sourceState();
  const sourceHash = digest(state);
  const expectedFiles = await discoverFiles(app, filters);
  if (!expectedFiles.length) {
    throw new Error('No matching test files');
  }
  const metadata = {
    startedAt: new Date().toISOString(),
    commit: git('rev-parse', 'HEAD').trim(),
    sourceHash,
    node: process.version,
    platform: platform(),
    arch: arch(),
    runs,
    target,
    reviewAfter,
    shards,
    workers,
    seed,
    order: values.order,
    filters,
    expectedFiles,
  };
  await writeFile(join(directory, 'metadata.json'), JSON.stringify(metadata, null, 2), {
    flag: 'wx',
  });
  await writeFile(join(directory, 'source.patch'), git('diff', 'HEAD'));
  await copyFile(import.meta.filename, join(directory, 'runner.js'));
  const rounds = [];
  let consecutiveClean = 0;
  let expectedAssertions = null;
  console.log(
    `Stress run: ${expectedFiles.length} files, ${shards} shards × ${workers} workers; ${directory}`,
  );
  for (let round = 1; round <= runs && !interrupted; round++) {
    if (digest(sourceState()) !== sourceHash) {
      throw new Error('Source changed during the batch; start a new batch after fixes');
    }
    const shuffle = values.order === 'shuffled' || (values.order === 'mixed' && round % 2 === 0);
    const results = await Promise.all(
      Array.from({ length: shards }, (_, index) =>
        runShard({
          directory,
          round,
          shard: index + 1,
          shards,
          workers,
          seed: seed + round - 1,
          shuffle,
          filters,
        }),
      ),
    );
    const result = {
      round,
      order: shuffle ? 'shuffled' : 'default',
      seed: shuffle ? seed + round - 1 : null,
      shards: results,
      ...inspectRound(results, expectedFiles, expectedAssertions),
    };
    if (result.clean && expectedAssertions === null) {
      expectedAssertions = result.assertions;
    }
    rounds.push(result);
    consecutiveClean = result.clean ? consecutiveClean + 1 : 0;
    const summary = {
      ...metadata,
      completed: rounds.length,
      consecutiveClean,
      cleanRounds: rounds.filter((entry) => entry.clean).length,
      failedRounds: rounds.filter((entry) => !entry.clean).length,
      rounds,
    };
    await writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
    await writeFile(join(directory, 'summary.md'), renderSummary(summary));
    console.log(
      `Completed ${round}/${runs}: ${result.clean ? 'PASS' : 'FAIL'}; ${consecutiveClean} consecutive clean ${filters.length ? 'selected-suite' : 'full-suite'} rounds`,
    );
    if (target && consecutiveClean >= target) {
      break;
    }
    if (reviewAfter && round >= reviewAfter && rounds.some((entry) => !entry.clean)) {
      console.log('Failure review required; fix the source and start a new batch.');
      break;
    }
  }
  process.exitCode = interrupted
    ? 130
    : target
      ? consecutiveClean >= target
        ? 0
        : 1
      : rounds.every((round) => round.clean)
        ? 0
        : 1;
}

if (import.meta.main) {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      interrupted = true;
      for (const child of children) {
        if (process.platform === 'win32') {
          child.kill(signal);
        } else {
          process.kill(-child.pid, signal);
        }
      }
    });
  }
  await main();
}
