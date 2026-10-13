import { join } from 'node:path';

export const SCRIPTS_DIR = join(import.meta.dirname, '..');
export const ROOT_DIR = join(SCRIPTS_DIR, '../..');

// Markdown that never leaves the repo. README is excluded because npm packs it
// into the tarball, in whatever casing npm resolves it by.
export const INTERNAL_DOCS_PATTERN = `**/${globExcept('README')}.md`;

/**
 * A glob segment matching any name except `name`, case-insensitively. pnpm's
 * glob has neither extglob `!(…)` nor `!` negation, so it is spelled out: a
 * name of any other length, or one that differs from `name` at some position.
 */
function globExcept(name: string): string {
  const any = (n: number) => '?'.repeat(n);
  const shorter = Array.from({ length: name.length - 1 }, (_, i) => any(i + 1));
  const longer = `${any(name.length + 1)}*`;
  const differing = [...name].map(
    (char, i) =>
      `${any(i)}[!${char.toUpperCase()}${char.toLowerCase()}]${any(name.length - i - 1)}`,
  );
  return `{${[...shorter, longer, ...differing].join(',')}}`;
}

// Version carried by every private workspace package. Not semver on purpose:
// `pnpm version -r` plans a release for any package with a semver version
// unless it is listed in `versioning.ignore`, and skips the rest.
export const PRIVATE_PACKAGE_VERSION = 'private';
