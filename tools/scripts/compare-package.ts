import { execFileSync, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual, parseArgs } from 'node:util';

type ComparisonMode = 'package' | 'umd';
type Comparison = { changed: boolean; reason: string };

// Compare the installed contract, not dev tooling, publish configuration or
// registry-generated fields. pnpm has already resolved publishConfig overrides
// and catalog/workspace dependencies in this manifest.
const CONSUMER_FIELDS = [
  'name',
  'type',
  'main',
  'module',
  'browser',
  'exports',
  'imports',
  'types',
  'typings',
  'typesVersions',
  'bin',
  'man',
  'style',
  'sass',
  'sideEffects',
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'bundleDependencies',
  'bundledDependencies',
  'engines',
  'os',
  'cpu',
  'libc',
  'config',
  'license',
];

function consumerManifest(contents: Buffer): Record<string, unknown> {
  const manifest = JSON.parse(contents.toString());
  const result: Record<string, unknown> = {};
  for (const field of CONSUMER_FIELDS) {
    if (Object.hasOwn(manifest, field)) {
      // Condition order affects resolution; ordinary JSON object order does not.
      result[field] = ['exports', 'imports', 'typesVersions'].includes(field)
        ? JSON.stringify(manifest[field])
        : manifest[field];
    }
  }
  const scripts = manifest.scripts || {};
  for (const name of ['preinstall', 'install', 'postinstall']) {
    if (Object.hasOwn(scripts, name)) {
      result[`scripts.${name}`] = scripts[name];
    }
  }
  return result;
}

function packageFiles(directory: string, prefix = ''): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  for (const entry of readdirSync(join(directory, prefix), { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) {
      for (const [name, contents] of packageFiles(directory, path)) {
        files.set(name, contents);
      }
    } else {
      files.set(path, readFileSync(join(directory, path)));
    }
  }
  return files;
}

function compareUmdDirectories(localDirectory: string, publishedDirectory: string): Comparison {
  // Keep the existing diff semantics, including added/removed directories.
  const result = spawnSync('diff', [
    '-rq',
    join(publishedDirectory, 'umd'),
    join(localDirectory, 'umd'),
  ]);
  return {
    changed: result.status !== 0,
    reason: result.status === 0 ? 'UMD contents match' : 'UMD contents differ',
  };
}

function comparePackedPackageDirectories(
  localDirectory: string,
  publishedDirectory: string,
): Comparison {
  const local = packageFiles(localDirectory);
  const published = packageFiles(publishedDirectory);
  const paths = [...new Set([...local.keys(), ...published.keys()])].sort();
  for (const path of paths) {
    const current = local.get(path);
    const previous = published.get(path);
    if (!current || !previous) {
      return { changed: true, reason: `${current ? 'Added' : 'Removed'} ${path}` };
    }
    if (path === 'package.json') {
      const currentManifest = consumerManifest(current);
      const previousManifest = consumerManifest(previous);
      const fields = new Set([...Object.keys(currentManifest), ...Object.keys(previousManifest)]);
      for (const field of fields) {
        if (!isDeepStrictEqual(currentManifest[field], previousManifest[field])) {
          return { changed: true, reason: `Changed package.json ${field}` };
        }
      }
    } else if (!current.equals(previous)) {
      return { changed: true, reason: `Changed ${path}` };
    }
  }
  return { changed: false, reason: 'Packed package contents match' };
}

/** Compare unpacked packages, or only their UMD directories for public apps. */
export function comparePackageDirectories(
  localDirectory: string,
  publishedDirectory: string,
  mode: ComparisonMode = 'package',
): Comparison {
  if (mode === 'umd') {
    return compareUmdDirectories(localDirectory, publishedDirectory);
  }
  return comparePackedPackageDirectories(localDirectory, publishedDirectory);
}

export function packPackage(packageDirectory: string, destination: string): void {
  // Packing still applies pnpm's manifest transformations. Lifecycle hooks are
  // disabled just as they are during Shade's privileged publishing install.
  execFileSync('pnpm', ['--config.ignore-scripts=true', 'pack', '--out', destination], {
    cwd: packageDirectory,
    stdio: 'inherit',
  });
}

function unpack(archive: string, directory: string): string {
  mkdirSync(directory);
  execFileSync('tar', ['-xzf', archive, '-C', directory]);
  return join(directory, 'package');
}

/** Build at the published version so embedded version strings compare equally. */
export async function comparePublishedPackage(
  packageDirectory: string,
  latestVersion: string,
  mode: ComparisonMode = 'package',
): Promise<Comparison> {
  if (!latestVersion) {
    return { changed: true, reason: 'No release in this version line yet' };
  }

  const manifestPath = join(packageDirectory, 'package.json');
  const originalManifest = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(originalManifest);
  if (typeof manifest.name !== 'string' || !manifest.name) {
    throw new Error(`${manifestPath} is missing a package name`);
  }
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'compare-package-'));
  try {
    writeFileSync(
      manifestPath,
      `${JSON.stringify({ ...manifest, version: latestVersion }, null, 2)}\n`,
    );
    execFileSync('pnpm', ['nx', 'build', manifest.name], {
      cwd: packageDirectory,
      stdio: 'inherit',
    });

    const reference = `${manifest.name}@${latestVersion}`;
    const tarball: unknown = JSON.parse(
      execFileSync('pnpm', ['view', reference, 'dist.tarball', '--json'], {
        cwd: packageDirectory,
        encoding: 'utf8',
      }),
    );
    if (typeof tarball !== 'string') {
      throw new Error(`Missing tarball URL for ${reference}`);
    }
    const response = await fetch(tarball);
    if (!response.ok) {
      throw new Error(`Failed to download ${reference}: HTTP ${response.status}`);
    }
    const publishedArchive = join(temporaryDirectory, 'published.tgz');
    writeFileSync(publishedArchive, Buffer.from(await response.arrayBuffer()));
    const published = unpack(publishedArchive, join(temporaryDirectory, 'published'));

    let local = packageDirectory;
    if (mode === 'package') {
      const localArchive = join(temporaryDirectory, 'local.tgz');
      packPackage(packageDirectory, localArchive);
      local = unpack(localArchive, join(temporaryDirectory, 'local'));
    }
    const comparison = comparePackageDirectories(local, published, mode);
    return { ...comparison, reason: `${comparison.reason} (${reference})` };
  } finally {
    writeFileSync(manifestPath, originalManifest);
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    options: { latest: { type: 'string' }, mode: { type: 'string', default: 'package' } },
    allowPositionals: true,
  });
  if (values.latest === undefined || !['package', 'umd'].includes(values.mode)) {
    throw new Error(
      'Usage: compare-package.ts --latest <version or empty> [--mode package|umd] [directory]',
    );
  }
  const comparison = await comparePublishedPackage(
    resolve(positionals[0] || '.'),
    values.latest,
    values.mode as ComparisonMode,
  );
  console.log(comparison.reason);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `changed=${comparison.changed}\n`);
  }
}
