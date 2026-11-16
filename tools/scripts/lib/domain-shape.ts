import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Checks that read a domain's folders and file names, not its imports. The
 * import rules are in .dependency-cruiser.cjs.
 */

export interface ShapeProblem {
  readonly rule: 'domain-root-shape' | 'domain-file-naming';
  /** Path from the domains folder, with forward slashes. */
  readonly file: string;
  readonly message: string;
}

/** The roles a file name may carry, by the layer folder the file is in. */
export const rolesByFolder: Readonly<Record<string, readonly string[]>> = {
  actions: ['action'],
  data: ['data'],
  events: ['event'],
  http: ['controller', 'endpoint', 'serializer', 'validator'],
  services: ['service', 'policy'],
  repositories: ['repository'],
  entities: ['entity', 'value'],
  listeners: ['listener'],
  jobs: ['job'],
  emails: ['renderer', 'template'],
};
// Files with a fixed name, by folder. `*` is any service folder.
const fixedNames: Readonly<Record<string, readonly string[]>> = {
  http: ['routes.ts'],
  services: ['index.ts'],
};
const rootFiles = ['CONTEXT.md', 'boot.ts', 'settings.ts', 'permissions.ts', 'schema.ts'];
const rootFolders = [...Object.keys(rolesByFolder), 'transition', 'test'];
const transitionFolders = ['services', 'models', 'events'];
const testFolders = ['unit', 'integration', 'e2e'];
// What may sit beside the domain folders.
const besideDomains = ['README.md', 'manifest.txt'];

const name = '[a-z0-9]+(?:-[a-z0-9]+)*';

// A build leaves x.js beside x.ts. That output is not a file of its own.
const isBuildOutput = (directory: string, file: string) =>
  /\.js$/.test(file) && existsSync(path.join(directory, file.replace(/\.js$/, '.ts')));

function entries(directory: string) {
  return existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true })
        .filter((entry) => !entry.isFile() || !isBuildOutput(directory, entry.name))
        .sort((a, b) => (a.name < b.name ? -1 : 1))
    : [];
}

/** Every problem with the shape and file names of the domains under `domainsRoot`. */
export function checkDomainShape(domainsRoot: string): ShapeProblem[] {
  const problems: ShapeProblem[] = [];
  const report = (rule: ShapeProblem['rule'], file: string, message: string) =>
    problems.push({ rule, file, message });

  for (const entry of entries(domainsRoot)) {
    if (!entry.isDirectory()) {
      if (!besideDomains.includes(entry.name)) {
        report('domain-root-shape', entry.name, 'Only domain folders belong beside the domains.');
      }
      continue;
    }
    const domain = entry.name;
    const directory = path.join(domainsRoot, domain);
    if (!new RegExp(`^${name}$`).test(domain)) {
      report('domain-root-shape', domain, 'A domain folder has a lower-case name.');
    }
    if (!existsSync(path.join(directory, 'CONTEXT.md'))) {
      report(
        'domain-root-shape',
        `${domain}/CONTEXT.md`,
        'Every domain has a CONTEXT.md saying what it owns and the words it uses.',
      );
    }

    for (const item of entries(directory)) {
      const file = `${domain}/${item.name}`;
      if (item.isDirectory() ? !rootFolders.includes(item.name) : !rootFiles.includes(item.name)) {
        report(
          'domain-root-shape',
          file,
          `Not one of the files or folders a domain has: ${[...rootFiles, ...rootFolders.map((folder) => `${folder}/`)].join(', ')}.`,
        );
      }
    }
    for (const [folder, allowed, kind] of [
      ['transition', transitionFolders, 'transition/ holds'],
      ['test', testFolders, 'test/ holds'],
    ] as const) {
      for (const item of entries(path.join(directory, folder))) {
        if (!item.isDirectory() || !allowed.includes(item.name)) {
          report(
            'domain-root-shape',
            `${domain}/${folder}/${item.name}`,
            `${kind} only ${allowed.map((allowedFolder) => `${allowedFolder}/`).join(', ')}.`,
          );
        }
      }
    }
    for (const item of entries(path.join(directory, 'services'))) {
      const file = `${domain}/services/${item.name}`;
      if (!item.isDirectory()) {
        report('domain-root-shape', file, 'services/ holds one folder per service root.');
      } else if (!existsSync(path.join(directory, 'services', item.name, 'index.ts'))) {
        report('domain-root-shape', `${file}/index.ts`, 'A service folder has an index.ts root.');
      }
    }

    // Names: everything outside transition/ and test/ carries a role.
    for (const folder of Object.keys(rolesByFolder)) {
      const roles = rolesByFolder[folder]!;
      const fixed = fixedNames[folder] ?? [];
      const walk = (relative: string, depth: number) => {
        for (const item of entries(path.join(directory, relative))) {
          const file = `${domain}/${relative}/${item.name}`;
          if (item.isDirectory()) {
            if (!new RegExp(`^${name}$`).test(item.name)) {
              report(
                'domain-file-naming',
                file,
                'Folder names are lower-case words joined by hyphens.',
              );
            }
            walk(`${relative}/${item.name}`, depth + 1);
            continue;
          }
          // A service root's index.ts sits one folder down; routes.ts sits in http/ itself.
          const fixedHere = folder === 'services' ? depth === 1 : depth === 0;
          if (fixedHere && fixed.includes(item.name)) {
            continue;
          }
          if (/\.md$/.test(item.name)) {
            continue;
          }
          const pattern = new RegExp(
            folder === 'emails'
              ? `^${name}\\.(?:${roles.join('|')})\\.(?:ts|hbs|html|txt)$`
              : `^${name}\\.(?:${roles.join('|')})\\.ts$`,
          );
          if (!pattern.test(item.name)) {
            report(
              'domain-file-naming',
              file,
              `A file in ${folder}/ is named <name>.<role>.ts in lower case, where the role is ${roles.join(' or ')}${fixed.length ? `, or is ${fixed.join(' or ')}` : ''}.`,
            );
          }
        }
      };
      walk(folder, 0);
    }
  }
  return problems;
}

export interface TransitionCount {
  readonly domain: string;
  readonly files: number;
  readonly byFolder: Readonly<Record<string, number>>;
}

/** How many source files each domain still has under transition/. */
export function countTransitionFiles(domainsRoot: string): TransitionCount[] {
  const count = (directory: string): number =>
    entries(directory).reduce(
      (total, entry) =>
        total +
        (entry.isDirectory()
          ? count(path.join(directory, entry.name))
          : /\.(?:[cm]?[jt]s|hbs)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)
            ? 1
            : 0),
      0,
    );
  return entries(domainsRoot)
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const transition = path.join(domainsRoot, entry.name, 'transition');
      const byFolder = Object.fromEntries(
        entries(transition)
          .filter((folder) => folder.isDirectory())
          .map((folder) => [folder.name, count(path.join(transition, folder.name))]),
      );
      return {
        domain: entry.name,
        files: Object.values(byFolder).reduce((total, files) => total + files, 0),
        byFolder,
      };
    });
}

export interface CrossDomainRelation {
  readonly kind: 'bookshelf-relation' | 'foreign-key' | 'with-related';
  readonly file: string;
  readonly from: string;
  readonly to: string;
  readonly detail: string;
}

const relationCall =
  /\bthis\s*\.\s*(belongsTo|belongsToMany|hasMany|hasOne|morphMany|morphOne)\(\s*['"]([A-Za-z0-9_]+)['"]/g;
const registeredModel = /\bghostBookshelf\.model\(\s*['"]([A-Za-z0-9_]+)['"]/g;
const tableName = /\btableName:\s*['"]([a-z0-9_]+)['"]/g;
const foreignKey = /\breferences:\s*['"]([a-z0-9_]+)\.[a-z0-9_]+['"]/g;
const withRelated = /\bwithRelated\b\s*:\s*\[([^\]]*)\]/g;

/**
 * An attempt at finding data relations that cross a domain boundary. It reads
 * source text, so it is a report to review, not a check:
 *
 * - a Bookshelf relation (`this.hasMany('Model')` and the like) between a model
 *   in a domain's transition/models and a model owned elsewhere;
 * - a foreign key in a domain's schema.ts to a table the domain does not own;
 * - `withRelated: [...]` in a domain's code, which loads relations by name.
 *
 * A model or table outside every domain is reported as owned by `core`.
 */
export function crossDomainRelations(
  repository: string,
  domainsRoot: string,
): CrossDomainRelation[] {
  const relative = (file: string) => path.relative(repository, file).split(path.sep).join('/');
  const read = (file: string) => readFileSync(file, 'utf8');
  const modelOwner = new Map<string, string>();
  const tableOwner = new Map<string, string>();
  const models: { file: string; owner: string; source: string; names: string[] }[] = [];

  const addModels = (directory: string, owner: string) => {
    for (const entry of entries(directory)) {
      if (!entry.isFile() || !/\.(?:js|ts)$/.test(entry.name)) {
        continue;
      }
      const file = path.join(directory, entry.name);
      const source = read(file);
      const names = [...source.matchAll(registeredModel)].map((match) => match[1]!);
      for (const model of names) {
        modelOwner.set(model, owner);
      }
      for (const match of source.matchAll(tableName)) {
        tableOwner.set(match[1]!, owner);
      }
      models.push({ file, owner, source, names });
    }
  };
  addModels(path.join(repository, 'ghost/core/server/models'), 'core');
  const domains = entries(domainsRoot).filter((entry) => entry.isDirectory());
  for (const domain of domains) {
    addModels(path.join(domainsRoot, domain.name, 'transition/models'), domain.name);
  }

  const found: CrossDomainRelation[] = [];
  for (const { file, owner, source, names } of models) {
    for (const match of source.matchAll(relationCall)) {
      const target = modelOwner.get(match[2]!) ?? 'core';
      if (target !== owner && (owner !== 'core' || target !== 'core')) {
        found.push({
          kind: 'bookshelf-relation',
          file: relative(file),
          from: owner,
          to: target,
          detail: `${names[0] ?? path.basename(file)} ${match[1]} ${match[2]}`,
        });
      }
    }
  }

  const sourceFilesIn = (directory: string, files: string[] = []) => {
    for (const entry of entries(directory)) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'test') {
          sourceFilesIn(file, files);
        }
      } else if (/\.(?:js|ts)$/.test(entry.name)) {
        files.push(file);
      }
    }
    return files;
  };
  for (const domain of domains) {
    const directory = path.join(domainsRoot, domain.name);
    const schema = path.join(directory, 'schema.ts');
    if (existsSync(schema)) {
      const source = read(schema);
      // The tables a schema fragment declares are the domain's own.
      const own = new Set(
        [...source.matchAll(/^\s{4}([a-z0-9_]+):\s*\{/gm)].map((match) => match[1]!),
      );
      for (const match of source.matchAll(foreignKey)) {
        if (!own.has(match[1]!)) {
          found.push({
            kind: 'foreign-key',
            file: relative(schema),
            from: domain.name,
            to: tableOwner.get(match[1]!) ?? 'core',
            detail: `references ${match[0].replace(/^references:\s*/, '')}`,
          });
        }
      }
    }
    for (const file of sourceFilesIn(directory)) {
      for (const match of read(file).matchAll(withRelated)) {
        const relations = [...match[1]!.matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]!);
        if (relations.length) {
          found.push({
            kind: 'with-related',
            file: relative(file),
            from: domain.name,
            to: 'unknown',
            detail: `withRelated ${relations.join(', ')}`,
          });
        }
      }
    }
  }
  return found;
}
