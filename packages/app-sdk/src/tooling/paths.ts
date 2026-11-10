import { lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/** Whether `child` is `parent` or anything inside it. Both are absolute. */
export function isWithin(parent: string, child: string): boolean {
  const path = relative(parent, child);
  // Only `..` as a whole segment climbs out: `..signed.json` is a file inside.
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

const realpath = (path: string) => {
  try {
    // The native one gives the case the path has on disk, where the filesystem ignores case.
    return realpathSync.native(path);
  } catch {
    return undefined;
  }
};

// As many links as Linux follows before it gives up with ELOOP.
const MAX_LINKS = 40;

/**
 * Where writing to `path` really lands: through every link, as far as the path exists, and
 * along a chain of dangling links to where its last one points, as writing follows them all. A
 * path that doesn't exist yet lands in its directory, wherever that really is.
 */
export function canonicalPath(path: string, links = 0): string {
  const existing = realpath(path);
  if (existing) {
    return existing;
  }
  if (links < MAX_LINKS && lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink()) {
    return canonicalPath(resolve(dirname(path), readlinkSync(path)), links + 1);
  }
  const parent = dirname(path);
  return join(parent === path ? parent : canonicalPath(parent, links), basename(path));
}
