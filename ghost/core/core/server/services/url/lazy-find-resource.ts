/**
 * DB lookup hook injected into `LazyUrlService.resolveUrl`: maps a router type
 * plus permalink params to a resource record (or `null`). Defined here, with
 * its factory, so the service depends on this module and not the reverse.
 */
export type FindResource = (
    routerType: string,
    params: Record<string, string>
) => Promise<Record<string, unknown> | null>;

interface BookshelfModel {
    findOne(query: Record<string, unknown>, options?: Record<string, unknown>): Promise<{toJSON(): Record<string, unknown>} | null>;
}

interface Models {
    Post: BookshelfModel;
    TagPublic: BookshelfModel;
    Author: BookshelfModel;
}

// Posts and pages share `models.Post`, so `/:slug/` needs the type to
// disambiguate; scoped to published, matching the eager resourceConfig.
const POST_SCOPE = {type: 'post', status: 'published'};
const PAGE_SCOPE = {type: 'page', status: 'published'};

// Only posts need relations: collection routers can filter on tag:/author:,
// so resolveUrl re-checks those against the record (HKG-1738). Pages come only
// from the filterless, /:slug/ StaticPagesRouter, so loading them is wasted work.
const POST_RELATIONS = ['tags', 'authors'];

// Routing-relevant post columns only — mirrors the eager resourceConfig's
// kept set (services/url/config.js) by dropping the heavy long-text bodies
// (mobiledoc/lexical/html/plaintext) and unused meta, so a reverse lookup stays
// a light query instead of pulling whole post bodies on demand.
const POST_COLUMNS = [
    'id', 'uuid', 'slug', 'feature_image', 'featured', 'type', 'visibility',
    'created_at', 'updated_at', 'published_at', 'published_by', 'canonical_url'
];

// Post.toJSON only computes primary_tag when no `columns` projection is
// requested, and never computes primary_author. We request columns (for the
// query above) so derive both here, mirroring the eager resourceConfig's
// withRelatedPrimary: primary_tag is the first tag but only when it's public
// (else null, matching Post.toJSON), and primary_author is the first author.
// /:primary_tag/ and /:primary_author/ permalinks plus primary_*: filters
// depend on them.
function attachPrimaryRelations(record: Record<string, unknown>): Record<string, unknown> {
    const tags = record.tags as Array<{visibility?: string}> | undefined;
    if (Array.isArray(tags)) {
        record.primary_tag = tags[0] && tags[0].visibility === 'public' ? tags[0] : null;
    }
    const authors = record.authors as unknown[] | undefined;
    if (Array.isArray(authors)) {
        record.primary_author = authors[0] ?? null;
    }
    return record;
}

/**
 * Builds the per-request DB lookup hook. Mirrors the eager service's
 * visibility rules so a guessed slug can't surface anything the eager path
 * hid: posts/pages are published-only, and tags/authors use the public scoped
 * models (`TagPublic`/`Author`) whose `shouldHavePosts` gate hides empty
 * tags and staff users. Unknown types resolve to `null`.
 */
export function createFindResource(models: Models): FindResource {
    const loadOne = async (
        Model: BookshelfModel,
        query: Record<string, unknown>,
        options: Record<string, unknown> = {}
    ): Promise<Record<string, unknown> | null> => {
        const result = await Model.findOne(query, {...options, require: false});
        return result ? attachPrimaryRelations(result.toJSON()) : null;
    };

    return (type: string, query: Record<string, string>): Promise<Record<string, unknown> | null> => {
        switch (type) {
        case 'posts':
            return loadOne(models.Post, {...query, ...POST_SCOPE}, {columns: POST_COLUMNS, withRelated: POST_RELATIONS});
        case 'pages':
            return loadOne(models.Post, {...query, ...PAGE_SCOPE}, {columns: POST_COLUMNS});
        case 'tags':
            return loadOne(models.TagPublic, {...query, visibility: 'public'});
        case 'authors':
            return loadOne(models.Author, {...query, visibility: 'public'});
        default:
            return Promise.resolve(null);
        }
    };
}

module.exports = {createFindResource};
module.exports.createFindResource = createFindResource;
