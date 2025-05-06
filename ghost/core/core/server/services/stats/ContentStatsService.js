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
     * @param {string} [options.tb_version] - Tinybird version for API URL
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
            const enrichedData = await this.enrichTopContentData(rawData);

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
            tbVersion: options.tb_version
        };

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
     * @returns {Promise<Object>} Map of UUID to title
     */
    async lookupPostTitles(uuids) {
        if (!uuids.length) {
            return {};
        }

        const posts = await this.knex.select('uuid', 'title', 'id')
            .from('posts')
            .whereIn('uuid', uuids);

        return posts.reduce((map, post) => {
            map[post.uuid] = {
                title: post.title,
                id: post.id
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
     * Enrich top pages data with titles
     * @param {Array<TopContentDataItem>} data - Raw page data
     * @returns {Promise<Array<TopContentDataItem>>} Enriched page data
     */
    async enrichTopContentData(data) {
        if (!data || !data.length) {
            return [];
        }

        // Extract post UUIDs and lookup titles
        const postUuids = this.extractPostUuids(data);
        const titleMap = await this.lookupPostTitles(postUuids);

        // Enrich the data with post titles or UrlService lookups
        return Promise.all(data.map(async (item) => {
            // Check if post_uuid is available directly
            if (item.post_uuid && titleMap[item.post_uuid]) {
                return {
                    ...item,
                    title: titleMap[item.post_uuid].title,
                    post_id: titleMap[item.post_uuid].id
                };
            }

            // Use UrlService for pages without post_uuid
            const resourceInfo = this.getResourceTitle(item.pathname);
            if (resourceInfo) {
                return {
                    ...item,
                    title: resourceInfo.title,
                    resourceType: resourceInfo.resourceType
                };
            }

            // Otherwise fallback to pathname (removing leading/trailing slashes)
            const formattedPath = item.pathname.replace(/^\/|\/$/g, '') || 'Home';
            return {
                ...item,
                title: formattedPath
            };
        }));
    }
}

module.exports = ContentStatsService;
