import {join} from 'node:path';

export const SCRIPTS_DIR = join(import.meta.dirname, '..');
export const ROOT_DIR = join(SCRIPTS_DIR, '..');

// Markdown that never leaves the repo. README is excluded because npm packs it
// into the tarball, and npm resolves that filename case-insensitively.
export const INTERNAL_DOCS_PATTERN = '**/!(README|readme|Readme|ReadMe).md';
