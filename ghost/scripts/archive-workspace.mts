import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Only installation metadata that the standalone archive can use belongs here.
// In particular, include/configDependencies/bootConfig and executable pnpmfiles
// describe the checkout, and must not become dependencies of a Ghost install.
const ARCHIVE_SETTINGS = [
  'catalog',
  'catalogs',
  'allowBuilds',
  'strictDepBuilds',
  'overrides',
  'packageExtensions',
  'ignoredOptionalDependencies',
  'patchedDependencies',
] as const;

export interface ArchiveWorkspace extends Record<string, unknown> {
  strictDepBuilds: boolean;
  patchedDependencies?: Record<string, string>;
  overrides?: Record<string, string>;
}

function stableKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableKeys);
  }
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, stableKeys(object[key])]),
    );
  }
  return value;
}

function isOutsideRoot(relative: string): boolean {
  return (
    !relative ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  );
}

/** Resolve includes with the same pnpm that builds the archive, then export a
 * self-contained subset. Query individual keys rather than dumping all config,
 * which can contain a developer's registry credentials.
 */
export async function loadArchiveWorkspace(
  rootDir: string,
  pnpmCommand = 'pnpm',
): Promise<ArchiveWorkspace> {
  const root = await fs.realpath(rootDir);
  const values = await Promise.all(
    [...ARCHIVE_SETTINGS, 'permissions'].map(async (key) => {
      const { stdout } = await execFileAsync(pnpmCommand, ['config', 'get', key, '--json'], {
        cwd: root,
        maxBuffer: 16 * 1024 * 1024,
      });
      const output = stdout.trim();
      const value: unknown = output && output !== 'undefined' ? JSON.parse(output) : null;
      // pnpm's object key order is not stable between processes. Preserve list
      // ordering, but normalize map keys for reproducible archive metadata.
      return [key, stableKeys(value)] as const;
    }),
  );
  const settings: Record<string, unknown> = Object.fromEntries(
    values.filter(([, value]) => value !== null),
  );

  // pnpm's newer permissions.build can override allowBuilds. Until the archive
  // supports that policy, do not silently turn an explicit denial into approval.
  const permissions = settings.permissions as Record<string, { build?: unknown }> | undefined;
  if (permissions && Object.values(permissions).some((entry) => entry.build !== undefined)) {
    throw new Error('Cannot package Ghost with permissions.build; archive export is unsupported');
  }
  delete settings.permissions;

  // `config get` can succeed before a config dependency has been installed and
  // omit its settings. Never silently drop the archive's build-script policy.
  if (typeof settings.strictDepBuilds !== 'boolean') {
    throw new Error(
      'Cannot package Ghost without resolved strictDepBuilds; run pnpm install first',
    );
  }

  // pnpm exposes the default catalog through both names. Keep one owner in the
  // exported YAML instead of writing catalog and its catalogs.default alias.
  if (settings.catalogs) {
    const catalogs = { ...(settings.catalogs as Record<string, unknown>) };
    delete catalogs.default;
    if (Object.keys(catalogs).length) {
      settings.catalogs = catalogs;
    } else {
      delete settings.catalogs;
    }
  }

  if (settings.patchedDependencies) {
    const patches = settings.patchedDependencies as Record<string, string>;
    settings.patchedDependencies = Object.fromEntries(
      await Promise.all(
        Object.entries(patches).map(async ([name, file]) => {
          // pnpm resolves included-file-relative patch paths to absolute paths.
          // The archive retains their checkout-relative layout and copies them
          // into that layout; an outside-root path cannot be copied safely.
          const relative = path.relative(root, path.resolve(root, file));
          if (isOutsideRoot(relative)) {
            throw new Error(`Cannot package patch outside the repository: ${name}`);
          }
          const realFile = await fs.realpath(path.resolve(root, file));
          if (isOutsideRoot(path.relative(root, realFile))) {
            throw new Error(`Cannot package patch outside the repository: ${name}`);
          }
          return [name, relative.split(path.sep).join('/')];
        }),
      ),
    );
  }

  return {
    ...settings,
    strictDepBuilds: settings.strictDepBuilds,
    // Bundled workspace tarballs are local, unpublished components. Retain the
    // archive's existing age policy rather than applying registry age checks.
    minimumReleaseAge: 0,
    allowUnusedPatches: true,
  };
}
