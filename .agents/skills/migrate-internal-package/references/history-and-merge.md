# History-preserving package import

Read this reference before creating the Ghost import PR.

## Create package-only source history

Work from an up-to-date clone of the source repository. Use its actual default
branch and a temporary branch name that cannot be confused with a product
branch. For example, when the default branch is `main`:

```bash
git fetch origin
git switch --detach origin/main
git subtree split \
  --prefix=<source-package-path> \
  -b migrate-<package>-history
```

Record the split tip and inspect the resulting package-only history:

```bash
git rev-parse migrate-<package>-history
git log --oneline --reverse migrate-<package>-history
```

`git subtree split` retains the relevant commit authorship and chronology while
excluding unrelated source-repository paths.

## Attach the history to Ghost

From a branch based on freshly fetched Ghost `origin/main`, fetch the local
source split and add it without `--squash`:

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
git show --no-patch --format='%H%nparents: %P%n%B' HEAD
git log --graph --oneline --decorate --all --max-count=40
git log --follow -- packages/<ghost-directory>/path/to/representative-file
```

The subtree commit must have two parents, and its second parent must equal the
recorded split tip.

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
