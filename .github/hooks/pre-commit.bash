#!/usr/bin/env bash
# Modified from https://github.com/chaitanyagupta/gitutils

[ -n "$CI" ] && exit 0

green='\033[0;32m'
no_color='\033[0m'
grey='\033[0;90m'
red='\033[0;31m'

pnpm lint-staged --relative
lintStatus=$?

if [ $lintStatus -ne 0 ]; then
    echo "❌ Linting failed"
    exit 1
fi

##
## 1) Scan staged text files for secrets
##

scan_staged_secrets() {
    local file
    local files_scanned=0
    local scan_status=0
    local tmpfile

    if ! pnpm exec secretlint --version >/dev/null 2>&1; then
        echo -e "${red}secretlint is not available. Run pnpm install from the repository root.${no_color}"
        return 1
    fi

    if ! tmpfile=$(mktemp); then
        echo -e "${red}Could not create temp file for secret scanning${no_color}"
        return 1
    fi

    echo -e "Scanning staged files for secrets ${grey}(pre-commit hook)${no_color} "

    while IFS= read -r -d '' file; do
        if ! git show ":$file" > "$tmpfile"; then
            scan_status=1
            continue
        fi

        if LC_ALL=C grep -Iq . "$tmpfile"; then
            files_scanned=$((files_scanned + 1))

            if ! pnpm exec secretlint --format=compact --stdinFileName="$file" < "$tmpfile"; then
                scan_status=1
            fi
        fi
    done < <(git diff --cached --name-only --diff-filter=ACMR -z)

    if [ $files_scanned -eq 0 ]; then
        echo "No staged text files to scan, continuing..."
    fi

    rm -f "$tmpfile"

    return $scan_status
}

scan_staged_secrets
secretScanStatus=$?

if [ $secretScanStatus -ne 0 ]; then
    echo -e "${red}❌ Secret scanning failed${no_color}"
    exit 1
fi

##
## 2) Check and remove submodules before committing
##

ROOT_DIR=$(git rev-parse --show-cdup)
SUBMODULES=$(grep path ${ROOT_DIR}.gitmodules | sed 's/^.*path = //')
MOD_SUBMODULES=$(git diff --cached --name-only --ignore-submodules=none | grep -F "$SUBMODULES" || true)

echo -e "Checking submodules ${grey}(pre-commit hook)${no_color} "

# If no modified submodules, exit with status code 0, else remove them and continue
if [[ -n "$MOD_SUBMODULES" ]]; then
    echo -e "${grey}Removing submodules from commit...${no_color}"
    for SUB in $MOD_SUBMODULES
    do
        git reset --quiet HEAD "$SUB"
        echo -e "\t${grey}removed:\t$SUB${no_color}"
    done
    echo
    echo -e "${grey}Submodules removed from commit, continuing...${no_color}"

    # If there are no changes to commit after removing submodules, abort to avoid an empty commit
    if output=$(git status --porcelain) && [ -z "$output" ]; then
        echo -e "nothing to commit, working tree clean"
        exit 1
    fi
else
    echo "No submodules in commit, continuing..."
fi

##
## 3) Remind about publishable package changes that lack a changeset
##

echo -e "Checking for changesets ${grey}(pre-commit hook)${no_color} "

# Compare the branch against main (same check CI runs on the PR). Non-blocking on
# purpose: the changeset is often added in a later commit, so failing here would
# block work-in-progress commits. CI's "Check app version bump" job is the hard
# gate — this is only a reminder.
CHANGESET_BASE=$(git merge-base main HEAD 2>/dev/null || git merge-base origin/main HEAD 2>/dev/null || true)
# Write the staged index to a tree so the check sees the commit being created,
# not just what's already in HEAD. change-check.js accepts any tree-ish as head.
STAGED_TREE=$(git write-tree 2>/dev/null || true)

if [ -z "$CHANGESET_BASE" ] || [ -z "$STAGED_TREE" ]; then
    echo "No merge-base with main, skipping changeset check..."
elif node scripts/change-check.js "$CHANGESET_BASE" "$STAGED_TREE"; then
    echo "Changesets look good, continuing..."
else
    echo -e "${grey}⚠️  Reminder only (not blocking) — run 'pnpm change' to add a changeset. CI enforces this.${no_color}"
fi
