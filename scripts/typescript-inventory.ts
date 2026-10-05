import type {
  Category,
  Dependency,
  DependencyStatus,
  ResolvedDependency,
  SourceSignals,
  SourceFile,
  Counts,
  Inventory,
} from './lib/typescript-inventory-types.ts';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';
import ts from 'typescript';
import { renderInventory } from './lib/typescript-inventory-html.ts';

const sourcePattern = /\.[cm]?[jt]sx?$/;
const declarationPattern = /\.d\.[cm]?ts$/;
const typedPattern = /\.[cm]?tsx?$/;
const excludedPattern =
  /(^|\/)(node_modules|vendor|dist|build|coverage|_template|fixtures?|__fixtures__|__snapshots__)(\/|$)|^koenig\/kg-simplemde\/debug\/|\.min\.js$/;

export function category(file: string): Category {
  if (/(^|\/)(tests?|__tests__|e2e)(\/|$)|\.(test|spec|acceptance)\.[^.]+$/.test(file)) {
    return 'tests';
  }
  if (/(^|\/)(scripts|configs?|\.github)(\/|$)|(^|\/)[^/]*config[^/]*\.[^.]+$/.test(file)) {
    return 'tooling';
  }
  if (
    file.startsWith('apps/') ||
    /^koenig\/(koenig-lexical|kg-simplemde|kg-unsplash-selector)\//.test(file) ||
    file.startsWith('ghost/core/core/frontend/public/')
  ) {
    return 'frontend';
  }
  return 'backend';
}

export function parseSource(file: string, source: string) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const imports = new Map<string, Dependency>();
  let dynamicImports = 0;
  let functions = 0;
  let commonjs = false;
  function add(argument: ts.Expression | undefined, mode: Dependency['mode']) {
    if (argument && ts.isStringLiteralLike(argument)) {
      imports.set(`${mode}:${argument.text}`, { specifier: argument.text, mode });
    } else {
      dynamicImports += 1;
    }
  }
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) {
        add(node.moduleSpecifier, 'import');
      }
    }
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
        commonjs = true;
        add(node.arguments[0], 'require');
      } else if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        add(node.arguments[0], 'import');
      }
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'exports' ||
        (node.expression.text === 'module' && node.name.text === 'exports'))
    ) {
      commonjs = true;
    }
    if (ts.isFunctionLike(node) && 'body' in node && node.body) {
      functions += 1;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return {
    imports: [...imports.values()],
    dynamicImports,
    functions,
    commonjs,
    parseErrors: (ast as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] })
      .parseDiagnostics.length,
    lines: source ? source.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length : 0,
  };
}

function createResolver(root: string, tracked: Set<string>, warnings: Set<string>) {
  const configs = new Map<
    string,
    { options: ts.CompilerOptions; config: string | null; cache: ts.ModuleResolutionCache }
  >();
  const directories = new Map<
    string,
    { options: ts.CompilerOptions; config: string | null; cache: ts.ModuleResolutionCache }
  >();
  function configuration(file: string) {
    const dir = path.dirname(file);
    if (directories.has(dir)) {
      return directories.get(dir)!;
    }
    let current = dir;
    let config;
    while (current.startsWith(root)) {
      const candidate = path.join(current, 'tsconfig.json');
      if (tracked.has(candidate)) {
        config = candidate;
        break;
      }
      if (current === root) {
        break;
      }
      current = path.dirname(current);
    }
    const key = config || 'default';
    if (!configs.has(key)) {
      let options: ts.CompilerOptions = {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        allowJs: true,
        resolveJsonModule: true,
      };
      if (config) {
        const parsed = ts.readConfigFile(config, ts.sys.readFile);
        if (parsed.error) {
          warnings.add(
            `Cannot read ${path.relative(root, config)}: ${ts.flattenDiagnosticMessageText(parsed.error.messageText, ' ')}`,
          );
        } else {
          const result = ts.parseJsonConfigFileContent(
            parsed.config,
            { ...ts.sys, readDirectory: () => [] },
            path.dirname(config),
          );
          for (const error of result.errors.filter(
            (item) => item.code !== 18003 && item.code !== 18002,
          )) {
            warnings.add(
              `${path.relative(root, config)}: ${ts.flattenDiagnosticMessageText(error.messageText, ' ')}`,
            );
          }
          options = { ...result.options, allowJs: true };
        }
      }
      configs.set(key, {
        options,
        config: config ? path.relative(root, config) : null,
        cache: ts.createModuleResolutionCache(root, (value) => value, options),
      });
    }
    const result = configs.get(key)!;
    directories.set(dir, result);
    return result;
  }
  return (file: string, dependency: Dependency): ResolvedDependency => {
    const { options, config, cache } = configuration(file);
    const { specifier, mode } = dependency;
    if (isBuiltin(specifier)) {
      const nodeTypes = ts.resolveTypeReferenceDirective(
        'node',
        file,
        options,
        ts.sys,
      ).resolvedTypeReferenceDirective;
      return {
        ...dependency,
        status: nodeTypes ? 'typed-builtin' : 'builtin-types-unavailable',
        config,
      };
    }
    const resolution = ts.resolveModuleName(
      specifier,
      file,
      options,
      ts.sys,
      cache,
      undefined,
      mode === 'require' ? ts.ModuleKind.CommonJS : ts.ModuleKind.ESNext,
    ).resolvedModule;
    if (!resolution) {
      return { ...dependency, status: 'unresolved', config };
    }
    const target = path.resolve(resolution.resolvedFileName);
    const status = typedPattern.test(target)
      ? 'typed'
      : target.endsWith('.json')
        ? 'json'
        : 'javascript';
    return {
      ...dependency,
      status,
      target: path.relative(root, target).split(path.sep).join('/'),
      config,
    };
  };
}

export function summarize(files: Pick<SourceFile, 'language' | 'lines'>[]): Counts {
  const result = { javascript: 0, typescript: 0, javascriptLines: 0, typescriptLines: 0 };
  for (const file of files) {
    result[file.language] += 1;
    result[`${file.language}Lines`] += file.lines;
  }
  const total = result.javascript + result.typescript;
  const lines = result.javascriptLines + result.typescriptLines;
  return {
    ...result,
    typescriptPercent: total ? +((100 * result.typescript) / total).toFixed(1) : 0,
    typescriptLinePercent: lines ? +((100 * result.typescriptLines) / lines).toFixed(1) : 0,
  };
}

export function scoreFile(
  file: SourceSignals & { imports: Pick<ResolvedDependency, 'status'>[] },
): Pick<SourceFile, 'signals' | 'score' | 'difficulty'> {
  const count = (status: DependencyStatus[]) =>
    file.imports.filter((item) => status.includes(item.status)).length;
  const signals = {
    javascriptDependencies: count(['javascript']),
    uncertainDependencies: count(['unresolved', 'builtin-types-unavailable']),
    dynamicImports: file.dynamicImports,
    size: Math.ceil(file.lines / 100),
    functions: Math.ceil(file.functions / 5),
    commonjs: Number(file.commonjs),
    parseErrors: file.parseErrors,
  };
  const score =
    signals.javascriptDependencies * 3 +
    signals.uncertainDependencies * 5 +
    signals.dynamicImports * 5 +
    signals.size +
    signals.functions +
    signals.commonjs * 2 +
    signals.parseErrors * 10;
  return {
    signals,
    score,
    difficulty: score <= 5 ? 'easier' : score <= 15 ? 'moderate' : 'harder',
  };
}

export function inventory(root: string, { scope = '' } = {}): Inventory {
  root = path.resolve(root);
  const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
  })
    .toString()
    .split('\0')
    .filter(Boolean);
  const tracked = new Set(trackedFiles.map((file) => path.join(root, file)));
  const warnings = new Set<string>();
  const resolve = createResolver(root, tracked, warnings);
  const packages = new Map<string, string>();
  for (const file of trackedFiles.filter(
    (item) => item.endsWith('package.json') && !excludedPattern.test(item),
  )) {
    const manifest = JSON.parse(readFileSync(path.join(root, file), 'utf8'));
    packages.set(path.posix.dirname(file), manifest.name || path.posix.dirname(file));
  }
  function owner(file: string): string {
    let dir = path.posix.dirname(file);
    while (dir !== '.') {
      if (packages.has(dir)) {
        return packages.get(dir)!;
      }
      dir = path.posix.dirname(dir);
    }
    return packages.get('.') || '(root)';
  }
  const excluded = [];
  const declarations = [];
  const files: SourceFile[] = [];
  for (const file of trackedFiles.filter((item) => sourcePattern.test(item))) {
    if (excludedPattern.test(file)) {
      excluded.push(file);
      continue;
    }
    if (declarationPattern.test(file)) {
      declarations.push(file);
      continue;
    }
    const absolute = path.join(root, file);
    const parsed = parseSource(file, readFileSync(absolute, 'utf8'));
    const record: Omit<SourceFile, 'signals' | 'score' | 'difficulty'> = {
      ...parsed,
      path: file,
      package: owner(file),
      category: category(file),
      language: typedPattern.test(file) ? 'typescript' : 'javascript',
      imports: parsed.imports.map((dependency) => resolve(absolute, dependency)),
      dependents: [],
    };
    files.push({ ...record, ...scoreFile(record) });
  }
  const byPath = new Map(files.map((file) => [file.path, file]));
  for (const file of files) {
    for (const target of new Set(file.imports.map((item) => item.target))) {
      if (target) {
        byPath.get(target)?.dependents.push(file.path);
      }
    }
  }
  const selected = files.filter(
    (file) => !scope || file.path === scope || file.path.startsWith(`${scope}/`),
  );
  if (scope && !selected.length) {
    throw new Error(`No tracked source files match scope: ${scope}`);
  }
  const groups: Inventory['groups'] = { package: {}, category: {} };
  for (const field of ['package', 'category'] as const) {
    groups[field] = Object.fromEntries(
      [...new Set(selected.map((file) => file[field]))]
        .sort()
        .map((key) => [key, summarize(selected.filter((file) => file[field] === key))]),
    );
  }
  return {
    schemaVersion: 2,
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(),
    scope,
    summary: summarize(selected),
    groups,
    declarations: declarations.length,
    excluded,
    warnings: [...warnings].sort(),
    files: selected.sort((a, b) => a.score - b.score || a.path.localeCompare(b.path)),
  };
}

if (import.meta.main) {
  try {
    const { values } = parseArgs({
      options: {
        scope: { type: 'string', default: '' },
        output: { type: 'string' },
        help: { type: 'boolean' },
      },
    });
    if (values.help) {
      console.log(
        'Usage: pnpm inventory:typescript [--scope ghost/core] [--output /tmp/ghost-typescript]\nWrites .json and .html reports when --output is supplied. Counts tracked working-tree files, excluding fixtures, vendored code and build output; submodules are not included.',
      );
    } else {
      const root = path.resolve(import.meta.dirname, '..');
      const report = inventory(root, { scope: values.scope.replace(/\/$/, '') });
      console.table(report.groups.package);
      console.log(
        `${report.summary.javascript} JavaScript files remain (${report.summary.javascriptLines} physical lines). ${report.summary.typescriptPercent}% TypeScript by files, ${report.summary.typescriptLinePercent}% by lines.`,
      );
      console.log(
        `${report.excluded.length} excluded files; ${report.declarations} declaration files counted separately. Difficulty is a heuristic, not a type-safety or effort measurement.`,
      );
      for (const warning of report.warnings) {
        console.error(warning);
      }
      if (values.output) {
        const prefix = path.resolve(values.output);
        mkdirSync(path.dirname(prefix), { recursive: true });
        writeFileSync(`${prefix}.json`, `${JSON.stringify(report, null, 2)}\n`);
        writeFileSync(`${prefix}.html`, renderInventory(report));
        console.log(`Reports: ${prefix}.html and ${prefix}.json`);
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
