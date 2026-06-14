const logging = require('@tryghost/logging');
const {extractMediaUrls, TRANSFORM_READY_MARKER} = require('./media-url-extractor');

// Columns that can hold site-hosted media, either as a single URL
// (feature_image, og_image, twitter_image) or embedded in content
// (lexical, mobiledoc). `posts` holds both posts and pages; the `type` column
// distinguishes them.
//
// `posts.html` is intentionally excluded: it is rendered from lexical/mobiledoc,
// so its media is already captured, and it is the largest column to scan.
//
// This is deliberately the posts-only set for the first milestone. Other
// sources (snippets, users, tags, newsletters, settings) can be added as extra
// entries following the same shape without changing the aggregation below.
const POST_MEDIA_COLUMNS = [
    'posts.feature_image',
    'posts.lexical',
    'posts.mobiledoc',
    'posts_meta.og_image',
    'posts_meta.twitter_image'
];

// Where in a resource a media item is used. lexical and mobiledoc are both the
// post body, so they collapse to one field; every other column keeps its name.
const FIELD_LABELS = {
    lexical: 'body',
    mobiledoc: 'body'
};

class MediaInventoryService {
    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex
     * @param {object} deps.urlUtils - the shared urlUtils singleton
     */
    constructor({knex, urlUtils}) {
        this.knex = knex;
        this.urlUtils = urlUtils;
    }

    /** @returns {{image: string, media: string, file: string}} */
    getPrefixes() {
        return {
            image: this.urlUtils.STATIC_IMAGE_URL_PREFIX,
            media: this.urlUtils.STATIC_MEDIA_URL_PREFIX,
            file: this.urlUtils.STATIC_FILES_URL_PREFIX
        };
    }

    /**
     * Returns the distinct site-hosted media currently referenced across posts
     * and pages, each with the resources that use it.
     *
     * This reads references straight from the database content, never from the
     * storage backend, so it behaves identically for local-disk and cloud
     * (Ghost Pro) storage. URLs are converted to absolute on the way out, which
     * resolves correctly to the site URL or the configured image CDN base.
     *
     * @param {object} [options]
     * @param {'image'|'media'|'file'} [options.type] - restrict to one media type
     * @param {number} [options.limit] - cap the number of returned items
     * @param {string} [options.authorId] - scope to posts authored by this user
     *   (non-elevated roles); omit to scan every post (elevated roles)
     * @returns {Promise<{data: Array, meta: object}>}
     */
    async getInUseMedia(options = {}) {
        const prefixes = this.getPrefixes();
        const rows = await this.fetchPostsWithMedia(prefixes, options.authorId);

        const byUrl = new Map();

        for (const row of rows) {
            const resourceType = row.type === 'page' ? 'page' : 'post';
            const resourceKey = `${resourceType}:${row.id}`;

            for (const column of POST_MEDIA_COLUMNS) {
                const field = column.split('.')[1];
                const fieldLabel = FIELD_LABELS[field] || field;
                const refs = extractMediaUrls(row[field], prefixes);

                for (const ref of refs) {
                    let entry = byUrl.get(ref.url);
                    if (!entry) {
                        entry = {
                            transformReadyUrl: ref.url,
                            type: ref.type,
                            filename: ref.filename,
                            usageByResource: new Map(),
                            used_in: []
                        };
                        byUrl.set(ref.url, entry);
                    }

                    let usage = entry.usageByResource.get(resourceKey);
                    if (!usage) {
                        usage = {
                            type: resourceType,
                            id: row.id,
                            title: row.title,
                            status: row.status,
                            fields: new Set()
                        };
                        entry.usageByResource.set(resourceKey, usage);
                        entry.used_in.push(usage);
                    }
                    usage.fields.add(fieldLabel);
                }
            }
        }

        // Resolve each reference to an absolute URL. One malformed reference must
        // not take down the whole library, so a failed entry is logged and skipped.
        let media = [];
        for (const entry of byUrl.values()) {
            try {
                media.push({
                    url: this.urlUtils.transformReadyToAbsolute(entry.transformReadyUrl),
                    type: entry.type,
                    filename: entry.filename,
                    count: entry.used_in.length,
                    used_in: entry.used_in.map(usage => ({
                        type: usage.type,
                        id: usage.id,
                        title: usage.title,
                        status: usage.status,
                        fields: [...usage.fields]
                    }))
                });
            } catch (err) {
                logging.warn(`[MediaInventory] skipped unresolvable media reference ${entry.transformReadyUrl}: ${err.message}`);
            }
        }

        // The controller validates `type` against the allowed values.
        if (options.type) {
            media = media.filter(item => item.type === options.type);
        }

        // Most-used first, then alphabetical for a stable order.
        media.sort((a, b) => b.count - a.count || a.filename.localeCompare(b.filename));

        const total = media.length;
        const limit = Number.parseInt(String(options.limit ?? ''), 10);
        if (Number.isFinite(limit) && limit > 0) {
            media = media.slice(0, limit);
        }

        return {
            data: media,
            meta: {
                count: total
            }
        };
    }

    /**
     * Fetches posts/pages that reference at least one site-hosted media URL.
     * The LIKE prefilter only narrows the row set; precise matching happens in
     * the extractor, so an over-broad prefilter is harmless.
     *
     * When `authorId` is given, the scan is restricted to posts that user
     * authors. Scoping the query (rather than filtering the result) means the
     * aggregated `count` and `used_in` are correct for that user automatically,
     * and no other author's titles or statuses can leak.
     *
     * @param {{image: string, media: string, file: string}} prefixes
     * @param {string} [authorId] - restrict to posts authored by this user
     * @returns {Promise<Array>}
     */
    fetchPostsWithMedia(prefixes, authorId) {
        const likePatterns = [prefixes.image, prefixes.media, prefixes.file]
            .map(prefix => `%${TRANSFORM_READY_MARKER}/${prefix}/%`);

        const query = this.knex
            .select(
                'posts.id',
                'posts.title',
                'posts.status',
                'posts.type',
                'posts.feature_image',
                'posts.lexical',
                'posts.mobiledoc',
                'posts_meta.og_image',
                'posts_meta.twitter_image'
            )
            .from('posts')
            .leftJoin('posts_meta', 'posts.id', 'posts_meta.post_id')
            .where((builder) => {
                for (const column of POST_MEDIA_COLUMNS) {
                    for (const pattern of likePatterns) {
                        builder.orWhere(column, 'like', pattern);
                    }
                }
            });

        if (authorId) {
            query.whereIn('posts.id', this.knex
                .select('post_id')
                .from('posts_authors')
                .where('author_id', authorId));
        }

        return query;
    }
}

module.exports = MediaInventoryService;
