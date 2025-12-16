const logging = require('@tryghost/logging');

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

        let query = this.knex.select('uuid', 'title', 'id', 'type')
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
                type: post.type
            };
            return map;
        }, {});
    }

    /**
     * Get resource title using UrlService
     * @param {string} pathname - Path to look up
     * @returns {Object|null} Resource title and type, or null if not found
     */
    getResourceTitle(pathname) {
        if (!this.urlService) {
            return null;
        }

        try {
            const resource = this.urlService.getResource(pathname);

            if (resource && resource.data) {
                if (resource.data.title) {
                    return {
                        title: resource.data.title,
                        resourceType: resource.data.type
                    };
                } else if (resource.data.name) {
                    // For authors, tags, etc.
                    return {
                        title: resource.data.name,
                        resourceType: resource.data.type
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
                    if (this.urlService.hasFinished && this.urlService.hasFinished()) {
                        const resource = this.urlService.getResource(item.pathname);
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
                return {
                    ...item,
                    title: titleMap[item.post_uuid].title,
                    post_id: titleMap[item.post_uuid].id,
                    post_type: titleMap[item.post_uuid].type,
                    url_exists: urlExists
                };
            }

            // Use UrlService for pages without post_uuid
            const resourceInfo = this.getResourceTitle(item.pathname);
            if (resourceInfo) {
                return {
                    ...item,
                    title: resourceInfo.title,
                    resourceType: resourceInfo.resourceType,
                    post_type: null,
                    url_exists: urlExists
                };
            }

            // Otherwise fallback to pathname (removing leading/trailing slashes)
            const formattedPath = item.pathname.replace(/^\/|\/$/g, '') || 'Homepage';
            return {
                ...item,
                title: formattedPath,
                post_type: null,
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
