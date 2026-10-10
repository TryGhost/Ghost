#!/usr/bin/env bash
# Initialises the theme submodules. A linked worktree clones them from the main
# checkout's copies, which skips the network; anything missing falls back to GitHub.
set -euo pipefail

common_dir=$(git rev-parse --path-format=absolute --git-common-dir)

if [ "$(git rev-parse --path-format=absolute --git-dir)" != "$common_dir" ]; then
    git config -f .gitmodules --get-regexp '^submodule\..*\.path$' | while read -r key subpath; do
        name=${key#submodule.}
        name=${name%.path}
        local_repo="$common_dir/modules/$name"
        if [ ! -d "$local_repo" ] || [ -e "$subpath/.git" ]; then
            continue
        fi
        git submodule init -q -- "$subpath"
        git -c "submodule.$name.url=$local_repo" -c protocol.file.allow=always \
            submodule update -q -- "$subpath" || true
        # Point the clone's origin back at GitHub
        git submodule sync -q -- "$subpath"
    done
fi

git submodule update --init --recursive
