#!/bin/bash
set -e

baseDir="./base_content"
targetDir="./content"

# Seed top-level content subdirectories (data, settings, etc.)
for src in "$baseDir"/*/; do
    src="${src%/}"
    [[ -e "$src" ]] || continue
    target="$targetDir/$(basename "$src")"
    if [[ ! -e "$target" ]]; then
        mkdir -p "$(dirname "$target")"
        tar -cC "$(dirname "$src")" "$(basename "$src")" | tar -xC "$(dirname "$target")"
    fi
done

# Seed individual themes (casper, source, etc.)
for src in "$baseDir"/themes/*/; do
    src="${src%/}"
    [[ -e "$src" ]] || continue
    target="$targetDir/themes/$(basename "$src")"
    if [[ ! -e "$target" ]]; then
        mkdir -p "$targetDir/themes"
        tar -cC "$(dirname "$src")" "$(basename "$src")" | tar -xC "$targetDir/themes"
    fi
done

exec "$@"
