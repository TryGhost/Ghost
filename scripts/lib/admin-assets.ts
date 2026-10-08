import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

export interface LegacyAdminAssetsOptions {
  emberDist: string;
  destination: string;
  activitypubDist: string;
  koenigDist: string;
  environment: string;
  editorUrl?: string;
}

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

/** Compatibility preparation for Ember's standalone build and live-reload server. */
export function prepareLegacyAdminAssets(options: LegacyAdminAssetsOptions): void {
  const { emberDist, destination } = options;
  const assets = join(emberDist, 'assets');
  // Keep Ember's sourcemap paths consistent with its standalone development server.
  for (const path of files(assets)) {
    if (relative(assets, path).split(/[\\/]/)[0] === 'icons' || !path.endsWith('.map')) {
      continue;
    }
    const map = JSON.parse(readFileSync(path, 'utf8')) as { sources: string[] };
    map.sources = map.sources.map((source) => source.replace('assets/', ''));
    writeFileSync(path, JSON.stringify(map));
  }

  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  copyFileSync(join(emberDist, 'index.html'), join(destination, 'index.html'));
  cpSync(assets, join(destination, 'assets'), {
    recursive: true,
    dereference: true,
    filter: (source) => relative(assets, source).split(/[\\/]/)[0] !== 'icons',
  });

  prepareEmbeddedAdminAssets(options);
}

/** Embedded bundles for Ember's standalone output. */
function prepareEmbeddedAdminAssets(options: LegacyAdminAssetsOptions): void {
  const { destination, activitypubDist, koenigDist, environment, editorUrl } = options;
  const activitypubDestination = join(destination, 'assets/activitypub');
  if (existsSync(activitypubDist)) {
    if (environment === 'production') {
      cpSync(activitypubDist, activitypubDestination, { recursive: true, dereference: true });
    } else {
      mkdirSync(dirname(activitypubDestination), { recursive: true });
      symlinkSync(
        relative(dirname(activitypubDestination), resolve(activitypubDist)),
        activitypubDestination,
        'dir',
      );
    }
  } else if (environment === 'production') {
    console.log('activitypub folder not found');
  }

  if (!editorUrl) {
    if (existsSync(koenigDist)) {
      const renderer = resolve(koenigDist, 'embed-renderer');
      cpSync(koenigDist, join(destination, 'assets/koenig-lexical'), {
        recursive: true,
        dereference: true,
        filter: (source) => resolve(source) !== renderer,
      });
    } else {
      console.log('Koenig-Lexical folder not found');
    }
  }
}

function normalizePermissions(directory: string): void {
  chmodSync(directory, 0o755);
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      normalizePermissions(path);
    } else if (entry.isFile()) {
      chmodSync(path, 0o644);
    }
  }
}

/** Assemble Admin and its isolated embed renderer from their build outputs. */
export function assembleAdminAssets(root: string): void {
  const reactDist = join(root, 'apps/admin/dist');
  const renderer = join(root, 'koenig/koenig-lexical/dist/embed-renderer');
  const built = join(root, 'ghost/core/core/built');
  const destination = join(built, 'admin');

  for (const path of [join(reactDist, 'index.html'), renderer]) {
    if (!existsSync(path)) {
      throw new Error(`Admin asset input is missing: ${path}. Run the Admin build first.`);
    }
  }

  const leakedRenderer = join(reactDist, 'assets/koenig-lexical/embed-renderer');
  if (existsSync(leakedRenderer)) {
    throw new Error(
      `Koenig's embed renderer must not be served with Admin assets from ${leakedRenderer}.`,
    );
  }

  mkdirSync(built, { recursive: true });
  const staging = mkdtempSync(join(built, '.admin-assets-'));
  try {
    const stagedAdmin = join(staging, 'admin');
    cpSync(reactDist, stagedAdmin, { recursive: true, dereference: true });
    const stagedRenderer = join(staging, 'embed-renderer');
    cpSync(renderer, stagedRenderer, { recursive: true });
    normalizePermissions(reactDist);
    normalizePermissions(stagedAdmin);

    rmSync(destination, { recursive: true, force: true });
    cpSync(stagedAdmin, destination, { recursive: true, dereference: true });
    normalizePermissions(destination);
    const rendererDestination = join(built, 'embed-renderer');
    rmSync(rendererDestination, { recursive: true, force: true });
    cpSync(stagedRenderer, rendererDestination, { recursive: true });
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
