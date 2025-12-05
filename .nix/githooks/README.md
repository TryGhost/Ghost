# Git Hooks for Nix

## Why?

Nix requires knowing the hash of external dependencies *before* fetching them. This is how it guarantees reproducibility—if the hash doesn't match, the build fails rather than silently using different content.

When `yarn.lock` changes, the pre-computed hash in `.docker-nix/default.nix` becomes stale and must be updated.

## Installation

```bash
# Option 1: Symlink
ln -sf ../../.nix/githooks/pre-commit .git/hooks/pre-commit

# Option 2: Configure git to use this directory
git config core.hooksPath .nix/githooks
```

## What it does

The `pre-commit` hook checks if `yarn.lock` is staged. If so, it validates that the `fetchYarnDeps` hash is correct by building the `yarn-offline-cache` derivation (~4 seconds).

If the hash is stale:
```bash
nix run .#update-yarn-hash
```

If Nix isn't installed, the hook skips gracefully—CI will catch any issues.
