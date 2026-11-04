import { isAbsolute, relative } from 'node:path';

/** Whether `child` is `parent` or anything inside it. Both are absolute. */
export function isWithin(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}
