const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

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
        
        // Use the correct request module
        const externalRequest = require('../../lib/request-external');
        
        const statsConfig = config.get('tinybird:stats');
        const localEnabled = statsConfig?.local?.enabled ?? false;
        const endpoint = localEnabled ? statsConfig.local.endpoint : statsConfig.endpoint;
        const token = localEnabled ? statsConfig.local.token : statsConfig.token;

        // Use tbVersion if provided for constructing the URL
        const pipeUrl = (options.tbVersion && !localEnabled) ? 
            `/v0/pipes/api_top_pages__v${options.tbVersion}.json` : 
            `/v0/pipes/api_top_pages.json`; // <-- this is the local / TBF endpoint
        
        const tinybirdUrl = `${endpoint}${pipeUrl}`;

        const searchParams = {
            site_uuid: options.siteUuid || statsConfig.id,
            date_from: options.dateFrom,
            date_to: options.dateTo,
            timezone: options.timezone,
            member_status: options.memberStatus || 'all'
        };

        logging.info(`Search params: ${JSON.stringify(searchParams)}`);
        logging.info('Tinybird URL:', tinybirdUrl);
        
        try {
            // Convert searchParams to query string and append to URL
            const queryString = new URLSearchParams(searchParams).toString();
            const fullUrl = `${tinybirdUrl}?${queryString}`;
            logging.info(`Full request URL: ${fullUrl}`);
            
            const response = await externalRequest.get(fullUrl, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                timeout: {
                    request: 10000
                }
            });

            // Debug the response structure
            logging.info(`Response type: ${typeof response}`);
            logging.info(`Response structure: ${JSON.stringify(Object.keys(response))}`);
            
            // The response might be already parsed JSON or a string that needs parsing
            let responseData;
            
            if (response.body) {
                logging.info(`Response body type: ${typeof response.body}`);
                
                if (typeof response.body === 'string') {
                    try {
                        responseData = JSON.parse(response.body);
                        logging.info('Successfully parsed response body from string');
                    } catch (e) {
                        logging.error(`Error parsing response body: ${e.message}`);
                        responseData = {data: []};
                    }
                } else {
                    responseData = response.body;
                    logging.info('Using response.body directly as it is not a string');
                }
                
                logging.info(`Response data keys: ${responseData ? JSON.stringify(Object.keys(responseData)) : 'no data'}`);
                if (responseData && responseData.data && responseData.data.length > 0) {
                    logging.info(`First data item sample: ${JSON.stringify(responseData.data[0])}`);
                }
            } else if (typeof response === 'string') {
                logging.info('Response is a string, attempting to parse');
                try {
                    responseData = JSON.parse(response);
                    logging.info('Successfully parsed response from string');
                } catch (e) {
                    logging.error(`Error parsing response string: ${e.message}`);
                    responseData = {data: []};
                }
            } else {
                logging.info('Using response directly');
                responseData = response;
            }

            if (!responseData || !responseData.data || !responseData.data.length) {
                logging.info('No data found in response');
                return {data: []};
            }

            // Extract post UUIDs from the data
            const postUuids = responseData.data
                .map((item) => {
                    // Check if post_uuid exists and isn't empty
                    if (item.post_uuid && item.post_uuid.trim() !== '') {
                        logging.info(`Found direct post_uuid: ${item.post_uuid} for path: ${item.pathname}`);
                        return item.post_uuid;
                    }
                    // Otherwise try extracting from pathname
                    const match = item.pathname.match(/\/p\/([a-f0-9-]+)\/|\/([a-f0-9-]+)\//);
                    const extractedUuid = match ? (match[1] || match[2]) : null;
                    if (extractedUuid) {
                        logging.info(`Extracted UUID: ${extractedUuid} from path: ${item.pathname}`);
                    } else {
                        logging.info(`Could not extract UUID from path: ${item.pathname}`);
                    }
                    return extractedUuid;
                })
                .filter(Boolean);

            if (!postUuids.length) {
                logging.info('No post UUIDs found in data');
                return {data: responseData.data};
            }

            logging.info(`Found ${postUuids.length} post UUIDs: ${JSON.stringify(postUuids)}`);

            // Lookup post titles in the database
            logging.info(`Looking up ${postUuids.length} UUIDs in the database`);
            const posts = await this.knex.select('uuid', 'title')
                .from('posts')
                .whereIn('uuid', postUuids);

            logging.info(`Posts found in database: ${posts.length}`);
            if (posts.length === 0) {
                logging.info('No matching posts found in the database');
            } else {
                logging.info(`Found ${posts.length} matching posts`);
                // Log all the found posts to debug matching issues
                posts.forEach((post) => {
                    logging.info(`Found post: UUID=${post.uuid}, Title=${post.title}`);
                });
            }

            // Create a map of UUID to title
            const titleMap = posts.reduce((map, post) => {
                map[post.uuid] = post.title;
                return map;
            }, {});

            logging.info('Title map created with keys:', Object.keys(titleMap));

            // Enrich the data with post titles or UrlService lookups
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
                        const resource = this.urlService.getResource(item.pathname);
                        if (resource) {
                            logging.info(`UrlService found resource for: ${item.pathname}`);
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
                        } else {
                            logging.info(`UrlService did not find resource for: ${item.pathname}`);
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

            logging.info('Data enriched with titles/pathnames, sample:', enrichedData[0]);

            return {data: enrichedData};
        } catch (error) {
            logging.error('Error fetching top pages from Tinybird:');
            logging.error(error);
            return {data: []};
        }
    }
}

module.exports = TopPagesStatsService; 