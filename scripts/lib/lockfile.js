import { createHash } from 'node:crypto';
import { $ as $$ } from 'execa';
import { loadAll } from 'js-yaml';

import { ROOT_DIR } from './constants.js';
import { getFileFromCommit } from './git.js';

const $ = $$({ cwd: ROOT_DIR });
const LOCKFILE = 'pnpm-lock.yaml';

const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'];

/**
 * Parses pnpm-lock.yaml. pnpm 12 prepends a document for its own
 * packageManager dependencies; the workspace lockfile is the last one.
 *
 * @param {string} text
 * @returns {{importers?: object, packages?: object, snapshots?: object}}
 */
export function parseLockfile(text) {
  return loadAll(text).at(-1) ?? {};
}

// A dependency's lockfile value is usually a version (with any peer suffix),
// but an npm alias stores the target's full key, e.g. `@typescript/typescript6@6.0.2`.
// Versions start with a digit and protocols (file:, https:) contain a colon.
function snapshotKey(name, version) {
  const isAlias = /^[@a-z]/i.test(version) && !version.includes(':');
  return isAlias ? version : `${name}@${version}`;
}

// packages: entries are keyed without the peer/patch suffix snapshots carry.
function packageKey(key) {
  const suffix = key.indexOf('(');
  return suffix === -1 ? key : key.slice(0, suffix);
}

/**
 * Hashes everything an importer resolves to: every snapshot it reaches
 * transitively, including which version each dependency links to, and those
 * packages' resolutions. Workspace links are left to nx's project graph.
 */
function importerSignature(lockfile, importer) {
  const { snapshots = {}, packages = {} } = lockfile;
  const seen = new Set();
  const queue = [];

  const visit = (deps = {}) => {
    for (const [name, value] of Object.entries(deps)) {
      const version = typeof value === 'string' ? value : value.version;
      if (version.startsWith('link:')) {
        continue;
      }
      const key = snapshotKey(name, version);
      if (!seen.has(key)) {
        seen.add(key);
        queue.push(key);
      }
    }
  };

  for (const section of DEPENDENCY_SECTIONS) {
    visit(importer[section]);
  }
  while (queue.length) {
    const snapshot = snapshots[queue.pop()] ?? {};
    visit(snapshot.dependencies);
    visit(snapshot.optionalDependencies);
  }

  const hash = createHash('sha256');
  // The importer's own bindings: a direct dependency can switch versions while
  // both stay reachable through its other dependencies.
  for (const section of DEPENDENCY_SECTIONS) {
    for (const [name, { version }] of Object.entries(importer[section] ?? {}).sort()) {
      if (!version.startsWith('link:')) {
        hash.update(JSON.stringify([section, name, version]));
      }
    }
  }
  for (const key of [...seen].sort()) {
    hash.update(JSON.stringify([key, snapshots[key], packages[packageKey(key)]]));
  }
  return hash.digest('hex');
}

/**
 * Importers whose resolved dependency tree differs between two lockfiles,
 * including link-only changes (a dependency switching between versions that
 * both stay in the lockfile), which nx's lockfile diff can't see.
 *
 * @param {object} baseLockfile - parsed base lockfile
 * @param {object} headLockfile - parsed head lockfile
 * @returns {string[]} importer paths, '.' for the workspace root
 */
export function changedImporters(baseLockfile, headLockfile) {
  const baseImporters = baseLockfile.importers ?? {};
  const headImporters = headLockfile.importers ?? {};

  return Object.keys(headImporters)
    .filter(
      (path) =>
        !baseImporters[path] ||
        importerSignature(baseLockfile, baseImporters[path]) !==
          importerSignature(headLockfile, headImporters[path]),
    )
    .sort();
}

/**
 * The package.json of every workspace project whose resolved dependency tree
 * changed between two commits, for `nx show projects --affected --files`.
 * Diffs from the merge base, the same window nx affected uses.
 *
 * @param {string} base
 * @param {string} head
 * @returns {Promise<string[]>}
 */
export async function lockfileChangedFiles(base, head) {
  const { stdout: mergeBase } = await $`git merge-base ${base} ${head}`;
  const { stdout: changed } = await $`git diff --name-only ${mergeBase} ${head} -- ${LOCKFILE}`;
  if (!changed) {
    return [];
  }

  const [baseText, headText] = await Promise.all([
    getFileFromCommit(mergeBase, LOCKFILE),
    getFileFromCommit(head, LOCKFILE),
  ]);

  return changedImporters(parseLockfile(baseText), parseLockfile(headText)).map((path) =>
    path === '.' ? 'package.json' : `${path}/package.json`,
  );
}
