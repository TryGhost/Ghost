// Read-only static-file access behind a platform boundary (decision #13:
// Workers-first). Keys are logical, posix-style paths in a virtual asset
// namespace shared by every runtime:
//
//   admin/<path>             — Ember admin build (index.html + assets/)
//   apps/<name>/<path>       — embedded React app dists (stats, posts, ...)
//   public/<path>            — ghost/core public frontend assets
//   portal/<path>            — portal UMD bundle
//   sodo-search/<path>       — sodo-search UMD bundle
//   announcement-bar/<path>  — announcement-bar UMD bundle
//   attribution/<file>       — member-attribution source scripts
//   themes/<id>/assets/<path> — active theme assets
//
// Node resolves keys against the monorepo (src/platform/files/node.ts);
// Workers resolves them against the staged static-assets binding
// (src/platform/files/workers.ts + src/tools/stage-worker-assets.ts).
export type FileStore = {
    read: (key: string) => Promise<Uint8Array | null>;
    readText: (key: string) => Promise<string | null>;
};

// Containment guard: request-derived keys may carry `.`/`..` segments or
// other traversal attempts; anything that escapes the namespace is rejected.
export const normalizeKey = (key: string): string | null => {
    const segments = key.split('/');
    const normalized: string[] = [];
    for (const segment of segments) {
        if (segment === '' || segment === '.') {
            continue;
        }
        if (segment === '..' || segment.includes('\\') || segment.includes('\0')) {
            return null;
        }
        normalized.push(segment);
    }
    return normalized.length > 0 ? normalized.join('/') : null;
};
