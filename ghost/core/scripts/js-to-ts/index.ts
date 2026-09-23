#!/usr/bin/env node

// Converts JavaScript files to TypeScript where a mechanical conversion is
// safe. For each file, this:
//
// 1. converts it with a codemod (see codemod.ts), renames it to `.ts`, and
//    formats it;
// 2. type-checks the project, adding `@ts-expect-error` above imports of
//    modules that lack type definitions (and, with --allow-any, annotating
//    implicit `any`s), and reverts if any other error remains;
// 3. compiles the new file and reverts if the output isn't equivalent to
//    the original (see equivalence.ts);
// 4. optionally (--test) runs the file's tests and reverts if they fail.
//
// Run `pnpm convert-to-ts --help` for options.

import { spawnSync } from 'node:child_process';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import ts from 'typescript';

import { convertToTypeScript, isPureStatement } from './codemod';
import { checkEquivalence } from './equivalence';
import { IncrementalTypeChecker, type TypeCheckError } from './typecheck';

const CORE_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(CORE_ROOT, '../..');
const OXFMT = path.join(REPO_ROOT, 'node_modules/.bin/oxfmt');
const MISSING_TYPES_ERROR = 7016;
const EXPECT_ERROR_COMMENT = '// @ts-expect-error This module lacks type definitions.';

const USAGE = `Usage: pnpm convert-to-ts [options] [globs...]

Converts JavaScript files matching the globs (relative to ghost/core; default:
test/**/*.js) to TypeScript, keeping only conversions that type-check and
compile to equivalent JavaScript.

Options:
  --exclude <glob>   Skip files matching this glob. Repeatable. Default:
                     **/fixtures/**
  --tsconfig <path>  The project to type-check. Default: test/tsconfig.json
  --allow-any        Annotate implicit \`any\`s (\`let x;\`, untyped parameters)
                     with explicit ones instead of reverting.
  --test             Also run each converted test file, reverting on failure.
  --dry-run          Report what would be converted, then revert everything.
  --limit <n>        Stop after trying this many files.
  --report <path>    Write a JSON report of every file's outcome.
  --verbose          Print why each file was skipped or reverted.
  -h, --help         Show this message.`;

type Outcome =
  | { status: 'converted' }
  | { status: 'skipped'; reason: string }
  | {
      status: 'reverted';
      stage: 'typecheck' | 'equivalence' | 'test';
      reason: string;
      details?: string;
    };

function listFiles(globs: string[], excludes: string[]): string[] {
  const pathspecs = [
    ...globs.map((glob) => `:(glob)${glob}`),
    ...excludes.map((glob) => `:(glob,exclude)${glob}`),
  ];
  const result = spawnSync('git', ['ls-files', '-z', '--', ...pathspecs], {
    cwd: CORE_ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr}`);
  }
  const files = result.stdout
    .split('\0')
    .filter((file) => file.endsWith('.js'))
    .map((file) => path.resolve(CORE_ROOT, file));
  // Convert helpers before the tests that import them, so that the tests
  // can import the converted helpers with their types.
  const isTest = (file: string) => /\.test\.js$/.test(file);
  return [...files.filter((file) => !isTest(file)), ...files.filter(isTest)];
}

function format(file: string): void {
  // oxfmt isn't always idempotent, so format until a check passes.
  for (let attempt = 0; attempt < 3; attempt++) {
    const check = spawnSync(OXFMT, ['--check', file], { cwd: REPO_ROOT });
    if (check.status === 0) {
      return;
    }
    spawnSync(OXFMT, [file], { cwd: REPO_ROOT });
  }
}

function describeErrors(errors: TypeCheckError[]): string {
  const shown = errors.slice(0, 5);
  const more = errors.length - shown.length;
  return shown
    .map((error) => {
      const location = error.fileName ? path.relative(CORE_ROOT, error.fileName) : '<global>';
      return `${location}: TS${error.code}: ${error.message}`;
    })
    .concat(more > 0 ? [`...and ${more} more`] : [])
    .join('\n');
}

// Errors about implicit `any`s that `--allow-any` fixes by making them
// explicit: variables, parameters, destructured parameters, and rest
// parameters.
const IMPLICIT_ANY_ERRORS = new Set([7005, 7006, 7019, 7031, 7034]);

/**
 * Makes mechanical fixes for type errors in the converted file: adds
 * `@ts-expect-error` comments above imports of modules that lack type
 * definitions and, if `allowAny` is set, annotates implicit `any`s. Returns
 * false, without changing anything, if any error isn't one of those.
 */
function fixTypeErrors(tsFile: string, errors: TypeCheckError[], allowAny: boolean): boolean {
  const source = readFileSync(tsFile, 'utf8');
  const sourceFile = ts.createSourceFile(
    tsFile,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const commentLines = new Set<number>();
  const annotations = new Map<number, string>();
  for (const error of errors) {
    if (error.fileName !== tsFile || error.start === undefined) {
      return false;
    }
    const node = findNode(sourceFile, error.start);

    if (error.code === MISSING_TYPES_ERROR && node && ts.isImportDeclaration(node.parent)) {
      commentLines.add(sourceFile.getLineAndCharacterOfPosition(error.start).line);
      continue;
    }

    if (!allowAny || !IMPLICIT_ANY_ERRORS.has(error.code) || !node) {
      return false;
    }
    if (error.code === 7005) {
      // "Variable implicitly has an 'any' type" at a use, which annotating
      // the declaration (reported as 7034) fixes.
      continue;
    }
    let declaration: ts.Node | undefined = node.parent;
    while (declaration && ts.isBindingElement(declaration)) {
      declaration = declaration.parent.parent;
    }
    if (
      !declaration ||
      !(ts.isParameter(declaration) || ts.isVariableDeclaration(declaration)) ||
      declaration.type
    ) {
      return false;
    }
    const after =
      ts.isParameter(declaration) && declaration.questionToken
        ? declaration.questionToken
        : declaration.name;
    const isRest = ts.isParameter(declaration) && declaration.dotDotDotToken;
    const annotation = isRest ? ': any[]' : ': any';
    // `x => x` needs parentheses to become `(x: any) => x`.
    const start = declaration.getStart(sourceFile);
    if (ts.isParameter(declaration) && !/[(,]\s*$/.test(source.slice(0, start))) {
      annotations.set(start, '(');
      annotations.set(after.end, `${annotation})`);
    } else {
      annotations.set(after.end, annotation);
    }
  }

  let output = source;
  for (const [position, annotation] of [...annotations].sort(([a], [b]) => b - a)) {
    output = output.slice(0, position) + annotation + output.slice(position);
  }
  // Annotations never add lines, so line numbers still hold.
  const lines = output.split('\n');
  for (const line of [...commentLines].sort((a, b) => b - a)) {
    const indentation = lines[line].match(/^\s*/)![0];
    lines.splice(line, 0, `${indentation}${EXPECT_ERROR_COMMENT}`);
  }
  writeFileSync(tsFile, lines.join('\n'));
  return true;
}

/** The innermost node that starts at `position`. */
function findNode(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
  let found: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (node.getStart(sourceFile) <= position && position < node.end) {
      if (node.getStart(sourceFile) === position) {
        found = node;
      }
      ts.forEachChild(node, visit);
    }
  };
  visit(sourceFile);
  return found;
}

function runTest(tsFile: string): { passed: boolean; output: string } {
  const relative = path.relative(CORE_ROOT, tsFile);
  const args = ['exec', 'vitest', 'run'];
  if (!relative.startsWith(`test${path.sep}unit${path.sep}`)) {
    args.push('-c', 'vitest.config.db.ts');
  }
  const result = spawnSync('pnpm', [...args, relative], { cwd: CORE_ROOT, encoding: 'utf8' });
  return { passed: result.status === 0, output: `${result.stdout}\n${result.stderr}` };
}

function convertFile(
  jsFile: string,
  checker: IncrementalTypeChecker,
  options: { runTests: boolean; allowAny: boolean },
): { outcome: Outcome; revert: () => void } {
  const tsFile = jsFile.replace(/\.js$/, '.ts');
  const original = readFileSync(jsFile, 'utf8');
  const noop = () => {};

  const converted = convertToTypeScript(jsFile, original);
  if (!converted.ok) {
    return { outcome: { status: 'skipped', reason: converted.reason }, revert: noop };
  }

  renameSync(jsFile, tsFile);
  writeFileSync(tsFile, converted.output);
  const revert = () => {
    renameSync(tsFile, jsFile);
    writeFileSync(jsFile, original);
  };
  const fail = (outcome: Outcome) => {
    revert();
    return { outcome, revert: noop };
  };

  format(tsFile);
  let errors = checker.getNewErrors();
  // Fixes can uncover more errors (for example, an annotated variable's
  // uses), so keep going while they help.
  for (let attempt = 0; attempt < 4 && errors.length > 0; attempt++) {
    if (!fixTypeErrors(tsFile, errors, options.allowAny)) {
      break;
    }
    format(tsFile);
    errors = checker.getNewErrors();
  }
  if (errors.length > 0) {
    return fail({
      status: 'reverted',
      stage: 'typecheck',
      reason: `${errors.length} type error(s)`,
      details: describeErrors(errors),
    });
  }

  const equivalence = checkEquivalence(
    jsFile,
    original,
    tsFile,
    readFileSync(tsFile, 'utf8'),
    checker.options,
    isPureStatement,
  );
  if (!equivalence.equivalent) {
    let details: string | undefined;
    if (equivalence.before !== undefined && equivalence.after !== undefined) {
      details = `original:\n${equivalence.before}\ncompiled:\n${equivalence.after}`;
    }
    return fail({ status: 'reverted', stage: 'equivalence', reason: equivalence.reason, details });
  }

  if (options.runTests && /\.test\.ts$/.test(tsFile)) {
    const test = runTest(tsFile);
    if (!test.passed) {
      return fail({
        status: 'reverted',
        stage: 'test',
        reason: 'tests failed',
        details: test.output,
      });
    }
  }

  return { outcome: { status: 'converted' }, revert };
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      exclude: { type: 'string', multiple: true },
      tsconfig: { type: 'string', default: 'test/tsconfig.json' },
      test: { type: 'boolean', default: false },
      'allow-any': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      limit: { type: 'string' },
      report: { type: 'string' },
      verbose: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const globs = positionals.length > 0 ? positionals : ['test/**/*.js'];
  const excludes = values.exclude ?? ['**/fixtures/**'];
  const limit = values.limit === undefined ? Infinity : Number(values.limit);
  let files = listFiles(globs, excludes);
  files = files.slice(0, limit);

  const log = (message: string) => process.stdout.write(`${message}\n`);
  log(`Type-checking ${values.tsconfig} for a baseline...`);
  const checker = new IncrementalTypeChecker(path.resolve(CORE_ROOT, values.tsconfig));

  const outcomes: Record<string, Outcome> = {};
  const reverts: Array<() => void> = [];
  files.forEach((file, index) => {
    const relative = path.relative(CORE_ROOT, file);
    const { outcome, revert } = convertFile(file, checker, {
      runTests: values.test,
      allowAny: values['allow-any'],
    });
    outcomes[relative] = outcome;
    reverts.push(revert);

    let line = `[${index + 1}/${files.length}] ${outcome.status}: ${relative}`;
    if (outcome.status === 'skipped') {
      line += values.verbose ? ` (${outcome.reason})` : '';
    } else if (outcome.status === 'reverted') {
      line += ` (${outcome.stage}: ${outcome.reason})`;
      if (values.verbose && outcome.details) {
        line += `\n${outcome.details.replace(/^/gm, '    ')}`;
      }
    }
    log(line);
  });

  if (values['dry-run']) {
    reverts.reverse().forEach((revert) => revert());
  }

  if (values.report) {
    writeFileSync(path.resolve(values.report), `${JSON.stringify(outcomes, null, 2)}\n`);
  }

  const counts = { converted: 0, skipped: 0, reverted: 0 };
  Object.values(outcomes).forEach((outcome) => counts[outcome.status]++);
  log(
    `\n${values['dry-run'] ? 'Would convert' : 'Converted'} ${counts.converted} file(s); ` +
      `skipped ${counts.skipped}; reverted ${counts.reverted}.`,
  );
}

main();
