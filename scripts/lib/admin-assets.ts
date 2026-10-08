import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';

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
