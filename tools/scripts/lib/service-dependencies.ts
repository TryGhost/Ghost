import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import ts from 'typescript';
import type {
  IForbiddenRuleType,
  IRequiredRuleType,
  IOptions,
  IResolveOptions,
} from 'dependency-cruiser';

export const SERVICES_ROOT = 'ghost/core/server/services';
const initializer = '^ghost/core/kernel/define-service\\.ts$';
const typeDependencies = ['type-only', 'type-import'] as const;

export interface ServiceEntry {
  kind: 'directory' | 'file';
  disposition: 'retain' | 'relocate' | 'review';
  migrated?: true;
}

export type ServiceInventory = Record<string, ServiceEntry>;

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Code libraries and contracts, not application instances. Keep each allowance
// exact and explain additions here; allowing a directory would hide new dependencies.
export const serviceDependencyAllowlist = [
  { package: '@tryghost/errors', reason: 'Error classes and error formatting.' },
  { package: '@tryghost/tpl', reason: 'Message interpolation.' },
  { package: 'zod', reason: 'Schema construction and validation.' },
  { builtin: 'crypto', reason: 'Cryptographic algorithms and key generation.' },
  { builtin: 'util', reason: 'Node utility functions, including promisify.' },
  { file: 'ghost/core/server/lib/db-types/date.ts', reason: 'Database date codec.' },
  {
    file: 'ghost/core/server/lib/public-jwk.ts',
    reason: 'Key conversion and thumbprints; includes shared memoization, not service lookup.',
  },
  {
    file: `${SERVICES_ROOT}/jobs-service/job.ts`,
    reason: 'Job base class and contracts; does not access the running jobs service.',
  },
] as const;

const allowedPaths = serviceDependencyAllowlist.map((entry) => {
  if ('file' in entry) {
    return `^${escape(entry.file)}$`;
  }
  if ('builtin' in entry) {
    return `^(node:)?${escape(entry.builtin)}$`;
  }
  // Installed packages resolve into node_modules (including pnpm's shared store).
  // Unresolved package names are checked separately, so a missing install fails closed.
  return `^(?:${escape(entry.package)})$|(?:^|/)node_modules/${escape(entry.package)}/`;
});

export function readServiceInventory(root: string): ServiceInventory {
  const data = yaml.load(
    readFileSync(path.join(root, SERVICES_ROOT, 'service-inventory.yaml'), 'utf8'),
  );
  if (
    !data ||
    typeof data !== 'object' ||
    !('services' in data) ||
    !data.services ||
    typeof data.services !== 'object' ||
    Array.isArray(data.services)
  ) {
    throw new Error('Invalid service inventory: expected a services mapping');
  }
  for (const [name, value] of Object.entries(data.services)) {
    const entry = value as Record<string, unknown> | null;
    if (
      !name ||
      name === '.' ||
      name === '..' ||
      name.includes('/') ||
      name.includes('\\') ||
      !entry ||
      typeof entry !== 'object' ||
      (entry.kind !== 'directory' && entry.kind !== 'file') ||
      (entry.disposition !== 'retain' &&
        entry.disposition !== 'relocate' &&
        entry.disposition !== 'review') ||
      (entry.migrated !== undefined && entry.migrated !== true)
    ) {
      throw new Error(`Invalid service inventory entry: ${name}`);
    }
  }
  return data.services as ServiceInventory;
}

export function serviceDependencyRules(
  inventory: ServiceInventory,
  scope: 'all' | 'migrated',
): IForbiddenRuleType[] {
  const rules: IForbiddenRuleType[] = [];
  for (const [name, entry] of Object.entries(inventory)) {
    if (scope === 'migrated' && !entry.migrated) {
      continue;
    }
    const base = `${SERVICES_ROOT}/${name}`;
    const root = `^${escape(base)}/index\\.${entry.migrated ? 'ts' : '(js|ts)'}$`;
    const from = {
      path: `^${escape(base)}${entry.kind === 'directory' ? '/' : '$'}`,
      pathNot: root,
    };
    rules.push(
      {
        name: `service-deps-${name}`,
        comment:
          'Wire application dependencies in the service root index.ts and inject them. Only same-service modules and the explicit library allowlist may be imported by implementations.',
        severity: 'error',
        from,
        to: {
          pathNot: [...allowedPaths, ...(entry.kind === 'directory' ? [`^${escape(base)}/`] : [])],
          dependencyTypesNot: [...typeDependencies],
        },
      },
      {
        name: `service-deps-own-root-${name}`,
        comment:
          'Service implementations must not retrieve dependencies from their own wiring root.',
        severity: 'error',
        from,
        to: {
          path: `^${escape(base)}/index\\.(js|ts)$`,
          dependencyTypesNot: [...typeDependencies],
        },
      },
      {
        name: `service-deps-unresolved-${name}`,
        comment: 'Resolve this runtime import so the service dependency boundary can be checked.',
        severity: 'error',
        from,
        to: { couldNotResolve: true, dependencyTypesNot: [...typeDependencies] },
      },
    );
  }
  return rules;
}

export function serviceMigrationRules(inventory: ServiceInventory): {
  forbidden: IForbiddenRuleType[];
  required: IRequiredRuleType[];
} {
  const roots = Object.entries(inventory)
    .filter(([, entry]) => entry.migrated)
    .map(([name]) => ({ name, path: `^${escape(`${SERVICES_ROOT}/${name}/index.ts`)}$` }));
  return {
    forbidden: [
      {
        name: 'service-initializer-needs-migration-marker',
        comment:
          'Use defineService only in a root index.ts marked migrated: true in service-inventory.yaml.',
        severity: 'error',
        from: {
          path: `^${SERVICES_ROOT}/`,
          pathNot: roots.length ? roots.map((root) => root.path) : '(?!)',
        },
        to: { path: initializer, dependencyTypesNot: [...typeDependencies] },
      },
    ],
    required: roots.map((root) => ({
      name: `migrated-service-needs-initializer-${root.name}`,
      comment: 'A migrated service root must import defineService directly from the kernel.',
      severity: 'error',
      module: { path: root.path },
      to: { path: initializer },
    })),
  };
}

const excludedServicePaths = '\\.d\\.[cm]?ts$';

// This is an authored-source audit. Core's adjacent tsc output must not change
// its targets, including explicit .js imports in TypeScript source.
export const serviceDependencyResolveOptions: Partial<IResolveOptions> = {
  extensions: [
    '.ts',
    '.tsx',
    '.mts',
    '.cts',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.json',
    '.node',
    '.d.ts',
    '.d.mts',
    '.d.cts',
  ],
  extensionAlias: {
    '.js': ['.ts', '.tsx', '.js'],
    '.jsx': ['.tsx', '.jsx'],
    '.mjs': ['.mts', '.mjs'],
    '.cjs': ['.cts', '.cjs'],
  },
};

export function serviceDependencySourceExclusions(root: string): string[] {
  const exclusions = [excludedServicePaths];
  const core = path.join(root, 'ghost/core');
  for (const entry of readdirSync(core, { recursive: true, withFileTypes: true })) {
    if (
      !entry.isFile() ||
      !/\.(?:[cm]?ts|tsx)$/.test(entry.name) ||
      /\.d\.[cm]?ts$/.test(entry.name)
    ) {
      continue;
    }
    const output = path.join(entry.parentPath, entry.name.replace(/\.([cm]?)tsx?$/, '.$1js'));
    if (existsSync(output)) {
      // Only a matching TypeScript source establishes an emitted companion;
      // authored JavaScript elsewhere remains part of the graph.
      exclusions.push(`^${escape(path.relative(root, output).split(path.sep).join('/'))}$`);
    }
  }
  return exclusions;
}

export const serviceDependencyOptions: IOptions = {
  doNotFollow: { path: `^(?!${SERVICES_ROOT}/)` },
  exclude: { path: excludedServicePaths },
  tsPreCompilationDeps: true,
};

export function getServiceDependencyOptions(root: string): IOptions {
  return {
    ...serviceDependencyOptions,
    exclude: { path: serviceDependencySourceExclusions(root) },
  };
}

export function findComputedServiceImports(
  root: string,
  inventory: ServiceInventory,
  scope: 'all' | 'migrated',
) {
  const findings: { source: string; line: number; expression: string }[] = [];
  const excluded = new RegExp(serviceDependencySourceExclusions(root).join('|'));
  function scan(source: string) {
    if (excluded.test(source) || !existsSync(path.join(root, source))) {
      return;
    }
    const entries = readdirSync(path.join(root, source), { withFileTypes: true });
    for (const entry of entries) {
      const file = `${source}/${entry.name}`;
      if (entry.isDirectory()) {
        scan(file);
      } else if (entry.isFile()) {
        inspect(file);
      }
    }
  }
  function inspect(source: string) {
    if (
      excluded.test(source) ||
      !/\.[cm]?[jt]sx?$/.test(source) ||
      !existsSync(path.join(root, source))
    ) {
      return;
    }
    const ast = ts.createSourceFile(
      source,
      readFileSync(path.join(root, source), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node: ts.Node) {
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      ) {
        const target = node.arguments[0];
        if (
          !target ||
          !(ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target))
        ) {
          findings.push({
            source,
            line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
            expression: node.getText(ast),
          });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  for (const [name, entry] of Object.entries(inventory)) {
    if (scope === 'migrated' && !entry.migrated) {
      continue;
    }
    const source = `${SERVICES_ROOT}/${name}`;
    if (entry.kind === 'directory') {
      scan(source);
    } else {
      inspect(source);
    }
  }
  return findings;
}

export function assertMigratedServiceSources(root: string, inventory: ServiceInventory) {
  for (const [name, entry] of Object.entries(inventory)) {
    if (
      entry.migrated &&
      (entry.kind !== 'directory' || !existsSync(path.join(root, SERVICES_ROOT, name, 'index.ts')))
    ) {
      throw new Error(`Migrated service ${name} must have a root index.ts`);
    }
  }
  const computed = findComputedServiceImports(root, inventory, 'migrated').filter(
    ({ source }) => !/^ghost\/core\/server\/services\/[^/]+\/index\.ts$/.test(source),
  );
  if (computed.length) {
    throw new Error(
      `Use literal dependency paths in migrated service implementations:\n${computed.map(({ source, line }) => `${source}:${line}`).join('\n')}`,
    );
  }
}
