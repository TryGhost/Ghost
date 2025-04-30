const logging = require('@tryghost/logging');

class TopPagesStatsService {
    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex
     * @param {object} deps.urlService - Ghost URL service for resource lookups
     */
    constructor(deps) {
        this.knex = deps.knex;
        this.urlService = deps.urlService;
    }

    /**
     * Fetches top pages data from Tinybird and enriches it with post titles from the database
     * @param {Object} options
     * @param {string} [options.siteUuid] - The site UUID 
     * @param {string} [options.dateFrom] - Start date in YYYY-MM-DD format
     * @param {string} [options.dateTo] - End date in YYYY-MM-DD format
     * @param {string} [options.timezone] - Timezone for the query
     * @param {string} [options.memberStatus] - Member status filter
     * @param {string} [options.tbVersion] - Tinybird version for API URL
     * @returns {Promise<Object>} The enriched top pages data
     */
    async getTopPages(options = {}) {
        // First fetch data from Tinybird
        const config = require('../../../shared/config');
        const externalRequest = require('../../lib/request-external');
        
        const statsConfig = config.get('tinybird:stats');
        const localEnabled = statsConfig?.local?.enabled ?? false;
        const endpoint = localEnabled ? statsConfig.local.endpoint : statsConfig.endpoint;
        const token = localEnabled ? statsConfig.local.token : statsConfig.token;

        // Use tbVersion if provided for constructing the URL
        const pipeUrl = (options.tbVersion && !localEnabled) ? 
            `/v0/pipes/api_top_pages__v${options.tbVersion}.json` : 
            `/v0/pipes/api_top_pages.json`;
        
        const tinybirdUrl = `${endpoint}${pipeUrl}`;

        const searchParams = {
            site_uuid: options.siteUuid || statsConfig.id,
            date_from: options.dateFrom,
            date_to: options.dateTo,
            timezone: options.timezone,
            member_status: options.memberStatus || 'all'
        };
        
        try {
            // Convert searchParams to query string and append to URL
            const queryString = new URLSearchParams(searchParams).toString();
            const fullUrl = `${tinybirdUrl}?${queryString}`;
            
            const response = await externalRequest.get(fullUrl, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                timeout: {
                    request: 10000
                }
            });

            // The response might be already parsed JSON or a string that needs parsing
            let responseData;
            
            if (response.body) {
                if (typeof response.body === 'string') {
                    try {
                        responseData = JSON.parse(response.body);
                    } catch (e) {
                        logging.error(`Error parsing response body: ${e.message}`);
                        responseData = {data: []};
                    }
                } else {
                    responseData = response.body;
                }
            } else if (typeof response === 'string') {
                try {
                    responseData = JSON.parse(response);
                } catch (e) {
                    logging.error(`Error parsing response string: ${e.message}`);
                    responseData = {data: []};
                }
            } else {
                responseData = response;
            }

            if (!responseData || !responseData.data || !responseData.data.length) {
                return {data: []};
            }

            // Extract post UUIDs from the data
            const postUuids = responseData.data
                .map((item) => {
                    // Check if post_uuid exists and isn't empty
                    if (item.post_uuid && item.post_uuid.trim() !== '') {
                        return item.post_uuid;
                    }
                    // Otherwise try extracting from pathname
                    const match = item.pathname.match(/\/p\/([a-f0-9-]+)\/|\/([a-f0-9-]+)\//);
                    return match ? (match[1] || match[2]) : null;
                })
                .filter(Boolean);

            if (!postUuids.length) {
                return {data: responseData.data};
            }

            // Lookup post titles in the database
            const posts = await this.knex.select('uuid', 'title')
                .from('posts')
                .whereIn('uuid', postUuids);

            // Create a map of UUID to title
            const titleMap = posts.reduce((map, post) => {
                map[post.uuid] = post.title;
                return map;
            }, {});

            // Enrich the data with post titles or UrlService lookups
            let urlServiceLookups = 0;
            let urlServiceHits = 0;
            
            const enrichedData = await Promise.all(responseData.data.map(async (item) => {
                // First check if post_uuid is available directly
                if (item.post_uuid && titleMap[item.post_uuid]) {
                    return {
                        ...item,
                        title: titleMap[item.post_uuid]
                    };
                }
                
                // If not, try extracting from pathname
                const match = item.pathname.match(/\/p\/([a-f0-9-]+)\/|\/([a-f0-9-]+)\//);
                const uuid = match ? (match[1] || match[2]) : null;
                
                // If we have a UUID match in the database, use that title
                if (uuid && titleMap[uuid]) {
                    return {
                        ...item,
                        title: titleMap[uuid]
                    };
                }
                
                // Use UrlService for pages without post_uuid
                if (this.urlService) {
                    try {
                        urlServiceLookups = urlServiceLookups + 1;
                        const resource = this.urlService.getResource(item.pathname);
                        
                        if (resource) {
                            urlServiceHits = urlServiceHits + 1;
                            // Extract title from resource based on resource type
                            if (resource.data) {
                                if (resource.data.title) {
                                    return {
                                        ...item,
                                        title: resource.data.title,
                                        resourceType: resource.data.type
                                    };
                                } else if (resource.data.name) {
                                    // For authors, tags, etc.
                                    return {
                                        ...item,
                                        title: resource.data.name,
                                        resourceType: resource.data.type
                                    };
                                }
                            }
                        }
                    } catch (err) {
                        if (err.code !== 'URLSERVICE_NOT_READY') {
                            logging.warn(`Error looking up resource for ${item.pathname}: ${err.message}`);
                        }
                        // Continue with fallback if UrlService errors
                    }
                }
                
                // Otherwise fallback to pathname (removing leading/trailing slashes)
                const formattedPath = item.pathname.replace(/^\/|\/$/g, '') || 'Home';
                return {
                    ...item,
                    title: formattedPath
                };
            }));
            
            return {data: enrichedData};
        } catch (error) {
            logging.error('Error fetching top pages from Tinybird:');
            logging.error(error);
            return {data: []};
        }
    }
}

module.exports = TopPagesStatsService; 