import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { compileFunction } from 'node:vm';
import {
  legacyInventoryFile as inventoryPath,
  parseLegacyServices,
  servicesRoot,
} from '../configs/oxlint/legacy-services.ts';

const bootPath = 'ghost/core/boot.ts';
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
export type SpecialistEntry = { dependency: string; owners: string[] };
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

// Service rule violations keyed by importing file and the specifier as written, so
// the same import matches across resolutions even though its resolved path differs.
function serviceViolations(cruise: Cruise) {
  const specifiers = new Map(
    cruise.modules.flatMap(({ source, dependencies }) =>
      dependencies.map(({ module, resolved }) => [`${source}\0${resolved}`, module] as const),
    ),
  );
  return cruise.summary.violations
    .filter(({ rule }) =>
      ['service-dependencies', 'service-unresolved', 'specialist-dependencies'].includes(rule.name),
    )
    .map((violation) => ({
      ...violation,
      key: `${violation.from}\0${specifiers.get(`${violation.from}\0${violation.to}`) ?? violation.to}`,
    }));
}

// Violations that appear only when packages resolve to built output. Known
// violations, which boundary lint already tracks, appear in both runs.
export function builtOnlyViolations(source: Cruise, built: Cruise) {
  const known = new Set(serviceViolations(source).map(({ key }) => key));
  return serviceViolations(built)
    .filter(({ key }) => !known.has(key))
    .map(({ from, to, rule }) => `${from} → ${to} breaks ${rule.name}.`);
}

// Checks added allowances against the imports dependency-cruiser resolved from
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
      .map((alternative) => `${alternative} matches no import from a service.`);
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

// Evaluates a version of the boundary config, such as the one at the base commit,
// resolving its requires from the repository as the real file would.
export function evaluateConfig(source: string, repository: string): unknown {
  const filename = path.join(repository, allowlistPath);
  const module = { exports: {} as unknown };
  compileFunction(source, ['module', 'exports', 'require', '__filename', '__dirname'], {
    filename,
  })(module, module.exports, createRequire(filename), filename, repository);
  return module.exports;
}

function readSpecialists(config: unknown): SpecialistEntry[] {
  const entries = (config as { specialistDependencies?: unknown } | undefined)
    ?.specialistDependencies;
  return Array.isArray(entries)
    ? entries.filter(
        (entry): entry is SpecialistEntry =>
          typeof entry?.dependency === 'string' &&
          Array.isArray(entry.owners) &&
          entry.owners.every((owner: unknown) => typeof owner === 'string'),
      )
    : [];
}

// Specialist entries that are new, or whose owners changed, since the base.
// Only the owners added to an existing entry need checking.
export function changedSpecialists(base: SpecialistEntry[], head: SpecialistEntry[]) {
  return head.flatMap(({ dependency, owners }) => {
    const before = base.find((entry) => entry.dependency === dependency);
    const added = owners.filter((owner) => !before?.owners.includes(owner));
    return added.length ? [{ dependency, owners: added }] : [];
  });
}

// Checks changed specialist entries against the imports dependency-cruiser resolved:
// each new owner must import the dependency, every alternative of a new dependency
// pattern must match an import from its owners, and each resolved target needs a
// regression case. The verify scan covers services only, so owners outside them
// are not checked.
export function specialistProblems({
  entries,
  isNew,
  cruises,
  regressionCases,
}: {
  entries: SpecialistEntry[];
  isNew: (dependency: string) => boolean;
  cruises: Cruise[];
  regressionCases: string;
}) {
  const scanned = new RegExp(`^${servicesRoot}/`);
  return entries.flatMap(({ dependency, owners }) => {
    const ownerPatterns = owners
      .filter((owner) => scanned.test(owner.replace(/^\^/, '')))
      .map((owner) => ({ owner, pattern: new RegExp(owner) }));
    const pattern = new RegExp(dependency);
    const importsBy = (matcher: RegExp) =>
      cruises.flatMap(({ modules }) =>
        modules
          .filter(({ source }) => matcher.test(source))
          .flatMap(({ dependencies }) =>
            dependencies.filter(
              ({ dependencyTypes }) =>
                !dependencyTypes.some((type) => type === 'type-only' || type === 'type-import'),
            ),
          ),
      );
    const problems: string[] = [];
    const imports = ownerPatterns.flatMap(({ owner, pattern: ownerPattern }) => {
      const found = importsBy(ownerPattern).filter(
        ({ module, resolved }) => pattern.test(module) || pattern.test(resolved),
      );
      if (!found.length) {
        problems.push(`${owner} does not import ${dependency}.`);
      }
      return found;
    });
    if (ownerPatterns.length && isNew(dependency)) {
      for (const alternative of splitAlternatives(dependency)) {
        const matcher = new RegExp(alternative);
        if (
          !imports.some(({ module, resolved }) => matcher.test(module) || matcher.test(resolved))
        ) {
          problems.push(`${alternative} matches no import from its owners in services.`);
        }
      }
    }
    for (const target of new Set(imports.map(({ resolved }) => fixturePath(resolved)))) {
      if (!regressionCases.includes(target)) {
        problems.push(`${target} has no regression case naming it in full.`);
      }
    }
    return problems;
  });
}

// Finds a root's init() through its binding in boot.ts, the one form the generator
// and the guides give: `const x = require('./server/services/<name>').default;`,
// with or without a type on the binding, followed by `x.init()`. An inline
// `require(...).default.init()` is not found.
export function mutateBootInit(boot: string, service: string) {
  const folder = service.replace(/\.[a-z]+$/, '');
  const bindings = boot.matchAll(
    new RegExp(
      `const (\\w+)(?:: [^=]+?)? =\\s+require\\('\\./server/services/${folder}(?:/index)?'\\)(?:\\.default)?;`,
      'g',
    ),
  );
  // A binding is local to its boot phase and other phases reuse names, such as
  // themeService. Look for its init() only from the binding to the end of that phase.
  let found: { variable: string; index: number; length: number } | undefined;
  for (const required of bindings) {
    const from = required.index + required[0].length;
    const next = /^(?:async )?function /m.exec(boot.slice(from));
    const call = new RegExp(`\\b${required[1]}\\.init\\(`).exec(
      boot.slice(from, next ? from + next.index : undefined),
    );
    if (call) {
      found = { variable: required[1] as string, index: from + call.index, length: call[0].length };
      break;
    }
  }
  if (!found) {
    return undefined;
  }
  // Find the end of the call, including its arguments.
  let depth = 0;
  let end = found.index + found.length - 1;
  for (; end < boot.length; end++) {
    depth += boot[end] === '(' ? 1 : boot[end] === ')' ? -1 : 0;
    if (depth === 0) {
      break;
    }
  }
  const call = boot.slice(found.index, end + 1);
  // Boot moves on after a chain of promise steps. An init that rejects within them,
  // like a stub behind an async wrapper, still fails boot; one a test holds pending
  // until a timer or setImmediate does not stop it. Only a test that holds init
  // pending can tell the difference. Boot tests run boot.ts in a vm context without
  // Node globals, so this uses Promise alone.
  const movedOn = 'Array.from({ length: 50 }).reduce((step) => step.then(), Promise.resolve())';
  return {
    variable: found.variable,
    source: `${boot.slice(0, found.index)}Promise.race([${call}, ${movedOn}])${boot.slice(end + 1)}`,
  };
}

export function verifyService({
  repository,
  service,
  base,
  main = base,
  staticOnly,
  run,
}: {
  repository: string;
  service: string;
  base: string;
  // Audit revisions must survive a squash merge, so they are checked against main
  // even when the branch is compared with another base.
  main?: string;
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
  // A service that the legacy service inventory does not list is standard.
  const standard = !parseLegacyServices(inventory).has(service);
  if (standard && !existsSync(path.join(repository, servicesRoot, service))) {
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
    (sha) => git('merge-base', '--is-ancestor', sha, main).status !== 0,
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
  const [source, built] = cruises;
  if (source && built) {
    const violations = builtOnlyViolations(source, built);
    record('built-boundaries', violations.length ? 'fail' : 'pass', violations);
  }

  const written = addedAllowances(diff(allowlistPath));
  const configPath = path.join(repository, allowlistPath);
  const config = existsSync(configPath)
    ? (createRequire(import.meta.url)(configPath) as {
        forbidden: Array<ServiceRule & { name: string }>;
      })
    : undefined;
  const baseSource = git('show', `${base}:${allowlistPath}`);
  const baseSpecialists =
    baseSource.status === 0
      ? readSpecialists(evaluateConfig(baseSource.stdout ?? baseSource.output, repository))
      : [];
  const specialists = changedSpecialists(baseSpecialists, readSpecialists(config));
  if ((written.length || specialists.length) && cruises.length === 2) {
    const rule = config?.forbidden.find(({ name }) => name === 'service-dependencies');
    // The diff shows each entry as written, with its backslashes escaped. Specialist
    // patterns are exempt from the service rule too, but are checked below.
    const allowances = (rule?.to.pathNot ?? []).filter(
      (pattern) => !pattern.includes('$1') && written.includes(pattern.replaceAll('\\', '\\\\')),
    );
    const regressionCases = existsSync(path.join(repository, allowanceTestPath))
      ? read(allowanceTestPath)
      : '';
    const problems = [
      ...(rule
        ? allowanceProblems({ allowances, rule, cruises, regressionCases })
        : ['No service-dependencies rule in the dependency-cruiser config.']),
      ...specialistProblems({
        entries: specialists,
        isNew: (dependency) => !baseSpecialists.some((entry) => entry.dependency === dependency),
        cruises,
        regressionCases,
      }),
    ];
    record('allowances-accurate', problems.length ? 'fail' : 'pass', problems);
  } else {
    record('allowances-accurate', written.length || specialists.length ? 'skip' : 'pass');
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

  if (standard) {
    const absolute = path.join(repository, bootPath);
    const original = readFileSync(absolute, 'utf8');
    const mutated = mutateBootInit(original, service);
    if (!mutated) {
      record('boot-waits-for-init', 'fail', [
        `No init call for ${service} found in boot.ts.`,
        `Bind the root, then await init() on the binding:`,
        `  const example = require('./server/services/${service}').default;`,
        `  await example.init();`,
      ]);
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

// A stale origin/main would let verify pass against an old policy, so stop instead.
export function fetchMain(repository: string, run: RunCommand) {
  const result = run('git', ['fetch', '-q', 'origin', 'main'], { cwd: repository });
  if (result.status !== 0) {
    throw new Error(`Could not fetch origin/main:\n${result.output.trim()}`);
  }
}

const usage = `Usage: pnpm gx services verify <service> [--base <ref>] [--static] [--json]

Checks a committed service change before it is reported or pushed. Fails on a dirty
tree or a branch that does not contain the base. "review" lines need a person or
the verify-service-change skill to confirm they are still true.

  --base <ref>  Commit the branch must contain (default: origin/main). origin/main is
                always fetched first, and audit revisions are checked against it
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
    fetchMain(repository, runCommand);
    const checks = verifyService({
      repository,
      service,
      base: values.base ?? 'origin/main',
      main: 'origin/main',
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
