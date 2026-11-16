import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Finds the files in each domain by reading the fixed folders. Nothing is
 * loaded here: every entry carries a `load()` that requires the file the first
 * time it is called.
 *
 * transition/ and test/ are never read. Nothing in them is found.
 */

/** What a found file is. One kind per fixed folder or fixed file name. */
export type DomainFileKind =
  | 'action'
  | 'domain'
  | 'event'
  | 'job'
  | 'listener'
  | 'permissions'
  | 'routes'
  | 'schema'
  | 'service'
  | 'settings';

export interface DomainFile {
  readonly domain: string;
  readonly kind: DomainFileKind;
  /** The file's name without its role and extension; for a service, its folder name. */
  readonly name: string;
  /** Path from the domains folder, without an extension, with forward slashes. */
  readonly id: string;
  /** Absolute path without an extension, so the running loader picks .ts or .js. */
  readonly module: string;
  /** Requires the file on first call and returns the same module afterwards. */
  load(): unknown;
}

export interface DomainManifest {
  readonly root: string;
  readonly domains: readonly string[];
  readonly files: readonly DomainFile[];
  /** Loads any module by absolute path, the way found files are loaded. */
  readonly load: (module: string) => unknown;
}

type Loader = (module: string) => unknown;

// A source file or its build output, never a declaration file or a test.
const source = /^(.+?)\.(?:ts|js)$/;
const ignored = /\.d\.ts$|\.test\.(?:ts|js)$/;

// One name per module: a build leaves x.js beside x.ts, and both are the same file.
function modulesIn(directory: string, pattern: RegExp) {
  if (!existsSync(directory)) {
    return [];
  }
  const names = new Set<string>();
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const stem =
      entry.isFile() && !ignored.test(entry.name) ? source.exec(entry.name)?.[1] : undefined;
    if (stem !== undefined && pattern.test(stem)) {
      names.add(stem);
    }
  }
  return [...names].sort();
}

const folders = [
  { folder: 'actions', kind: 'action', role: /^(.+)\.action$/ },
  { folder: 'events', kind: 'event', role: /^(.+)\.event$/ },
  { folder: 'listeners', kind: 'listener', role: /^(.+)\.listener$/ },
  { folder: 'jobs', kind: 'job', role: /^(.+)\.job$/ },
] as const;

const fixedFiles = [
  { file: 'boot', kind: 'domain' },
  { file: 'settings', kind: 'settings' },
  { file: 'permissions', kind: 'permissions' },
  { file: 'schema', kind: 'schema' },
  { file: 'http/routes', kind: 'routes' },
] as const;

/**
 * Reads `root` and returns what each domain folder in it contains.
 *
 * @param root - The folder holding one folder per domain.
 * @param load - How a file is loaded. Defaults to `require`, so the loader the
 * process runs under decides between TypeScript source and built JavaScript.
 */
export function discoverDomains(
  root: string,
  load: Loader = (module) => require(module),
): DomainManifest {
  const domains = existsSync(root)
    ? readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];
  const files: DomainFile[] = [];

  for (const domain of domains) {
    const directory = path.join(root, domain);
    const add = (kind: DomainFileKind, name: string, relative: string) => {
      const module = path.join(directory, relative);
      let loaded: { readonly value: unknown } | undefined;
      files.push({
        domain,
        kind,
        name,
        id: `${domain}/${relative}`,
        module,
        load() {
          loaded ??= { value: load(module) };
          return loaded.value;
        },
      });
    };

    for (const { file, kind } of fixedFiles) {
      const [stem] = modulesIn(
        path.join(directory, path.dirname(file)),
        new RegExp(`^${path.basename(file)}$`),
      );
      if (stem !== undefined) {
        add(kind, domain, file);
      }
    }
    for (const { folder, kind, role } of folders) {
      for (const stem of modulesIn(path.join(directory, folder), role)) {
        add(kind, role.exec(stem)![1]!, `${folder}/${stem}`);
      }
    }
    const services = path.join(directory, 'services');
    if (existsSync(services)) {
      for (const entry of readdirSync(services, { withFileTypes: true })) {
        if (entry.isDirectory() && modulesIn(path.join(services, entry.name), /^index$/).length) {
          add('service', entry.name, `services/${entry.name}/index`);
        }
      }
    }
  }

  files.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { root, domains, files, load };
}

/** One line per found file, in a stable order: what a listing command prints. */
export function describeManifest(manifest: DomainManifest): string[] {
  return manifest.files.map((file) => `${file.kind.padEnd(11)} ${file.id}`);
}

/** The default export of a found file, or the module itself when it has none. */
export function defaultExport(file: DomainFile): unknown {
  const module = file.load();
  return typeof module === 'object' && module !== null && 'default' in module
    ? (module as { default: unknown }).default
    : module;
}
