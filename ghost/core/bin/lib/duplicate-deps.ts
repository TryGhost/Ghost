// Finds packages that ended up loaded twice in one process: once from a custom
// adapter's own `node_modules` and once from Ghost's.
//
// Custom adapters are installed as self-contained directories with their own
// dependency tree (Ghost Pro deploys them to `/home/ghost/adapters/<type>/<Name>`
// and points `paths__installedAdaptersPath` at that directory). Anything the
// adapter does not install itself resolves by walking up to Ghost's own
// `node_modules`, so a package the adapter *does* install is loaded a second
// time, from a second file, as a second module instance. That:
//
// - breaks `instanceof`, because the adapter's base class is a different
//   function object than the one Ghost compares against (both
//   `adapter-manager.ts` and `bin/validate-adapters.ts` carry a name-based
//   fallback for exactly this), and
// - splits module-level state. `@tryghost/logging` survives it by caching its
//   logger on `globalThis` under `Symbol.for('@tryghost/logging@<major>')`;
//   `@tryghost/metrics` has no such guard and would build a second instance.
//
// @NOTE: it takes two sources to see everything loaded, and `collectLoadedFiles`
// unions them because neither contains the other:
//
// - `require.cache` holds no ESM file. Adapters may be ESM (`"type": "module"`),
//   and an ESM file is absent from the cache whether it is the adapter's own
//   entry point or something it goes on to `import` - the ESM loader keeps its
//   own registry, with no public equivalent to read. (A CommonJS dependency
//   `import`ed from ESM does still go through the cache, so the gap is the ESM
//   files specifically.)
// - The inspector reports every script V8 parsed, ESM included, but a module
//   that is not a script is not one: `.json` and native `.node` addons never
//   produce a `scriptParsed` event, and only `require.cache` lists them. A
//   duplicated native addon is worth reporting precisely because it is two
//   copies of a compiled binary.
//
// The CJS cache doubles as the fallback when the inspector is unavailable.
//
// @NOTE: in a monorepo checkout Ghost's own copy of a `workspace:*` dependency
// resolves through a symlink to `packages/<name>`, outside any `node_modules`,
// and `require.cache` only ever reports that resolved path - so Ghost has no
// copy to compare against and nothing is reported. Every adapter base class is
// such a dependency, which makes a local run of `--check-duplicate-deps` a poor
// rehearsal: it is the installed tree built into the image, where those are
// ordinary `node_modules` entries, that this is meant to check.

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
  /** Absolute path of the package directory the copy was loaded from. */
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
  /**
   * The subset that must not be duplicated - a second copy of these is a
   * correctness problem rather than a size one, so the caller fails on them.
   */
  blocking: DuplicateDependency[];
}

export interface DuplicateDependencyOptions {
  /** Loaded file paths, i.e. `collectLoadedFiles(Object.keys(require.cache))`. */
  cachedFiles: Iterable<string>;
  /** Directories custom adapters are installed under, i.e. `adapterPaths`. */
  adapterRoots: string[];
  /** The `node_modules` directories Ghost itself resolves from, i.e. `module.paths`. */
  ghostNodeModulesRoots: string[];
  /** Package names a second copy of is a failure, not a note. */
  mustBeSingleCopy: readonly string[];
}

const NODE_MODULES = 'node_modules';

/**
 * The files V8 has parsed in this process, whatever their module format.
 *
 * Enabling the inspector's `Debugger` domain replays a `scriptParsed` event for
 * every script already parsed, so this can run after the adapters have loaded -
 * the same after-the-fact question `require.cache` answers, minus its blind spot
 * for ESM. The events are delivered synchronously while the domain is enabling,
 * so there is nothing to await.
 *
 * Returns nothing when the inspector is unavailable, e.g. a Node built
 * `--without-inspector`, leaving the caller with its CommonJS cache alone.
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
    // Anything with no file behind it - `node:` internals, `eval`, `data:`
    // URLs - can't belong to a package, so it is of no interest here.
    if (!params.url.startsWith('file://')) {
      return;
    }

    try {
      files.push(fileURLToPath(params.url));
    } catch {
      // A URL Node won't convert back to a path is not a package file either.
    }
  });

  session.post('Debugger.enable');
  session.post('Debugger.disable');
  session.disconnect();

  return files;
}

/**
 * Every file this process has loaded: the given CommonJS cache keys, which alone
 * carry the JSON and native modules, plus the scripts the inspector can see,
 * which alone carry the ESM graph the cache stops at.
 */
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

/**
 * Whether `filePath` sits inside `directory`. Both are expected to be realpaths
 * already - the caller resolves them once rather than per comparison.
 */
function isInside(filePath: string, directory: string): boolean {
  const relative = path.relative(directory, filePath);

  // Compare the first segment exactly rather than using startsWith('..'), so an
  // entry whose name merely begins with dots isn't mistaken for traversal.
  const [firstSegment] = relative.split(path.sep);

  return relative !== '' && firstSegment !== '..' && !path.isAbsolute(relative);
}

/**
 * The version a package declares, or `unknown` when it declares none and when
 * the manifest is unreadable - a missing version is worth reporting alongside
 * the paths rather than dropping the duplicate.
 */
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
 * the *last* `node_modules` segment of its path names.
 *
 * That holds whatever installer produced the tree - the flat
 * `node_modules/<name>` npm gives an adapter, and the
 * `.pnpm/<name>@<version>/node_modules/<name>` pnpm's isolated layout resolves
 * to - so nothing here has to understand a particular layout's naming. Returns
 * `null` for a file that isn't inside a package at all: Ghost's own source, or an
 * adapter's own `index.js`.
 */
export function parsePackageFromPath(filePath: string): PackageLocation | null {
  const segments = filePath.split(path.sep);
  const start = segments.lastIndexOf(NODE_MODULES) + 1;
  const first = segments[start];

  // A dot-prefixed entry is an installer's own bookkeeping directory sitting
  // next to the packages - pnpm's virtual store, `.bin`, a cache - and npm
  // forbids a package name from looking like one.
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
 * A file belongs to an adapter when it sits under one of the adapter search
 * paths, and to Ghost when it sits under one of the `node_modules` directories
 * Ghost resolves from. Adapters are checked first: `content/adapters` lives
 * inside the Ghost installation, so the two are not mutually exclusive.
 */
export function checkDuplicateDependencies({
  cachedFiles,
  adapterRoots,
  ghostNodeModulesRoots,
  mustBeSingleCopy,
}: DuplicateDependencyOptions): DuplicateDependencyReport {
  // Node reports realpaths in `require.cache`, and pnpm's layout means the
  // roots are reached through symlinks, so compare resolved paths - never
  // specifiers - on both sides.
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
      // Ghost's own tree can hold more than one copy of a name; any of them is
      // the other half of the comparison, so the first one seen will do.
      if (!ghostPackages.has(location.name)) {
        ghostPackages.set(location.name, location.path);
      }
      continue;
    }

    // Two adapters can each bundle their own copy of the same package, so keep
    // every distinct location rather than only the first.
    const packagePaths = adapterPackages.get(location.name) ?? new Set<string>();
    adapterPackages.set(location.name, packagePaths.add(location.path));
  }

  // Versions are only read once both sides are known, so the manifest reads
  // cost one per reported copy rather than one per cached file.
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

/**
 * Render a report for humans, in the same indented style as the adapter results.
 */
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
