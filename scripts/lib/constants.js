import { join } from 'node:path';

export const SCRIPTS_DIR = join(import.meta.dirname, '..');
export const ROOT_DIR = join(SCRIPTS_DIR, '..');

// Markdown that never leaves the repo. README is excluded because npm packs it
// into the tarball, in whatever casing npm resolves it by.
export const INTERNAL_DOCS_PATTERN = '**/!([Rr][Ee][Aa][Dd][Mm][Ee]).md';
