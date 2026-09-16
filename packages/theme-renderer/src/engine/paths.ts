/**
 * Minimal posix-style path helpers for virtual (theme-relative) paths.
 * Replaces node:path so the engine stays web-standard (Web Worker safe).
 */

export function dirname(path: string): string {
  const index = path.lastIndexOf('/');
  if (index === -1) {
    return '.';
  }
  return path.slice(0, index);
}

export function extname(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  if (dot > 0) {
    return base.slice(dot);
  }
  return '';
}

/**
 * Resolves `segments` against `base` the way path.resolve(dirname, layout)
 * behaves for theme-relative paths: '.' and '..' are normalized, and '..'
 * cannot escape the virtual root (mirrors path.resolve clamping at '/').
 */
export function resolvePath(base: string, ...segments: string[]): string {
  const parts: string[] = [];
  for (const segment of [base, ...segments]) {
    for (const part of segment.split('/')) {
      if (part === '' || part === '.') {
        continue;
      }
      if (part === '..') {
        parts.pop();
        continue;
      }
      parts.push(part);
    }
  }
  return parts.join('/');
}
