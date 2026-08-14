/**
 * Draft persistence seam for edit mode.
 *
 * Edits live as session drafts client-side (spec: no server-side draft
 * schema in the first version) — but the STORE IS AN INTERFACE FROM DAY ONE
 * so server-backed persistence can land later without reworking the editor.
 * Everything is async and keyed by site + theme + a content hash of the BASE
 * theme (the downloaded, unedited files): a draft silently made against a
 * theme that has since changed on the server would apply stale positions, so
 * the key ties every draft to the exact base it was made from.
 *
 * DraftStore interface (all methods async — deliberately minimal; grow it
 * only when a caller exists):
 *   get(key)        → draft | null
 *   set(key, draft) → void       (stamps updatedAt)
 *   clear(key?)     → void       (no key = clear everything)
 *
 * Draft shape (by convention, the store is shape-agnostic):
 *   {files: Record<string, string>, editCount: number, updatedAt: number}
 */

/**
 * FNV-1a 32-bit over the sorted path + content pairs of the base theme's
 * text files. Not cryptographic — it only needs to distinguish theme
 * revisions, cheaply and synchronously (crypto.subtle is async and this runs
 * during session boot).
 *
 * @param {Record<string, string>} files
 * @returns {string} 8-char lowercase hex
 */
export function computeThemeContentHash(files) {
    let hash = 0x811c9dc5;

    const mix = (text) => {
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
    };

    for (const path of Object.keys(files).sort()) {
        mix(path);
        mix('\u0000');
        mix(files[path]);
        mix('\u0000');
    }

    return hash.toString(16).padStart(8, '0');
}

/**
 * @param {{siteUrl: string, themeName: string, baseHash: string}} parts
 * @returns {string}
 */
export function draftKey({siteUrl, themeName, baseHash}) {
    return `${siteUrl}::${themeName}::${baseHash}`;
}

/**
 * The in-memory DraftStore — deliberately the ONLY implementation in this
 * slice. Drafts survive edit-mode exit/re-entry within one page view and are
 * lost on navigation; the interface (not this implementation) is the
 * deliverable that the server-backed store will slot into.
 *
 * @returns {{get(key: string): Promise<Object|null>, set(key: string, draft: Object): Promise<void>, clear(key?: string): Promise<void>}}
 */
export function createMemoryDraftStore() {
    const drafts = new Map();

    return {
        async get(key) {
            return drafts.get(key) ?? null;
        },
        async set(key, draft) {
            drafts.set(key, {...draft, updatedAt: Date.now()});
        },
        async clear(key) {
            if (key === undefined) {
                drafts.clear();
            } else {
                drafts.delete(key);
            }
        }
    };
}
