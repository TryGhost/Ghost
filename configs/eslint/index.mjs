// Re-exports the repo-root shared ESLint config so new packages can consume it
// by name (`@internal/cfg-eslint`) instead of a depth-relative path.
//
// The implementation intentionally stays at the repo root: nodeLibConfig() and
// reactAppConfig() dynamically `import()` their eslint plugins (eslint-plugin-
// ghost, typescript-eslint, ...), and ES module resolution is relative to the
// file performing the import. Keeping the source at the root resolves those
// plugins from the root devDependencies — matching the repo's existing plugin-
// hoisting design (see AGENTS.md). Moving it here would force every plugin to be
// re-declared as a dependency of this package.
export * from '../../eslint.shared.mjs';
