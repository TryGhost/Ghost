import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';
import yaml from 'js-yaml';

const servicesRoot = 'ghost/core/server/services';
const inventoryPath = `${servicesRoot}/service-inventory.yaml`;
const bootPath = 'ghost/core/boot.js';
const allowlistPath = '.dependency-cruiser.cjs';
const allowanceTestPath = 'tools/scripts/test/service-dependencies.test.ts';
const lifecycleWords = /\binit|on[- ]demand|lazy|lazily|boot|wrapper|construct|captur|import/i;
const shuffleSeeds = [1, 2, 3];

type Status = 'pass' | 'fail' | 'review' | 'skip';
type Check = { name: string; status: Status; details: string[] };
type CommandResult = { status: number; output: string; stdout?: string };
type CruiseDependency = { module: string; resolved: string; dependencyTypes: string[] };
export type Cruise = {
  modules: Array<{ source: string; dependencies: CruiseDependency[] }>;
  summary: { violations: Array<{ from: string; to: string; rule: { name: string } }> };
};
export type ServiceRule = { from: { path: string; pathNot: string }; to: { pathNot: string[] } };
export type RunCommand = (
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv },
) => CommandResult;

export function findNewJavaScript(addedFiles: string[]) {
  return addedFiles.filter(
    (file) =>
      file.startsWith('ghost/') && /\.(?:js|cjs|mjs)$/.test(file) && !file.includes('/fixtures/'),
  );
}

export function changedAuditShas(inventoryDiff: string) {
  const added = [
    ...inventoryDiff.matchAll(/^\+\s*(?:reviewedAt|auditedAt):\s*([0-9a-f]{7,40})\s*$/gm),
  ];
  return [...new Set(added.map((match) => match[1] as string))];
}

// Prose names a service loosely: "welcome emails" for member-welcome-emails.
export function serviceTerms(service: string) {
  const words = service.replace(/\.[a-z]+$/, '').split('-');
  const starts = words.length === 1 ? [0] : words.slice(0, -1).map((_, index) => index);
  return starts.map((start) => words.slice(start).join('[- ]?').replace(/s?$/, 's?'));
}

export function findInventoryReferences(inventory: string, service: string) {
  const mention = new RegExp(`(?<![\\w-])(?:${serviceTerms(service).join('|')})(?![\\w])`, 'i');
  let entry: string | undefined;
  return inventory.split('\n').flatMap((text, index) => {
    entry = /^ {2}([^\s:#][^:]*):\s*$/.exec(text)?.[1] ?? entry;
    return entry !== undefined &&
      entry !== service &&
      mention.test(text) &&
      lifecycleWords.test(text)
      ? [{ line: index + 1, entry, text: text.trim() }]
      : [];
  });
}

function splitAlternatives(pattern: string) {
  const parts = [''];
  let depth = 0;
  for (const character of pattern) {
    depth += character === '(' ? 1 : character === ')' ? -1 : 0;
    if (character === '|' && depth === 0) {
      parts.push('');
    } else {
      parts[parts.length - 1] += character;
    }
  }
  return parts;
}

// The source text of added string entries, as written in the config file.
export function addedAllowances(allowlistDiff: string) {
  return [...allowlistDiff.matchAll(/^\+\s*'([^']+)',/gm)].map((match) => match[1] as string);
}

// Regression fixtures name package files under node_modules/ and repository files by path.
export function fixturePath(resolved: string) {
  const packagePath = resolved.split('node_modules/');
  return packagePath.length > 1 ? `node_modules/${packagePath.at(-1)}` : resolved;
}

export function builtViolations(cruise: Cruise) {
  return cruise.summary.violations
    .filter(
      ({ rule }) => rule.name === 'service-dependencies' || rule.name === 'service-unresolved',
    )
    .map(({ from, to, rule }) => `${from} → ${to} breaks ${rule.name}.`);
}

// Checks added allowances against the imports dependency-cruiser resolved from migrated
// services, in both the authored-source and built-output runs.
export function allowanceProblems({
  allowances,
  rule,
  cruises,
  regressionCases,
}: {
  allowances: string[];
  rule: ServiceRule;
  cruises: Cruise[];
  regressionCases: string;
}) {
  const from = new RegExp(rule.from.path);
  const fromRoot = new RegExp(rule.from.pathNot);
  const imports = cruises.flatMap(({ modules }) =>
    modules
      .filter(({ source }) => from.test(source) && !fromRoot.test(source))
      .flatMap(({ dependencies }) =>
        dependencies.filter(
          ({ dependencyTypes }) =>
            !dependencyTypes.some((type) => type === 'type-only' || type === 'type-import'),
        ),
      ),
  );
  return allowances.flatMap((allowance) => {
    const unused = splitAlternatives(allowance)
      .filter((alternative) => {
        const pattern = new RegExp(alternative);
        return !imports.some(
          ({ module, resolved }) => pattern.test(module) || pattern.test(resolved),
        );
      })
      .map((alternative) => `${alternative} matches no import from a migrated service.`);
    const pattern = new RegExp(allowance);
    const targets = new Set(
      imports
        .filter(({ resolved }) => pattern.test(resolved))
        .map(({ resolved }) => fixturePath(resolved)),
    );
    const untested = [...targets]
      .filter((target) => !regressionCases.includes(target))
      .map((target) => `${target} has no regression case naming it in full.`);
    return [...unused, ...untested];
  });
}

export function mutateBootInit(boot: string, service: string) {
  const folder = service.replace(/\.[a-z]+$/, '');
  const required = new RegExp(
    `const (\\w+) = require\\('\\./server/services/${folder}(?:/index)?'\\)(?:\\.default)?;`,
  ).exec(boot);
  if (!required) {
    return undefined;
  }
  const call = new RegExp(`\\b${required[1]}\\.init\\(`);
  return call.test(boot)
    ? { variable: required[1] as string, source: boot.replace(call, 'void $&') }
    : undefined;
}

export function verifyService({
  repository,
  service,
  base,
  staticOnly,
  run,
}: {
  repository: string;
  service: string;
  base: string;
  staticOnly: boolean;
  run: RunCommand;
}) {
  const checks: Check[] = [];
  const record = (name: string, status: Status, details: string[] = []) => {
    checks.push({ name, status, details });
  };
  const git = (...args: string[]) => run('git', args, { cwd: repository });
  const lines = (output: string) => output.split('\n').filter(Boolean);
  const read = (file: string) => readFileSync(path.join(repository, file), 'utf8');
  const inventory = read(inventoryPath);
  const { services } = yaml.load(inventory) as {
    services: Record<string, { migrated?: boolean }>;
  };
  const entry = services[service];
  if (!entry) {
    throw new Error(`Unknown service: ${service}`);
  }

  const dirty = lines(git('status', '--porcelain').output);
  record('clean-tree', dirty.length ? 'fail' : 'pass', dirty);
  const current = git('merge-base', '--is-ancestor', base, 'HEAD').status === 0;
  record('base-current', current ? 'pass' : 'fail', current ? [] : [`Rebase onto ${base}.`]);
  if (dirty.length || !current) {
    return checks;
  }

  const range = `${base}...HEAD`;
  const diff = (file: string) => git('diff', range, '--', file).output;
  const added = lines(git('diff', '--name-only', '--diff-filter=A', range).output);
  const changed = lines(git('diff', '--name-only', '--diff-filter=d', range).output);

  const javaScript = findNewJavaScript(added);
  record('new-files-typescript', javaScript.length ? 'fail' : 'pass', javaScript);

  const unreachable = changedAuditShas(diff(inventoryPath)).filter(
    (sha) => git('merge-base', '--is-ancestor', sha, base).status !== 0,
  );
  record(
    'audit-shas-on-base',
    unreachable.length ? 'fail' : 'pass',
    unreachable.map((sha) => `${sha} will not exist after a squash merge; cite a commit on main.`),
  );

  // Ghost runs workspace packages from their built output, while boundary lint resolves
  // them to authored source. Service dependencies must hold under both.
  const cruises: Cruise[] = [];
  for (const resolution of ['source', 'built'] as const) {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_PATH: path.join(repository, 'node_modules'),
      GHOST_DEPENDENCY_RESOLUTION: resolution,
    };
    delete env.GHOST_SERVICE_DEPENDENCY_AUDIT;
    const result = run(
      'pnpm',
      ['exec', 'depcruise', servicesRoot, '--config', allowlistPath, '--output-type', 'json'],
      { cwd: repository, env },
    );
    try {
      cruises.push(JSON.parse(result.stdout ?? result.output) as Cruise);
    } catch {
      record(`dependencies-${resolution}`, 'fail', failureOutput({ ...result, status: 1 }));
    }
  }
  const [, built] = cruises;
  if (built) {
    const violations = builtViolations(built);
    record('built-boundaries', violations.length ? 'fail' : 'pass', violations);
  }

  const written = addedAllowances(diff(allowlistPath));
  if (written.length && cruises.length === 2) {
    const config = createRequire(import.meta.url)(path.join(repository, allowlistPath)) as {
      forbidden: Array<ServiceRule & { name: string }>;
    };
    const rule = config.forbidden.find(({ name }) => name === 'service-dependencies');
    // The diff shows each entry as written, with its backslashes escaped.
    const allowances = (rule?.to.pathNot ?? []).filter(
      (pattern) => !pattern.includes('$1') && written.includes(pattern.replaceAll('\\', '\\\\')),
    );
    const problems = rule
      ? allowanceProblems({
          allowances,
          rule,
          cruises,
          regressionCases: existsSync(path.join(repository, allowanceTestPath))
            ? read(allowanceTestPath)
            : '',
        })
      : ['No service-dependencies rule in the dependency-cruiser config.'];
    record('allowances-accurate', problems.length ? 'fail' : 'pass', problems);
  } else {
    record('allowances-accurate', written.length ? 'skip' : 'pass');
  }

  const references = findInventoryReferences(inventory, service).map(
    (item) => `${inventoryPath}:${item.line} (${item.entry}): ${item.text}`,
  );
  record('inventory-references', references.length ? 'review' : 'pass', references);

  const tools: Array<[string, string, string[], string, NodeJS.ProcessEnv?]> = [];
  const ghostFiles = changed
    .filter((file) => file.startsWith('ghost/') && /\.(?:js|ts|cjs|mjs)$/.test(file))
    .map((file) => file.slice('ghost/'.length));
  const unitFiles = ghostFiles.filter(
    (file) => file.startsWith('test/unit/') && /\.test\.[jt]s$/.test(file),
  );
  const resolvable = { NODE_PATH: path.join(repository, 'node_modules') };
  tools.push(['format', 'pnpm', ['exec', 'oxfmt', '--check', ...changed], repository]);
  if (ghostFiles.length) {
    tools.push(['eslint', 'pnpm', ['exec', 'eslint', ...ghostFiles], 'ghost']);
  }
  tools.push(
    ['oxlint', 'pnpm', ['lint:oxlint'], repository],
    ['boundaries', 'pnpm', ['lint:boundaries'], repository, resolvable],
    [
      'inventory-tests',
      'pnpm',
      ['exec', 'vitest', 'run', '--config', 'vitest.config.inventory.ts'],
      'ghost',
    ],
  );
  for (const [folder, workspace] of [
    ['scripts', '@internal/scripts'],
    ['gx', '@internal/gx'],
  ] as const) {
    if (changed.some((file) => file.startsWith(`tools/${folder}/`))) {
      tools.push([
        `${folder}-tools`,
        'pnpm',
        ['--filter', workspace, 'test'],
        repository,
        resolvable,
      ]);
    }
  }
  // Nx builds the workspace packages that the type checks and direct Vitest runs need.
  tools.push(
    ['unit', 'pnpm', ['nx', 'run', 'ghost:test:unit'], repository],
    ['types-core', 'pnpm', ['exec', 'tsc', '--noEmit'], 'ghost/core'],
    ['types-test', 'pnpm', ['exec', 'tsc', '--noEmit', '-p', 'test/tsconfig.json'], 'ghost'],
  );
  const vitest = ['exec', 'vitest', 'run', '--project', 'unit'];
  if (unitFiles.length) {
    for (const seed of shuffleSeeds) {
      tools.push([
        `changed-tests-seed-${seed}`,
        'pnpm',
        [...vitest, '--sequence.shuffle', `--sequence.seed=${seed}`, ...unitFiles],
        'ghost',
      ]);
    }
    for (const file of unitFiles) {
      tools.push([`alone:${file}`, 'pnpm', [...vitest, file], 'ghost']);
    }
  }

  if (staticOnly) {
    record('tests-and-lint', 'skip', ['Skipped by --static.']);
    return checks;
  }
  for (const [name, command, args, cwd, env] of tools) {
    const result = run(command, args, {
      cwd: path.resolve(repository, cwd),
      env: { ...process.env, ...env },
    });
    record(name, result.status === 0 ? 'pass' : 'fail', failureOutput(result));
  }

  if (entry.migrated) {
    const absolute = path.join(repository, bootPath);
    const original = readFileSync(absolute, 'utf8');
    const mutated = mutateBootInit(original, service);
    if (!mutated) {
      record('boot-waits-for-init', 'fail', [`No init call for ${service} found in boot.js.`]);
    } else {
      try {
        writeFileSync(absolute, mutated.source);
        const result = run('pnpm', [...vitest, 'test/unit/boot'], {
          cwd: path.join(repository, 'ghost'),
        });
        record(
          'boot-waits-for-init',
          result.status === 0 ? 'fail' : 'pass',
          result.status === 0
            ? [`Boot tests still pass when boot does not wait for ${mutated.variable}.init().`]
            : [],
        );
      } finally {
        writeFileSync(absolute, original);
      }
    }
  }
  return checks;
}

function failureOutput(result: CommandResult) {
  if (result.status === 0) {
    return [];
  }
  const output = result.output.trimEnd().split('\n');
  const failures = output.filter((line) => /\bFAIL\b|error TS\d+/.test(line));
  return (failures.length ? failures : output).slice(-30);
}

const runCommand: RunCommand = (command, args, { cwd, env }) => {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error) {
    throw result.error;
  }
  return {
    status: result.status ?? 1,
    output: `${result.stdout}${result.stderr}`,
    stdout: result.stdout,
  };
};

const usage = `Usage: pnpm gx services verify <service> [--base <ref>] [--static] [--json]

Checks a committed service change before it is reported or pushed. Fails on a dirty
tree or a branch that does not contain the base. "review" lines need a person or
the verify-service-change skill to confirm they are still true.

  --base <ref>  Commit the branch must contain (default: origin/main, fetched first)
  --static      Skip lint, types and tests
  --json        Print the checks as JSON
`;

export function runServicesVerify(args: string[]) {
  try {
    const { values, positionals } = parseArgs({
      args,
      options: {
        base: { type: 'string' },
        static: { type: 'boolean' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
      allowPositionals: true,
    });
    if (values.help) {
      process.stdout.write(usage);
      return;
    }
    const [service] = positionals;
    if (!service || positionals.length > 1) {
      throw new Error('Supply exactly one service name.');
    }
    const repository = path.resolve(import.meta.dirname, '../..');
    if (!values.base) {
      runCommand('git', ['fetch', '-q', 'origin', 'main'], { cwd: repository });
    }
    const checks = verifyService({
      repository,
      service,
      base: values.base ?? 'origin/main',
      staticOnly: values.static ?? false,
      run: runCommand,
    });
    process.stdout.write(
      values.json
        ? `${JSON.stringify(checks, null, 2)}\n`
        : checks
            .map((check) =>
              [`${check.status.toUpperCase().padEnd(6)} ${check.name}`, ...check.details].join(
                '\n       ',
              ),
            )
            .join('\n') + '\n',
    );
    process.exitCode = checks.some((check) => check.status === 'fail') ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
