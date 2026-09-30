#!/usr/bin/env bash
#
# Assembles the upload directory for public.ghostembeds.com.
#
#   ./build.sh [output-directory]    (default: ./deploy)
#
# It holds every renderer version, the _headers next to this script, and a 404
# page. Upload the directory to Netlify, or deploy it with:
#
#   netlify deploy --prod --dir=<output-directory> --no-build
#
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$here/../.." && pwd)"
renderer_dir="$repo_root/koenig/koenig-lexical/public/embed-renderer"
out_dir="${1:-$PWD/deploy}"

if [ ! -d "$renderer_dir" ]; then
    echo "renderer source missing: $renderer_dir" >&2
    exit 1
fi

rm -rf "$out_dir"
mkdir -p "$out_dir"

cp "$renderer_dir"/v*.html "$out_dir/"
cp "$here/404.html" "$out_dir/"
cp "$here/_headers" "$out_dir/"

echo "$out_dir"
for file in "$out_dir"/*; do
    printf '  %s  %s\n' "$(shasum -a 256 "$file" | cut -c1-16)" "$(basename "$file")"
done
