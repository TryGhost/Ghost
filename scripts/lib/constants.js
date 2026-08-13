import {join} from 'node:path';

export const SCRIPTS_DIR = join(import.meta.dirname, '..');
export const ROOT_DIR = join(SCRIPTS_DIR, '..');

// npm packs the package README into every published tarball and renders it on
// the package page, so editing one changes what consumers receive and warrants
// a patch. Every other markdown file — AGENTS.md, CLAUDE.md, internal guides —
// never leaves the repo, so it can't warrant a release on its own. The casing
// variants are listed because npm resolves the readme case-insensitively.
export const INTERNAL_DOCS_PATTERN = '**/!(README|readme|Readme|ReadMe).md';
