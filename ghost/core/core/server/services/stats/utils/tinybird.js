const logging = require('@tryghost/logging');

/**
 * Creates a configured Tinybird client
 * @param {object} deps - Configuration and request dependencies
 * @param {object} deps.config - Ghost configuration
 * @param {object} deps.request - HTTP request client
 * @param {object} deps.settingsCache - Settings cache client
 * @param {object} deps.tinybirdService - Tinybird service client
 * @returns {Object} Tinybird client with methods
 */
const create = ({config, request, settingsCache, tinybirdService}) => {
    /**
     * Builds a Tinybird API request
     * @param {string} pipeName - The name of the Tinybird pipe to query
     * @param {Object} options - Request options in camelCase format
     * @param {string} [options.dateFrom] - Start date in YYYY-MM-DD format
     * @param {string} [options.dateTo] - End date in YYYY-MM-DD format
     * @param {string} [options.timezone] - Timezone for the query
     * @param {string} [options.memberStatus] - Member status filter (defaults to 'all')
     * @param {string} [options.postType] - Post type filter
     * @returns {Object} Object with URL and request options
     */
    const buildRequest = (pipeName, options = {}) => {
        const statsConfig = config.get('tinybird:stats');
        // Use tinybird:stats:id if provided, otherwise use site_uuid from settings cache
        // Allows overriding site_uuid via config
        // This is temporary until we have a proper way to use mock data locally
        const siteUuid = statsConfig.id || settingsCache.get('site_uuid');
        const localEnabled = statsConfig?.local?.enabled ?? false;
        const endpoint = localEnabled ? statsConfig.local.endpoint : statsConfig.endpoint;
        const tokenData = tinybirdService.getToken();
        const token = tokenData?.token;

        // Use version from config if provided for constructing the URL
        // Pattern: api_kpis -> api_kpis_v2 (single underscore + version)
        const version = statsConfig?.version;
        const pipeUrl = version ?
            `/v0/pipes/${pipeName}_${version}.json` :
            `/v0/pipes/${pipeName}.json`;
        
        const tinybirdUrl = `${endpoint}${pipeUrl}`;

        // Use snake_case for query parameters as expected by Tinybird API
        const searchParams = {
            site_uuid: siteUuid
        };

        // todo: refactor all uses to simply pass options through
        if (options.dateFrom) {
            searchParams.date_from = options.dateFrom;
        }
        if (options.dateTo) {
            searchParams.date_to = options.dateTo;
        }
        if (options.timezone) {
            searchParams.timezone = options.timezone;
        }
        if (options.memberStatus) {
            searchParams.member_status = options.memberStatus;
        }
        if (options.postType) {
            searchParams.post_type = options.postType;
        }
        // Add any other options that might be needed
        Object.entries(options).forEach(([key, value]) => {
            if (!['dateFrom', 'dateTo', 'timezone', 'memberStatus', 'postType'].includes(key) && value !== undefined && value !== null) {
                // Convert camelCase to snake_case for Tinybird API
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                // Handle arrays by converting them to comma-separated strings for Tinybird
                if (Array.isArray(value)) {
                    searchParams[snakeKey] = value.join(',');
                } else {
                    searchParams[snakeKey] = value;
                }
            }
        });
        
        // Convert searchParams to query string and append to URL
        const queryString = new URLSearchParams(searchParams).toString();
        const fullUrl = `${tinybirdUrl}?${queryString}`;
        
        const requestOptions = {
            headers: {
                Authorization: `Bearer ${token}`
            },
            timeout: {
                request: 10000
            }
        };
        
        return {url: fullUrl, options: requestOptions};
    };

    /**
     * Parse response data from Tinybird
     * @param {Object|string} response - Response from Tinybird API
     * @returns {Array|null} Parsed data array or null on error
     */
    const parseResponse = (response) => {
        let responseData;
        
        if (response.body) {
            if (typeof response.body === 'string') {
                try {
                    responseData = JSON.parse(response.body);
                } catch (e) {
                    logging.error(`Error parsing response body: ${e.message}`);
                    return null;
                }
            } else {
                responseData = response.body;
            }
        } else if (typeof response === 'string') {
            try {
                responseData = JSON.parse(response);
            } catch (e) {
                logging.error(`Error parsing response string: ${e.message}`);
                return null;
            }
        } else {
            responseData = response;
        }

        if (!responseData || !responseData.data) {
            return null;
        }
        
        return responseData.data;
    };

    /**
     * Fetch data from a Tinybird pipe
     * @param {string} pipeName - The name of the Tinybird pipe to query
     * @param {Object} options - Request options
     * @returns {Promise<Array|null>} Parsed data array or null on error
     */
    const fetch = async (pipeName, options = {}) => {
        const {url, options: requestOptions} = buildRequest(pipeName, options);
        
        try {
            const response = await request.get(url, requestOptions);
            return parseResponse(response);
        } catch (error) {
            logging.error(`Error in Tinybird API request to ${url}:`, error);
            return null;
        }
    };

    return {
        buildRequest,
        parseResponse,
        fetch
    };
};

module.exports = {
    create
}; 