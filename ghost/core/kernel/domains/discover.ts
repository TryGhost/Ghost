import path from 'node:path';

/**
 * Works out what each domain contains from a listing of its fixed folders.
 * Nothing is read or loaded here: the caller says how a folder is listed and
 * how a file is loaded, and every entry carries a `load()` that loads the file
 * the first time it is called. The framework's reader for a real folder is
 * `readDomains` in ../../foundation/domains.ts.
 *
 * A layer folder (actions/, events/, listeners/, jobs/) may hold capability
 * subfolders one level deep: `jobs/gifts/send-reminders.job.ts` is found and
 * named `gifts/send-reminders`. Anything deeper is not.
 *
 * transition/ and test/ are never listed. Nothing in them is found.
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

/** One entry of a folder: a file or a folder, by name. */
export interface FolderEntry {
  readonly name: string;
  readonly kind: 'file' | 'folder';
}

export interface DomainFolders {
  /** The entries of a folder, or undefined when it does not exist. */
  readonly list: (directory: string) => readonly FolderEntry[] | undefined;
  /** How a file is loaded, given its absolute path without an extension. */
  readonly load: Loader;
}

// A source file or its build output, never a declaration file or a test.
const source = /^(.+?)\.(?:ts|js)$/;
const ignored = /\.d\.ts$|\.test\.(?:ts|js)$/;

// One name per module: a build leaves x.js beside x.ts, and both are the same file.
function modulesIn(entries: readonly FolderEntry[] | undefined, pattern: RegExp) {
  const names = new Set<string>();
  for (const entry of entries ?? []) {
    const stem =
      entry.kind === 'file' && !ignored.test(entry.name) ? source.exec(entry.name)?.[1] : undefined;
    if (stem !== undefined && pattern.test(stem)) {
      names.add(stem);
    }
  }
  return [...names].sort();
}

const foldersIn = (entries: readonly FolderEntry[] | undefined) =>
  (entries ?? [])
    .filter((entry) => entry.kind === 'folder')
    .map((entry) => entry.name)
    .sort();

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
 * Returns what each domain folder in `root` contains.
 *
 * @param root - The folder holding one folder per domain.
 * @param folders - How a folder is listed and how a file is loaded.
 */
export function discoverDomains(root: string, { list, load }: DomainFolders): DomainManifest {
  const domains = foldersIn(list(root));
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
        list(path.join(directory, path.dirname(file))),
        new RegExp(`^${path.basename(file)}$`),
      );
      if (stem !== undefined) {
        add(kind, domain, file);
      }
    }
    for (const { folder, kind, role } of folders) {
      const entries = list(path.join(directory, folder));
      for (const stem of modulesIn(entries, role)) {
        add(kind, role.exec(stem)![1]!, `${folder}/${stem}`);
      }
      // Capability subfolders, one level deep and no deeper.
      for (const capability of foldersIn(entries)) {
        for (const stem of modulesIn(list(path.join(directory, folder, capability)), role)) {
          add(kind, `${capability}/${role.exec(stem)![1]!}`, `${folder}/${capability}/${stem}`);
        }
      }
    }
    for (const service of foldersIn(list(path.join(directory, 'services')))) {
      if (modulesIn(list(path.join(directory, 'services', service)), /^index$/).length) {
        add('service', service, `services/${service}/index`);
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
