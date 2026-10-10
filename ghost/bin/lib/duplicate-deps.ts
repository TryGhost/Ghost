// Finds packages loaded twice in one process: once from a custom adapter's own
// `node_modules` and once from Ghost's.
//
// An adapter is installed as a self-contained directory with its own dependency
// tree (Ghost Pro deploys them to `/home/ghost/adapters/<type>/<Name>`). Whatever
// it doesn't install itself resolves by walking up to Ghost's `node_modules`, so
// a package it *does* install becomes a second module instance - which breaks
// `instanceof` against a base class (hence the name-based fallbacks in
// `adapter-manager.ts` and `bin/validate-adapters.ts`) and splits module-level
// state, as `@tryghost/metrics` would with no `globalThis` guard to save it.
//
// @NOTE: `collectLoadedFiles` unions two sources because neither contains the
// other. `require.cache` holds no ESM file, neither an ESM adapter's entry point
// nor anything it `import`s - though a CommonJS dependency of one does still go
// through the cache, so the gap is ESM files specifically. The inspector reports
// every script V8 parsed, ESM included, but `.json` and native `.node` modules
// aren't scripts and only the cache lists them. The cache is also the fallback
// when the inspector is unavailable.
//
// @NOTE: this is for the installed tree built into an image, not a local
// checkout. Ghost's copy of a `workspace:*` dependency - every adapter base class
// among them - resolves through a symlink to `packages/<name>`, outside any
// `node_modules`, leaving an adapter's copy with nothing to be compared against.

import fs from 'node:fs';
import inspector from 'node:inspector';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Where a loaded file's package lives, before its manifest has been read. */
export interface PackageLocation {
  name: string;
  /** Absolute path of the package directory the copy was loaded from. */
  path: string;
}

/** One physical copy of a package, as loaded into the process. */
export interface PackageCopy {
  version: string;
  path: string;
}

/** A package loaded from both an adapter's tree and Ghost's own. */
export interface DuplicateDependency {
  name: string;
  adapter: PackageCopy;
  ghost: PackageCopy;
}

export interface DuplicateDependencyReport {
  /** Every duplicate found, in name order. Informational: a duplicate costs memory. */
  duplicates: DuplicateDependency[];
  /** The subset that is a correctness problem rather than a size one, so the caller fails. */
  blocking: DuplicateDependency[];
}

export interface DuplicateDependencyOptions {
  /** i.e. `collectLoadedFiles(Object.keys(require.cache))`. */
  cachedFiles: Iterable<string>;
  /** Directories custom adapters are installed under, i.e. `adapterPaths`. */
  adapterRoots: string[];
  /** Where Ghost's own dependencies resolve from, i.e. `module.paths`. */
  ghostNodeModulesRoots: string[];
  /** Package names a second copy of is a failure, not a note. */
  mustBeSingleCopy: readonly string[];
}

const NODE_MODULES = 'node_modules';

/**
 * The files V8 has parsed in this process, whatever their module format.
 *
 * Enabling the `Debugger` domain replays a `scriptParsed` event for every script
 * already parsed, synchronously, so this can run after the adapters have and
 * there is nothing to await. Empty when the inspector is unavailable, e.g. a Node
 * built `--without-inspector`.
 */
function parsedScriptFiles(): string[] {
  let session: inspector.Session;
  try {
    session = new inspector.Session();
    session.connect();
  } catch {
    return [];
  }

  const files: string[] = [];
  session.on('Debugger.scriptParsed', ({ params }) => {
    // Nothing with no file behind it - `node:` internals, `eval`, `data:` URLs -
    // can belong to a package.
    if (!params.url.startsWith('file://')) {
      return;
    }

    try {
      files.push(fileURLToPath(params.url));
    } catch {
      // Nor anything Node won't convert back to a path.
    }
  });

  session.post('Debugger.enable');
  session.post('Debugger.disable');
  session.disconnect();

  return files;
}

/** Every file this process has loaded, from both of the sources above. */
export function collectLoadedFiles(cjsCachedFiles: Iterable<string>): string[] {
  return [...new Set([...cjsCachedFiles, ...parsedScriptFiles()])];
}

function realpathOrNull(target: string): string | null {
  try {
    return fs.realpathSync(target);
  } catch {
    return null;
  }
}

/** Whether `filePath` sits inside `directory`. Both are expected to be realpaths. */
function isInside(filePath: string, directory: string): boolean {
  const relative = path.relative(directory, filePath);

  // Match the first segment exactly, so a name that merely begins with dots
  // isn't taken for traversal the way startsWith('..') would take it.
  const [firstSegment] = relative.split(path.sep);

  return relative !== '' && firstSegment !== '..' && !path.isAbsolute(relative);
}

/** The version a package declares, or `unknown` - better reported than dropped. */
function readVersion(packagePath: string): string {
  try {
    const { version } = JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8'));
    return typeof version === 'string' ? version : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Attribute a loaded file to the package that physically contains it: whatever
 * the *last* `node_modules` segment of its path names. That holds for any
 * installer's layout, npm's flat `node_modules/<name>` and pnpm's
 * `.pnpm/<name>@<version>/node_modules/<name>` alike. `null` when the file is in
 * no package: Ghost's own source, or an adapter's own `index.js`.
 */
export function parsePackageFromPath(filePath: string): PackageLocation | null {
  const segments = filePath.split(path.sep);
  const start = segments.lastIndexOf(NODE_MODULES) + 1;
  const first = segments[start];

  // A dot-prefixed entry is an installer's own directory - pnpm's store, `.bin`,
  // a cache - and npm forbids a package name from looking like one.
  if (start === 0 || !first || first.startsWith('.')) {
    return null;
  }

  // Scoped packages take two segments: `@tryghost/logging`.
  const end = start + (first.startsWith('@') ? 2 : 1);
  if (!segments[end - 1]) {
    return null;
  }

  return {
    name: segments.slice(start, end).join('/'),
    path: segments.slice(0, end).join(path.sep),
  };
}

/**
 * Find packages loaded from both an adapter's dependency tree and Ghost's own.
 *
 * Adapters are checked first: `content/adapters` lives inside the Ghost
 * installation, so the two sides are not mutually exclusive.
 */
export function checkDuplicateDependencies({
  cachedFiles,
  adapterRoots,
  ghostNodeModulesRoots,
  mustBeSingleCopy,
}: DuplicateDependencyOptions): DuplicateDependencyReport {
  // Compare resolved paths on both sides, never specifiers: `require.cache`
  // reports realpaths, and pnpm reaches these roots through symlinks.
  const realAdapterRoots = adapterRoots.map(realpathOrNull).filter((root) => root !== null);
  const realGhostRoots = ghostNodeModulesRoots.map(realpathOrNull).filter((root) => root !== null);

  const adapterPackages = new Map<string, Set<string>>();
  const ghostPackages = new Map<string, string>();

  for (const cachedFile of cachedFiles) {
    const realFile = realpathOrNull(cachedFile) ?? cachedFile;

    const inAdapter = realAdapterRoots.some((root) => isInside(realFile, root));
    if (!inAdapter && !realGhostRoots.some((root) => isInside(realFile, root))) {
      continue;
    }

    const location = parsePackageFromPath(realFile);
    if (!location) {
      continue;
    }

    if (!inAdapter) {
      // Ghost's tree can hold more than one copy of a name, and any of them is
      // the other half of the comparison, so the first one seen will do.
      if (!ghostPackages.has(location.name)) {
        ghostPackages.set(location.name, location.path);
      }
      continue;
    }

    // Two adapters can each bundle their own copy, so keep every location.
    const packagePaths = adapterPackages.get(location.name) ?? new Set<string>();
    adapterPackages.set(location.name, packagePaths.add(location.path));
  }

  // Reading versions only once both sides are known costs one manifest read per
  // reported copy, rather than one per cached file.
  const duplicates: DuplicateDependency[] = [];
  for (const [name, packagePaths] of [...adapterPackages].sort(([a], [b]) => a.localeCompare(b))) {
    const ghostPath = ghostPackages.get(name);
    if (!ghostPath) {
      continue;
    }

    const ghost = { version: readVersion(ghostPath), path: ghostPath };
    for (const packagePath of packagePaths) {
      duplicates.push({
        name,
        adapter: { version: readVersion(packagePath), path: packagePath },
        ghost,
      });
    }
  }

  const singleCopy = new Set(mustBeSingleCopy);

  return { duplicates, blocking: duplicates.filter(({ name }) => singleCopy.has(name)) };
}

/** Render a report in the same indented style as the adapter results. */
export function formatDuplicateReport({ duplicates, blocking }: DuplicateDependencyReport): string {
  if (!duplicates.length) {
    return '  ok    no duplicate dependencies\n';
  }

  return [
    `\n${duplicates.length} package(s) loaded from both an adapter and Ghost:\n`,
    ...duplicates.map(
      ({ name, adapter, ghost }) =>
        `- ${name}\n` +
        `    adapter ${adapter.version}  ${adapter.path}\n` +
        `    ghost   ${ghost.version}  ${ghost.path}\n`,
    ),
    '\nEach duplicate is loaded into memory twice. Have the adapter declare the\n' +
      'package as a peer dependency of Ghost, or match the version Ghost ships,\n' +
      'so the install can be deduplicated.\n\n',
    blocking.length
      ? `  FAIL  duplicate dependencies: ${blocking.map(({ name }) => name).join(', ')}\n` +
        '        A second copy of these breaks `instanceof` against the base class\n' +
        '        Ghost checks adapters with - they must resolve to a single copy.\n'
      : '  ok    duplicate dependencies (none of them must be a single copy)\n',
  ].join('');
}
