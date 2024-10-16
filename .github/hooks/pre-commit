#!/bin/bash
# Modified from https://github.com/chaitanyagupta/gitutils

[ -n "$CI" ] && exit 0

GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$GIT_BRANCH" = "main" ]; then
    yarn lint-staged --relative
    lintStatus=$?

    if [ $lintStatus -ne 0 ]; then
        echo "❌ Linting failed"
        exit 1
    fi
fi

green='\033[0;32m'
no_color='\033[0m'
grey='\033[0;90m'
red='\033[0;31m'

ROOT_DIR=$(git rev-parse --show-cdup)
SUBMODULES=$(grep path ${ROOT_DIR}.gitmodules | sed 's/^.*path = //')
MOD_SUBMODULES=$(git diff --cached --name-only --ignore-submodules=none | grep -F "$SUBMODULES")

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
    exit 0
else
    echo "No submodules in commit, continuing..."
    exit 0
fi
