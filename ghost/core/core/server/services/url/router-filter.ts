/* eslint-disable @typescript-eslint/no-require-imports */
const nql = require('@tryghost/nql');
const debug = require('@tryghost/debug')('services:url:router-filter');
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * NQL routing-filter semantics for the lazy URL service.
 *
 * The expansions and `page:` transformer mirror the eager UrlGenerator's so
 * lazy output matches the eager baseline during the shadow-comparison window.
 * It's a deliberate copy, not a shared module: eager is the comparison oracle
 * (removed in HKG-1824) and is left untouched, so a shared bug can't hide
 * identical wrong output on both sides.
 */

// Rewrites routes.yaml shorthand (`tag:foo`, `author:jane`) to relation paths.
export const EXPANSIONS = [
    {key: 'author', replacement: 'authors.slug'},
    {key: 'tags', replacement: 'tags.slug'},
    {key: 'tag', replacement: 'tags.slug'},
    {key: 'authors', replacement: 'authors.slug'},
    {key: 'primary_tag', replacement: 'primary_tag.slug'},
    {key: 'primary_author', replacement: 'primary_author.slug'}
];

// Legacy `page:true/false` → `type:page/post`, matched against the singular
// DB `type` column, so callers must keep that field intact.
const PAGE_TRANSFORMER = nql.utils.mapKeyValues({
    key: {from: 'page', to: 'type'},
    values: [
        {from: false, to: 'post'},
        {from: true, to: 'page'}
    ]
});

// Accepts both singular DB types ('post') and plural router keys ('posts'),
// since migrated callers pass either.
const TYPE_TO_ROUTER_TYPE: Record<string, string> = {
    post: 'posts',
    posts: 'posts',
    page: 'pages',
    pages: 'pages',
    tag: 'tags',
    tags: 'tags',
    author: 'authors',
    authors: 'authors'
};

export interface CompiledFilter {
    queryJSON(record: Record<string, unknown>): unknown;
}

// Resolves a resource's `type` to the plural router type, or null if unknown.
export function routerTypeOf(resource: {type?: string} | null | undefined): string | null {
    if (!resource || !resource.type) {
        return null;
    }
    return TYPE_TO_ROUTER_TYPE[resource.type] || null;
}

// Compiles a filter string into an NQL matcher; null filter = match-all.
export function buildFilter(filter: string | null | undefined): CompiledFilter | null {
    if (!filter) {
        return null;
    }
    return nql(filter, {expansions: EXPANSIONS, transformer: PAGE_TRANSFORMER});
}

// Evaluates a compiled filter against a record. Null filter always matches; a
// filter that throws (e.g. a thin record missing a referenced relation) is a
// non-match, not an error.
export function filterMatches(compiledFilter: CompiledFilter | null, record: Record<string, unknown>): boolean {
    if (!compiledFilter) {
        return true;
    }
    try {
        return !!compiledFilter.queryJSON(record);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        debug('NQL match failed', message);
        return false;
    }
}

module.exports = {EXPANSIONS, routerTypeOf, buildFilter, filterMatches};
module.exports.EXPANSIONS = EXPANSIONS;
module.exports.routerTypeOf = routerTypeOf;
module.exports.buildFilter = buildFilter;
module.exports.filterMatches = filterMatches;
