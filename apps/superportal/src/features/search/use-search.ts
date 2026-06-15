/**
 * Search index logic — FlexSearch-backed post/author/tag index with lazy
 * population from the Ghost Content API search-index endpoints.
 *
 * The index is initialised once per modal session and lives for the lifetime
 * of the SearchModal component. Results are kept in React state so the
 * component re-renders as the query changes.
 */
import {Document as FlexDocument, Charset} from 'flexsearch';
import {useCallback, useEffect, useRef, useState} from 'react';
import {error as logError} from '../../shared/log';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface PostRecord {
    id: string;
    title: string;
    excerpt: string;
    url: string;
}

export interface AuthorRecord {
    id: string;
    name: string;
    profile_image: string | null;
    url: string;
}

export interface TagRecord {
    id: string;
    name: string;
    url: string;
}

export interface SearchResults {
    posts: PostRecord[];
    authors: AuthorRecord[];
    tags: TagRecord[];
}

// ---------------------------------------------------------------------------
// CJK tokeniser  (ported verbatim from sodo-search/src/search-index.js)
// ---------------------------------------------------------------------------

function isCJK(codePoint: number): boolean {
    return (
        (codePoint >= 0x4E00 && codePoint <= 0x9FFF) ||
        (codePoint >= 0x3040 && codePoint <= 0x30FF) ||
        (codePoint >= 0xAC00 && codePoint <= 0xD7A3) ||
        (codePoint >= 0x3400 && codePoint <= 0x4DBF) ||
        (codePoint >= 0x20000 && codePoint <= 0x2A6DF) ||
        (codePoint >= 0x2A700 && codePoint <= 0x2EBEF) ||
        (codePoint >= 0x30000 && codePoint <= 0x323AF) ||
        (codePoint >= 0x2EBF0 && codePoint <= 0x2EE5F) ||
        (codePoint >= 0xF900 && codePoint <= 0xFAFF) ||
        (codePoint >= 0x2F800 && codePoint <= 0x2FA1F)
    );
}

function tokenizeCjkByCodePoint(text: string): string[] {
    const result: string[] = [];
    let buffer = '';
    for (const char of text) {
        const codePoint = char.codePointAt(0) ?? 0;
        if (isCJK(codePoint)) {
            if (buffer) {
                result.push(buffer);
                buffer = '';
            }
            result.push(char);
        } else {
            buffer += char;
        }
    }
    if (buffer) {
        result.push(buffer);
    }
    return result;
}

// ---------------------------------------------------------------------------
// Index class
// ---------------------------------------------------------------------------

const INVALID_URL_RE = /\/404\/$/;

type Direction = 'ltr' | 'rtl';

class SearchIndex {
    private readonly apiUrl: string;
    private readonly apiKey: string;
    private readonly postsIndex: FlexDocument;
    private readonly authorsIndex: FlexDocument;
    private readonly tagsIndex: FlexDocument;

    constructor(apiUrl: string, apiKey: string, dir: Direction = 'ltr') {
        // Strip trailing slash — API paths are appended with a leading slash.
        this.apiUrl = apiUrl.replace(/\/+$/, '');
        this.apiKey = apiKey;

        // Build an EncoderOptions that extends Charset.Default with CJK tokenisation.
        // Charset.Default is an EncoderOptions object; we spread it and add our finalize.
        const encoder = {
            ...Charset.Default,
            finalize: (terms: string[]) => {
                const out: string[] = [];
                for (const term of terms) {
                    out.push(...tokenizeCjkByCodePoint(term));
                }
                return out;
            }
        };

        const tokenize = dir === 'rtl' ? 'reverse' : 'forward';
        const rtl = dir === 'rtl';

        this.postsIndex = new FlexDocument({
            tokenize,
            rtl,
            document: {id: 'id', index: ['title', 'excerpt'], store: true},
            encoder
        });

        this.authorsIndex = new FlexDocument({
            tokenize,
            rtl,
            document: {id: 'id', index: ['name'], store: true},
            encoder
        });

        this.tagsIndex = new FlexDocument({
            tokenize,
            rtl,
            document: {id: 'id', index: ['name'], store: true},
            encoder
        });
    }

    // -----------------------------------------------------------------------
    // Fetch helpers
    // -----------------------------------------------------------------------

    private async fetchJson<T>(path: string): Promise<T[]> {
        try {
            const sep = path.includes('?') ? '&' : '?';
            const url = `${this.apiUrl}${path}${this.apiKey ? `${sep}key=${encodeURIComponent(this.apiKey)}` : ''}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const json = await response.json() as Record<string, T[]>;
            // The API returns `{ posts: [...] }` / `{ authors: [...] }` etc.
            const key = Object.keys(json)[0];
            return (key !== undefined ? json[key] : []) ?? [];
        } catch (err) {
            logError(`search index fetch failed for ${path}`, err);
            return [];
        }
    }

    // -----------------------------------------------------------------------
    // Population
    // -----------------------------------------------------------------------

    async init(): Promise<void> {
        const [posts, authors, tags] = await Promise.all([
            this.fetchJson<PostRecord>('/ghost/api/content/search-index/posts/'),
            this.fetchJson<AuthorRecord>('/ghost/api/content/search-index/authors/'),
            this.fetchJson<TagRecord>('/ghost/api/content/search-index/tags/')
        ]);

        // FlexDocument.add() expects DocumentData (an internal flexsearch type not
        // re-exported). Our record types satisfy the shape at runtime; the cast
        // through `unknown` is intentional.
        type DocData = Parameters<FlexDocument['add']>[0];
        for (const post of posts) {
            this.postsIndex.add(post as unknown as DocData);
        }
        for (const author of authors) {
            this.authorsIndex.add(author as unknown as DocData);
        }
        for (const tag of tags) {
            this.tagsIndex.add(tag as unknown as DocData);
        }
    }

    // -----------------------------------------------------------------------
    // Search
    // -----------------------------------------------------------------------

    search(query: string): SearchResults {
        const normalize = <T extends {id: string; url?: string}>(
            raw: ReturnType<FlexDocument['search']>
        ): T[] => {
            const seen = new Set<string>();
            const results: T[] = [];
            for (const bucket of raw as Array<{result: Array<{id: string; doc: T}>}>) {
                for (const item of bucket.result) {
                    if (!seen.has(item.id)) {
                        seen.add(item.id);
                        results.push(item.doc);
                    }
                }
            }
            return results;
        };

        const rawPosts = this.postsIndex.search(query, {enrich: true});
        const rawAuthors = this.authorsIndex.search(query, {enrich: true});
        const rawTags = this.tagsIndex.search(query, {enrich: true});

        const posts = normalize<PostRecord>(rawPosts as ReturnType<FlexDocument['search']>);
        const authors = normalize<AuthorRecord>(rawAuthors as ReturnType<FlexDocument['search']>).filter(
            a => !a.url || !INVALID_URL_RE.test(a.url)
        );
        const tags = normalize<TagRecord>(rawTags as ReturnType<FlexDocument['search']>).filter(
            t => !t.url || !INVALID_URL_RE.test(t.url)
        );

        return {posts, authors, tags};
    }
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export type IndexState = 'idle' | 'loading' | 'ready';

export interface UseSearchReturn {
    indexState: IndexState;
    results: SearchResults | null;
    query: string;
    setQuery: (q: string) => void;
}

/**
 * Cache built indexes by `${apiUrl}|${apiKey}|${dir}`. The modal-service
 * remounts SearchModal on every open (the iframe is destroyed/recreated),
 * so without this cache we'd refetch all three search-index endpoints
 * every time the user re-opens the modal — sodo-search avoids that by
 * keeping the index in a single long-lived component. We mirror that here
 * at the module level.
 */
const indexCache = new Map<string, {index: SearchIndex; ready: Promise<void>}>();

function getOrBuildIndex(apiUrl: string, apiKey: string, dir: Direction): {index: SearchIndex; ready: Promise<void>} {
    const key = `${apiUrl}|${apiKey}|${dir}`;
    const cached = indexCache.get(key);
    if (cached) return cached;
    const index = new SearchIndex(apiUrl, apiKey, dir);
    const ready = index.init().catch((err: unknown) => {
        logError('search index init failed', err);
        // Drop from cache on failure so the next open retries.
        indexCache.delete(key);
        // Resolve so callers don't get stuck in 'loading' forever.
    });
    const entry = {index, ready};
    indexCache.set(key, entry);
    return entry;
}

export function useSearch(apiUrl: string, apiKey: string, dir: Direction = 'ltr'): UseSearchReturn {
    const indexRef = useRef<SearchIndex | null>(null);
    const [indexState, setIndexState] = useState<IndexState>('idle');
    const [query, setQueryRaw] = useState('');
    const [results, setResults] = useState<SearchResults | null>(null);

    // Reuse a cached index for this (apiUrl, apiKey, dir) tuple if it exists;
    // otherwise build + populate one now.
    useEffect(() => {
        let cancelled = false;
        const {index, ready} = getOrBuildIndex(apiUrl, apiKey, dir);
        indexRef.current = index;
        setIndexState('loading');
        ready.then(() => {
            if (!cancelled) setIndexState('ready');
        });
        return () => {
            cancelled = true;
        };
    }, [apiUrl, apiKey, dir]);

    // Re-run search whenever query or index state changes.
    useEffect(() => {
        if (indexState !== 'ready' || !query || !indexRef.current) {
            setResults(null);
            return;
        }
        setResults(indexRef.current.search(query));
    }, [query, indexState]);

    const setQuery = useCallback((q: string) => {
        setQueryRaw(q);
    }, []);

    return {indexState, results, query, setQuery};
}
