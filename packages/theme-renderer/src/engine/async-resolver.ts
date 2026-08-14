import {generateId} from './generate-id.ts';

/**
 * Placeholder-token mechanism for async helpers, ported from
 * express-hbs lib/resolver.js.
 *
 * Async helpers synchronously return a unique placeholder id during template
 * execution; the promised values are string-replaced into the final output.
 */

const ID_LENGTH = 8;
const ID_PREFIX = '__aSyNcId__';

// NOTE: We must include a character which is escaped by Handlebars in the "async id"
// This is so that when using an async helper "inline", such as {{asyncHelper "foo"}}
// the content is correctly escaped depending on whether double or triple braces.
// (from express-hbs lib/resolver.js)
const ID_ESCAPED_STRING = '<_';

const ID_SUFFIX = '__';

export type ResolverCache = Record<string, Promise<unknown>>;

// from express-hbs lib/resolver.js:resolve
// DEVIATION: express-hbs ignores fn's return value (its wrappers are
// callback-only and never reject). Our wrappers can be async functions — if
// the returned promise rejects without cb ever firing, the cache entry would
// stay pending forever and hang the render. Chain the thenable so the entry
// settles (rejecting the render cleanly) — belt-and-braces on top of the
// wrapper's own never-reject hardening (helpers/services/handlebars.ts).
export function resolve(
    cache: ResolverCache,
    fn: (context: unknown, cb: (result: unknown) => void) => unknown,
    context: unknown
): string {
    const id = ID_PREFIX + ID_ESCAPED_STRING + generateId(ID_LENGTH) + ID_SUFFIX;
    cache[id] = new Promise((passed, failed) => {
        try {
            const returned = fn(context, (res) => {
                passed(res);
            });
            if (returned && typeof (returned as PromiseLike<unknown>).then === 'function') {
                Promise.resolve(returned).catch(failed);
            }
        } catch (error) {
            failed(error);
        }
    });
    return id;
}

// from express-hbs lib/resolver.js:done (callback shape replaced by a Promise)
export async function done(cache: ResolverCache): Promise<Record<string, unknown>> {
    const entries = Object.entries(cache);
    const values = await Promise.all(entries.map(([, promise]) => promise));
    const resolvedCache: Record<string, unknown> = {};
    entries.forEach(([key], index) => {
        resolvedCache[key] = values[index];
    });
    return resolvedCache;
}

// from express-hbs lib/resolver.js:hasResolvers
// QUIRK: `search(...) > 0` (not >= 0) — a placeholder sitting at the very
// start of the text is NOT detected, so a second-generation placeholder at
// position 0 would be left unresolved. Preserved verbatim for parity.
// NOTE: We specifically search the text for the ID_PREFIX **NOT** including the
// escapable character, because that character can be escaped in the text.
export function hasResolvers(text: string): boolean {
    if (text.search(ID_PREFIX) > 0) {
        return true;
    }
    return false;
}
