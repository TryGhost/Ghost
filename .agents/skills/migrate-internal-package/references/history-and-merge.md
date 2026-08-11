# History-preserving package import

Read this reference before creating the Ghost import PR.

## Create package-only source history

Work from an up-to-date, clean clone of the source repository. Use its actual
default branch and a temporary branch name that cannot be confused with a
product branch.

`git subtree split` may inspect thousands of commits and run for several
minutes. Use `--quiet` in agent or CI-style runners so its progress stream does
not flood or interrupt the runner. Run it on its own, keep the process alive
until it returns an exit status, and do not mistake an output timeout for
completion. For example, when the default branch is `main`:

```bash
set -euo pipefail

git fetch origin
git switch --detach origin/main
test -z "$(git status --porcelain)"
git subtree split \
  --quiet \
  --prefix=<source-package-path> \
  -b migrate-<package>-history \
  origin/main
```

Confirm the branch was actually created, then record the split tip and inspect
the resulting package-only history:

```bash
git show-ref --verify refs/heads/migrate-<package>-history
source_split_tip=$(git rev-parse migrate-<package>-history)
git log --oneline --reverse "$source_split_tip"
```

`git subtree split` retains the relevant commit authorship and chronology while
excluding unrelated source-repository paths.

## Attach the history to Ghost

Create or enter a dedicated Ghost worktree, then verify its branch, cleanliness,
base and empty destination before attaching history:

```bash
set -euo pipefail

test "$(git rev-parse --git-dir)" != "$(git rev-parse --git-common-dir)"
test "$(git branch --show-current)" = "codex/import-<package>"
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
test ! -e "packages/<ghost-directory>"
```

Fetch the local source split and add it without `--squash`. Run these as
separate checked operations and stop immediately if either fails:

```bash
git fetch /absolute/path/to/source-repository migrate-<package>-history
git subtree add \
  --prefix=packages/<ghost-directory> \
  FETCH_HEAD
```

The resulting commit should include:

```text
git-subtree-dir: packages/<ghost-directory>
git-subtree-mainline: <ghost-parent>
git-subtree-split: <source-split-tip>
```

Verify the topology before adding integration commits:

```bash
set -euo pipefail

source_split_tip="<recorded-source-split-tip>"
subtree_commit=$(git rev-parse HEAD)
ghost_parent=$(git rev-parse HEAD^1)
imported_parent=$(git rev-parse HEAD^2)

test "$ghost_parent" = "$(git rev-parse origin/main)"
test "$imported_parent" = "$source_split_tip"
git merge-base --is-ancestor "$source_split_tip" HEAD

git show --no-patch --format='%H%nparents: %P%n%B' "$subtree_commit"
git log --graph --oneline --decorate --all --max-count=40
git log --oneline -- packages/<ghost-directory>/path/to/representative-file
git log --oneline "$source_split_tip" -- path/to/representative-file
```

The subtree commit must have two parents: its first parent must equal the
recorded Ghost base and its second parent must equal the recorded split tip.
Checking the prefixed destination path and unprefixed split path separately is
more reliable around merge boundaries than relying only on `--follow`.

The Admin API schema migration from TryGhost/SDK is a known-good example:

- subtree commit: `a8fa1f10f23`
- source split tip and second parent: `345f740bb4d`
- GitHub merge commit on Ghost `main`: `6f2ae064fed`
- import branch tip and second GitHub merge parent: `56f9cf0e1d2`

## Validate the pull request

Expect GitHub to show imported source commits in the PR commit list. Before the
merge checkpoint:

```bash
gh pr checks <pr-number> --repo TryGhost/Ghost
gh pr view <pr-number> --repo TryGhost/Ghost \
  --json state,isDraft,mergeable,mergeStateStatus,headRefOid,baseRefOid
```

Resolve real failures and base conflicts without flattening the subtree merge.
Verify the graph again after any branch update.

## Use the guarded merge operation

The merge must retain both the subtree topology and the import branch as the
second parent of GitHub's merge commit. Do not manually reproduce the
repository-setting sequence from prose.

An authorized admin should run:

```bash
.agents/skills/migrate-internal-package/scripts/merge-history-pr \
    TryGhost/Ghost \
    <pr-number> \
    <source-split-tip> \
    --confirm
```

Use `--dry-run` instead of `--confirm` for read-only preflight. The script:

1. verifies authentication, PR state, checks and imported-history reachability;
2. records the current `allow_merge_commit` setting;
3. enables merge commits only when necessary;
4. merges with `--merge --match-head-commit`;
5. restores the setting through an exit trap;
6. verifies the merged commit has two parents;
7. verifies the source split tip remains an ancestor of the merged result.

If branch protection or a merge queue blocks the operation, report the exact
blocker. Do not add `--admin` or bypass policy.

## Verify independently

After the script succeeds, fetch the remote rather than relying only on its
output:

```bash
git fetch origin main
git log --first-parent --oneline origin/main --max-count=10
git show --no-patch --format='%H%nparents: %P%n%s' origin/main
git merge-base --is-ancestor <source-split-tip> origin/main
```

The final command must exit zero. Only then begin cleanup in the source
repository.
