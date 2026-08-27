// Workspace-wide root config. Every workspace has its own eslint.config.mjs,
// and the one non-workspace tool in the repo (.github/scripts/i18n-review) is
// deliberately self-contained and carries its own config + eslint dev dep — so
// there is nothing left at the repo root to lint. This file stays as the flat
// config entry point eslint resolves when invoked from the root, and to keep
// stray root-level files from silently inheriting another workspace's rules.
export default [];
