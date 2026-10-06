import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  chmodSync,
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

type EmbeddedAdminAssetsOptions = Pick<
  LegacyAdminAssetsOptions,
  'destination' | 'activitypubDist' | 'koenigDist' | 'environment' | 'editorUrl'
>;

/** Embedded bundles are shared by both Admin hosts. */
function prepareEmbeddedAdminAssets(options: EmbeddedAdminAssetsOptions): void {
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

export interface AdminAssetsOptions {
  editorUrl?: string;
  /** Keep the hybrid build until all Ember routes have been retired. */
  includeEmber?: boolean;
}

/** Assemble Admin and its isolated embed renderer from their build outputs. */
export function assembleAdminAssets(root: string, options: AdminAssetsOptions = {}): void {
  const includeEmber = options.includeEmber ?? true;
  const emberDist = join(root, 'apps/ember-admin/dist');
  const reactDist = join(root, 'apps/admin/dist');
  const activitypubDist = join(root, 'apps/activitypub/dist');
  const koenigDist = join(root, 'koenig/koenig-lexical/dist');
  const renderer = join(koenigDist, 'embed-renderer');
  const built = join(root, 'ghost/core/core/built');
  const destination = join(built, 'admin');

  for (const path of [
    ...(includeEmber ? [join(emberDist, 'index.html')] : []),
    join(reactDist, 'index.html'),
    activitypubDist,
    renderer,
  ]) {
    if (!existsSync(path)) {
      throw new Error(`Admin asset input is missing: ${path}. Run the Admin build first.`);
    }
  }

  if (
    !includeEmber &&
    readFileSync(join(reactDist, 'index.html'), 'utf8').includes('ghost-admin/config/environment')
  ) {
    throw new Error(
      'React-only assembly requires a fresh React build without the Ember assets plugin.',
    );
  }

  mkdirSync(built, { recursive: true });
  const staging = mkdtempSync(join(built, '.admin-assets-'));
  try {
    const stagedAdmin = join(staging, 'admin');
    const embeddedOptions = {
      destination: stagedAdmin,
      activitypubDist,
      koenigDist,
      environment: 'production',
      editorUrl: options.editorUrl,
    };
    if (includeEmber) {
      prepareLegacyAdminAssets({ ...embeddedOptions, emberDist });
    } else {
      mkdirSync(stagedAdmin, { recursive: true });
      prepareEmbeddedAdminAssets(embeddedOptions);
    }

    // Preserve the preview bundle and Core's output with the same merged assets.
    // Shared bundles come from their own builds, never previous Core output.
    const reactAssets = join(reactDist, 'assets');
    cpSync(join(stagedAdmin, 'assets'), reactAssets, { recursive: true, dereference: true });
    cpSync(reactAssets, join(stagedAdmin, 'assets'), { recursive: true, dereference: true });
    cpSync(join(reactDist, 'index.html'), join(stagedAdmin, 'index.html'));

    const leakedRenderer = join(stagedAdmin, 'assets/koenig-lexical/embed-renderer');
    if (existsSync(leakedRenderer)) {
      throw new Error(
        `Koenig's embed renderer must not be served with Admin assets from ${leakedRenderer}.`,
      );
    }

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
