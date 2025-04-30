const logging = require('@tryghost/logging');

/**
 * Creates a configured Tinybird client
 * @param {object} deps - Configuration and request dependencies
 * @param {object} deps.config - Ghost configuration
 * @param {object} deps.request - HTTP request client
 * @returns {Object} Tinybird client with methods
 */
const create = ({config, request}) => {
    /**
     * Builds a Tinybird API request
     * @param {string} pipeName - The name of the Tinybird pipe to query
     * @param {Object} options - Request options in camelCase format
     * @param {string} [options.dateFrom] - Start date in YYYY-MM-DD format
     * @param {string} [options.dateTo] - End date in YYYY-MM-DD format
     * @param {string} [options.timezone] - Timezone for the query
     * @param {string} [options.memberStatus] - Member status filter (defaults to 'all')
     * @param {string} [options.tbVersion] - Tinybird version for API URL
     * @returns {Object} Object with URL and request options
     */
    const buildRequest = (pipeName, options = {}) => {
        const statsConfig = config.get('tinybird:stats');
        const localEnabled = statsConfig?.local?.enabled ?? false;
        const endpoint = localEnabled ? statsConfig.local.endpoint : statsConfig.endpoint;
        const token = localEnabled ? statsConfig.local.token : statsConfig.token;

        // Use tbVersion if provided for constructing the URL
        const pipeUrl = (options.tbVersion && !localEnabled) ? 
            `/v0/pipes/${pipeName}__v${options.tbVersion}.json` : 
            `/v0/pipes/${pipeName}.json`;
        
        const tinybirdUrl = `${endpoint}${pipeUrl}`;

        // Use snake_case for query parameters as expected by Tinybird API
        const searchParams = {
            site_uuid: statsConfig.id,
            date_from: options.dateFrom,
            date_to: options.dateTo,
            timezone: options.timezone || config.get('timezone'),
            member_status: options.memberStatus || 'all'
        };
        
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