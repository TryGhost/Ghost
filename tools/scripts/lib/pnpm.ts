import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { $ as $$ } from 'execa';
import yaml from 'js-yaml';

import { ROOT_DIR } from './constants.ts';
import { getChangedFiles } from './git.ts';
import { readJson } from './utils.ts';

const CHANGES_DIR = '.changeset';

/** The pnpm-workspace.yaml settings these scripts read. */
export interface WorkspaceManifest {
  versioning?: { ignore?: string[] };
}

type DependencyMap = Record<string, string>;

/** The parts of a package.json these scripts read; the rest passes through. */
export interface PackageManifest {
  name?: string;
  version?: string;
  private?: boolean;
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
  [key: string]: unknown;
}

export interface WorkspacePackage {
  name: string;
  /** The path to the package.json file, relative to the repo root. */
  pkgPath: string;
  manifest: PackageManifest & { name: string };
  /** The package directory, relative to the repo root. */
  dir: string;
}

/** Reads the pnpm-workspace.yaml settings these scripts need, via pnpm itself. */
export async function getWorkspace(
  rootDir = ROOT_DIR,
  env = process.env,
): Promise<WorkspaceManifest> {
  const { stdout } = await $$({
    cwd: rootDir,
    env,
    extendEnv: false,
  })`pnpm config get versioning --json`;
  const versioning = JSON.parse(stdout || 'null') as WorkspaceManifest['versioning'] | null;
  return versioning ? { versioning } : {};
}

/** Lists every workspace package except the root, as pnpm resolves them. */
export async function getWorkspacePackages(
  rootDir = ROOT_DIR,
  env = process.env,
): Promise<WorkspacePackage[]> {
  const { stdout } = await $$({
    cwd: rootDir,
    env,
    extendEnv: false,
  })`pnpm ls --recursive --depth -1 --json --ignore-pnpmfile`;
  // pnpm prints real paths, so a symlinked root (macOS /tmp) must be resolved.
  const root = await realpath(rootDir);
  const dirs = (JSON.parse(stdout || '[]') as { path: string }[])
    .map(({ path }) => relative(root, path))
    .filter((dir) => dir !== '');

  return Promise.all(
    dirs.map(async (dir) => {
      const pkgPath = join(dir, 'package.json');
      const manifest = await readJson<WorkspacePackage['manifest']>(resolve(rootDir, pkgPath));
      return { name: manifest.name, manifest, pkgPath, dir };
    }),
  );
}

/**
 * Lists all currently publishable package names in the workspace: packages
 * that are neither private nor listed in `versioning.ignore`.
 */
export async function getPublishablePackages(
  workspace: WorkspaceManifest,
  rootDir = ROOT_DIR,
  env = process.env,
): Promise<WorkspacePackage[]> {
  const ignoredPackages = new Set(workspace.versioning?.ignore ?? []);
  const pkgs = await getWorkspacePackages(rootDir, env);

  return pkgs.filter((pkg) => !pkg.manifest.private && !ignoredPackages.has(pkg.name));
}

/**
 * Gets all packages covered by a changeset since the given commit hash
 *
 * @param baseCommit - The commit hash to compare against.
 * @param headCommit - The commit hash to compare to, defaults to HEAD.
 * @param rootDir - The workspace root.
 * @param env - The environment to run git in.
 */
export async function getPackagesWithChangset(
  baseCommit: string,
  headCommit = 'HEAD',
  rootDir = ROOT_DIR,
  env = process.env,
): Promise<Set<string>> {
  const newFiles = await getChangedFiles(CHANGES_DIR, baseCommit, headCommit, {
    onlyNew: true,
    cwd: rootDir,
    env,
  });
  // Change intents are the top-level .md files other than a README.
  const intents = newFiles.filter(
    (file) =>
      dirname(file) === CHANGES_DIR &&
      file.endsWith('.md') &&
      basename(file).toLowerCase() !== 'readme.md',
  );

  const packages = await Promise.all(
    intents.map((file) => readIntentPackages(resolve(rootDir, file))),
  );
  return new Set(packages.flat());
}

/**
 * The package names a change intent's `"package": bump` frontmatter covers.
 * Bump values are left to `pnpm change check`.
 */
async function readIntentPackages(filePath: string): Promise<string[]> {
  const content = await readFile(filePath, 'utf8');
  const source = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(content)?.[1];
  if (source === undefined) {
    throw new Error(`Change intent file ${filePath} has no YAML frontmatter`);
  }
  const frontmatter: unknown = yaml.load(source) ?? {};
  if (typeof frontmatter !== 'object' || frontmatter === null || Array.isArray(frontmatter)) {
    throw new Error(`Change intent file ${filePath} frontmatter must map package names to bumps`);
  }
  return Object.keys(frontmatter);
}

// The files read to list projects, compare catalogs and collect change
// intents; every other path is left out of a head checkout.
const CHECKOUT_RE = /(^|\/)package\.json$|^pnpm-workspace\.yaml$|^\.changeset\//;

/**
 * Runs `fn` in a throwaway worktree whose working tree is `head` and whose HEAD
 * is `base`, so pnpm's base-vs-working-tree `[since]` diff becomes a plain
 * base-to-head tree diff. pnpm's `[<base>...<head>]` form can't do this: it
 * rejects a tree head, and fails whenever pnpm-workspace.yaml changed (it reads
 * the catalog from `<base>...<head>:pnpm-workspace.yaml`, as of pnpm 12.13).
 *
 * Only the files the check reads are checked out; the rest are marked skip-worktree,
 * so git diffs them from the index (head) instead of reporting them deleted.
 *
 * `fn` gets an env to run in the worktree with: a git hook (the pre-commit
 * check) sets GIT_INDEX_FILE and friends for the caller's repository, and
 * inheriting them would rewrite the caller's index instead of the worktree's.
 */
async function withHeadCheckout<T>(
  baseCommit: string,
  head: string,
  rootDir: string,
  fn: (dir: string, env: NodeJS.ProcessEnv) => Promise<T>,
): Promise<T> {
  const git = $$({ cwd: rootDir });
  const { stdout: localVars } = await git`git rev-parse --local-env-vars`;
  const repoVars = new Set(localVars.split('\n'));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !repoVars.has(name)),
  );
  const { stdout: tree } = await git`git rev-parse --verify ${`${head}^{tree}`}`;
  const dir = await mkdtemp(join(tmpdir(), 'change-check-'));

  try {
    await git`git worktree add --quiet --detach --no-checkout ${dir} ${baseCommit}`;

    const wt = $$({ cwd: dir, env, extendEnv: false });
    await wt`git read-tree ${tree}`;
    const { stdout: files } = await wt`git ls-files -z`;
    const skipped = files.split('\0').filter((file) => file && !CHECKOUT_RE.test(file));
    await wt({ input: skipped.join('\0') })`git update-index -z --skip-worktree --stdin`;
    await wt`git checkout --quiet -- .`;

    return await fn(dir, env);
  } finally {
    await git`git worktree remove --force ${dir}`.catch(async () => {
      await rm(dir, { recursive: true, force: true });
      await git`git worktree prune`;
    });
  }
}

/**
 * Lists the workspace projects pnpm's `[since]` filter selects: those with a
 * changed file in their directory, or a dependency on a changed catalog entry.
 * pnpm diffs a lone base against the working tree.
 */
async function listChangedProjects(
  baseCommit: string,
  ignorePatterns: string[],
  rootDir: string,
  env: NodeJS.ProcessEnv,
): Promise<Set<string>> {
  const ignoreArgs = ignorePatterns.flatMap((pattern) => [
    '--changed-files-ignore-pattern',
    pattern,
  ]);
  const { stdout } = await $$({
    cwd: rootDir,
    env,
    extendEnv: false,
  })`pnpm ls --recursive --depth -1 --json --ignore-pnpmfile --filter ${`[${baseCommit}]`} ${ignoreArgs}`;
  const projects = JSON.parse(stdout || '[]') as { name?: string }[];
  return new Set(projects.flatMap(({ name }) => (name ? [name] : [])));
}

/** findPackagesNeedingChangeset against the working tree of `rootDir`. */
async function findInWorkingTree(
  baseCommit: string,
  ignorePatterns: string[],
  rootDir: string,
  env: NodeJS.ProcessEnv,
): Promise<string[]> {
  const workspace = await getWorkspace(rootDir, env);

  const [projects, changed, covered] = await Promise.all([
    getPublishablePackages(workspace, rootDir, env),
    listChangedProjects(baseCommit, ignorePatterns, rootDir, env),
    getPackagesWithChangset(baseCommit, '', rootDir, env),
  ]);

  return projects.map(({ name }) => name).filter((name) => changed.has(name) && !covered.has(name));
}

export interface FindPackagesNeedingChangesetOptions {
  /** The workspace root; tests point this at a fixture repository. */
  rootDir?: string;
}

/**
 * Finds publishable packages that changed between two refs but have no changeset
 * covering them. Change detection is pnpm's `[since]` filter: a package counts
 * as changed when a file in its directory changed (respecting ignorePatterns)
 * or a catalog entry it references was bumped.
 *
 * @param baseCommit - The commit to compare against.
 * @param headCommit - The commit or tree to compare to. Empty compares against
 *   the working tree (uncommitted changes).
 * @param ignorePatterns - Repo-relative path globs that never warrant a release.
 * @returns Names of packages missing a changeset.
 */
export async function findPackagesNeedingChangeset(
  baseCommit: string,
  headCommit = 'HEAD',
  ignorePatterns: string[] = [],
  { rootDir = ROOT_DIR }: FindPackagesNeedingChangesetOptions = {},
): Promise<string[]> {
  // An explicit head is checked out, so the workspace, the package list, the
  // change intents and pnpm's diff all read the same snapshot of it.
  return headCommit
    ? withHeadCheckout(baseCommit, headCommit, rootDir, (dir, env) =>
        findInWorkingTree(baseCommit, ignorePatterns, dir, env),
      )
    : findInWorkingTree(baseCommit, ignorePatterns, rootDir, process.env);
}
