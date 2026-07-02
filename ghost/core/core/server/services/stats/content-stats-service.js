const logging = require('@tryghost/logging');
const urlUtils = require('../../../shared/url-utils');

// Pre-migration the resourceType field on this service's response was the
// raw `data.type` column on the underlying record: 'post' / 'page' for
// posts and pages, undefined for tags / authors (those tables have no type
// column). Preserve that contract by only mapping the two singular types.
const ROUTER_TYPE_TO_SINGULAR = {
    posts: 'post',
    pages: 'page'
};

/**
 * @typedef {Object} TopContentDataItem
 * @property {string} pathname - Page path
 * @property {number} visits - Number of visits
 * @property {string} [post_uuid] - Associated post UUID if available
 * @property {string} [post_id] - Associated post ID if available
 * @property {string} [title] - Page title
 */

class ContentStatsService {
    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex - Database client
     * @param {object} deps.urlService - Ghost URL service for resource lookups
     * @param {object} [deps.tinybirdClient] - Configured Tinybird client
     */
    constructor(deps) {
        this.knex = deps.knex;
        this.urlService = deps.urlService;
        this.tinybirdClient = deps.tinybirdClient;
    }

    /**
     * Fetches top pages data from Tinybird and enriches it with post titles
     * @param {Object} options
     * @param {string} [options.date_from] - Start date in YYYY-MM-DD format
     * @param {string} [options.date_to] - End date in YYYY-MM-DD format
     * @param {string} [options.timezone] - Timezone for the query
     * @param {string} [options.member_status] - Member status filter (defaults to 'all')
     * @param {string} [options.post_type] - Post type filter ('post' or 'page')
     * @param {string} [options.post_uuid] - Post UUID filter
     * @param {string} [options.pathname] - Pathname filter (e.g. '/team')
     * @param {string} [options.device] - Device type filter (e.g. 'desktop', 'mobile-ios', 'mobile-android', 'bot')
     * @param {string} [options.location] - Location/country code filter (e.g. 'US')
     * @param {string} [options.source] - Source filter
     * @param {string} [options.gift_link] - Gift-link filter ('true' = used, 'false' = not used)
     * @param {string} [options.utm_source] - UTM source filter
     * @param {string} [options.utm_medium] - UTM medium filter
     * @param {string} [options.utm_campaign] - UTM campaign filter
     * @param {string} [options.utm_content] - UTM content filter
     * @param {string} [options.utm_term] - UTM term filter
     * @returns {Promise<Object>} The enriched top pages data
     */
    async getTopContent(options = {}) {
        try {
            // Check if Tinybird client is available
            if (!this.tinybirdClient) {
                return {data: []};
            }

            // Step 1: Get raw data from Tinybird
            const rawData = await this.fetchRawTopContentData(options);

            if (!rawData || !rawData.length) {
                return {data: []};
            }

            // Step 2: Enrich the data with titles
            const enrichedData = await this.enrichTopContentData(rawData, options.post_type);

            return {data: enrichedData};
        } catch (error) {
            logging.error('Error fetching top content:');
            logging.error(error);
            return {data: []};
        }
    }

    /**
     * Fetch raw top pages data from Tinybird
     * @param {Object} options - Query options with snake_case keys
     * @returns {Promise<Array<TopContentDataItem>|null>} Raw data or null on error
     */
    async fetchRawTopContentData(options = {}) {
        // Convert snake_case to camelCase for Tinybird
        const tinybirdOptions = {
            dateFrom: options.date_from,
            dateTo: options.date_to,
            timezone: options.timezone,
            memberStatus: options.member_status,
            postType: options.post_type
        };

        // Only add post_uuid if defined
        if (options.post_uuid) {
            tinybirdOptions.postUuid = options.post_uuid;
        }

        // Only add pathname if defined
        if (options.pathname) {
            tinybirdOptions.pathname = options.pathname;
        }

        // Only add device if defined
        if (options.device) {
            tinybirdOptions.device = options.device;
        }

        // Only add location if defined
        if (options.location) {
            tinybirdOptions.location = options.location;
        }

        // Only add source if defined (allow empty string for "Direct" traffic)
        if (options.source !== undefined) {
            tinybirdOptions.source = options.source;
        }

        // Add gift_link when defined ('false'/'0' are meaningful, so check !== undefined)
        if (options.gift_link !== undefined) {
            tinybirdOptions.giftLink = options.gift_link;
        }

        // Only add UTM parameters if they are defined (not undefined/null)
        if (options.utm_source) {
            tinybirdOptions.utmSource = options.utm_source;
        }
        if (options.utm_medium) {
            tinybirdOptions.utmMedium = options.utm_medium;
        }
        if (options.utm_campaign) {
            tinybirdOptions.utmCampaign = options.utm_campaign;
        }
        if (options.utm_content) {
            tinybirdOptions.utmContent = options.utm_content;
        }
        if (options.utm_term) {
            tinybirdOptions.utmTerm = options.utm_term;
        }

        return await this.tinybirdClient.fetch('api_top_pages', tinybirdOptions);
    }

    /**
     * Extract post UUIDs from page data (internal method)
     * @param {Array<TopContentDataItem>} data - Raw page data
     * @returns {Array<string>} Array of post UUIDs
     */
    extractPostUuids(data) {
        return data
            .map((item) => {
                // Only use explicit post_uuid property
                return (item.post_uuid && item.post_uuid.trim() !== '') ? item.post_uuid : null;
            })
            .filter(Boolean);
    }

    /**
     * Lookup post titles in the database
     * @param {Array<string>} uuids - Post UUIDs to look up
     * @param {string} [postType] - Optional post type filter ('post' or 'page')
     * @returns {Promise<Object>} Map of UUID to title
     */
    async lookupPostTitles(uuids, postType = null) {
        if (!uuids.length) {
            return {};
        }

        let query = this.knex.select('uuid', 'title', 'id', 'type', 'slug')
            .from('posts')
            .whereIn('uuid', uuids);

        // Apply post type filter if specified
        if (postType) {
            query = query.where('type', postType);
        }

        const posts = await query;

        return posts.reduce((map, post) => {
            map[post.uuid] = {
                title: post.title,
                id: post.id,
                type: post.type,
                slug: post.slug
            };
            return map;
        }, {});
    }

    /**
     * Resolve the absolute frontend URL for a posts-table resource via the URL service.
     * Returns null if the URL service can't resolve the resource (e.g. draft, no route).
     * @param {string} id - Posts table row id
     * @param {string} type - 'post' or 'page'
     * @returns {string|null}
     */
    resolveResourceUrl(id, type) {
        if (!this.urlService || !id || typeof this.urlService.getUrlByResourceId !== 'function') {
            return null;
        }
        try {
            const url = this.urlService.getUrlByResourceId(id, {absolute: true});
            if (!url || url.endsWith('/404/')) {
                return null;
            }
            return url;
        } catch (err) {
            if (err.code !== 'URLSERVICE_NOT_READY') {
                logging.warn(`Error resolving URL for ${type} ${id}: ${err.message}`);
            }
            return null;
        }
    }

    /**
     * Get resource title using UrlService
     * @param {string} pathname - Path to look up
     * @returns {Promise<Object|null>} Resource title, type, and id; or null if not found
     */
    async getResourceTitle(pathname) {
        if (!this.urlService) {
            return null;
        }

        try {
            let resource = await this.urlService.facade.resolveUrl(pathname);
            // Tinybird records the raw visited path which may lack a trailing
            // slash, while Ghost's canonical URLs end with one. Retry the
            // opposite form before giving up so we don't 404 valid pages.
            if (!resource && pathname && pathname !== '/') {
                const altPath = pathname.endsWith('/') ? pathname.slice(0, -1) : `${pathname}/`;
                resource = await this.urlService.facade.resolveUrl(altPath);
            }

            if (resource) {
                // resource.type is the routing-level plural form (posts/pages/tags/authors).
                // Keep singular/undefined here for backwards-compatibility with the previous
                // data.type semantics (post/page/undefined).
                const resourceType = ROUTER_TYPE_TO_SINGULAR[resource.type];
                if (resource.title) {
                    return {
                        title: resource.title,
                        resourceType,
                        id: resource.id
                    };
                } else if (resource.name) {
                    // For authors, tags, etc.
                    return {
                        title: resource.name,
                        resourceType,
                        id: resource.id
                    };
                }
            }
        } catch (err) {
            if (err.code !== 'URLSERVICE_NOT_READY') {
                logging.warn(`Error looking up resource for ${pathname}: ${err.message}`);
            }
        }

        return null;
    }

    /**
     * Build an absolute frontend URL for a known-good pathname using the site URL.
     * Used for routes that aren't a posts-table resource (e.g. the homepage).
     * @param {string} pathname
     * @returns {string|null}
     */
    buildAbsoluteUrl(pathname) {
        if (!pathname) {
            return null;
        }
        try {
            const siteUrl = urlUtils.urlFor('home', true);
            const cleanSite = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
            const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
            return `${cleanSite}${cleanPath}`;
        } catch (err) {
            return null;
        }
    }

    /**
     * Enrich top pages data with titles and URL existence validation
     * @param {Array<TopContentDataItem>} data - Raw page data
     * @param {string} [postType] - Optional post type filter ('post' or 'page')
     * @returns {Promise<Array<TopContentDataItem>>} Enriched page data
     */
    async enrichTopContentData(data, postType = null) {
        if (!data || !data.length) {
            return [];
        }

        // Extract post UUIDs and lookup titles
        const postUuids = this.extractPostUuids(data);
        const titleMap = await this.lookupPostTitles(postUuids, postType);

        // Enrich the data with post titles or UrlService lookups
        const enrichedData = await Promise.all(data.map(async (item) => {
            // Check URL existence using the URL service
            let urlExists = false;
            
            if (this.urlService && item.pathname) {
                try {
                    // Check if URL service is ready
                    if (this.urlService.facade.hasFinished && this.urlService.facade.hasFinished()) {
                        const resource = await this.urlService.facade.resolveUrl(item.pathname);
                        urlExists = !!resource; // Convert to boolean
                    }
                    // If URL service isn't ready, we default to true (clickable)
                } catch (error) {
                    // If there's an error checking the URL service, default to true
                    urlExists = true;
                }
            }

            // Check if post_uuid is available directly
            if (item.post_uuid && titleMap[item.post_uuid]) {
                const matched = titleMap[item.post_uuid];
                const resolvedUrl = this.resolveResourceUrl(matched.id, matched.type);
                return {
                    ...item,
                    title: matched.title,
                    post_id: matched.id,
                    post_type: matched.type,
                    url: resolvedUrl || undefined,
                    url_exists: urlExists
                };
            }

            // Use UrlService for pages without post_uuid
            const resourceInfo = await this.getResourceTitle(item.pathname);
            if (resourceInfo) {
                // For posts/pages we have a resource id, so we can resolve the
                // canonical URL via the URL service. For tags/authors we don't
                // surface a clickable URL — the click handler treats them as
                // non-actionable today.
                const resolvedUrl = (resourceInfo.resourceType === 'post' || resourceInfo.resourceType === 'page')
                    ? this.resolveResourceUrl(resourceInfo.id, resourceInfo.resourceType)
                    : null;
                return {
                    ...item,
                    title: resourceInfo.title,
                    resourceType: resourceInfo.resourceType,
                    post_id: resourceInfo.id,
                    post_type: resourceInfo.resourceType || null,
                    url: resolvedUrl || undefined,
                    url_exists: urlExists
                };
            }

            // Otherwise fallback to pathname (removing leading/trailing slashes).
            // For the homepage we can still build a clickable URL from the site URL.
            const formattedPath = item.pathname.replace(/^\/|\/$/g, '') || 'Homepage';
            const homepageUrl = item.pathname === '/' ? this.buildAbsoluteUrl('/') : undefined;
            return {
                ...item,
                title: formattedPath,
                post_type: null,
                url: homepageUrl,
                url_exists: urlExists
            };
        }));

        // Filter by post type if specified and the item has post_type information
        if (postType) {
            return enrichedData.filter((item) => {
                // Include items that have matching post_type
                if (item.post_type) {
                    return item.post_type === postType;
                }
                // For items without post_type (like homepage, tags, etc.), 
                // include them only if we're not filtering specifically for posts
                return postType !== 'post';
            });
        }

        return enrichedData;
    }
}

module.exports = ContentStatsService;
