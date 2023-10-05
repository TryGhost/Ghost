const cheerio = require('cheerio');
const logging = require('@tryghost/logging');

module.exports = class MentionDiscoveryService {
    #externalRequest;

    constructor({externalRequest}) {
        this.#externalRequest = externalRequest;
    }

    /**
     * Fetches the given URL to identify the webmention endpoint
     * @param {URL} url
     * @returns {Promise<URL|null>}
     */
    async getEndpoint(url) {
        try {
            const response = await this.#externalRequest(url.href, {
                throwHttpErrors: true,
                followRedirect: true,
                maxRedirects: 10,
                timeout: 15000,
                retry: {
                    // Only retry on network issues, or specific HTTP status codes
                    limit: 3
                }
            });
            return this.getEndpointFromResponse(response);
        } catch (error) {
            logging.error(`Error fetching ${url.href} to discover webmention endpoint`, error);
            return null;
        }
    }

    /**
     * @private
     * Parses the given response for the first webmention endpoint
     * @param {Object} response
     * @returns {Promise<URL|null>}
     */
    async getEndpointFromResponse(response) {
        let href;
        let endpoint;
        // Link: <uri-reference>; param1=value1; param2="value2"
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link
        const linkHeader = response.headers.link;
        if (linkHeader && linkHeader.includes('rel="webmention"')) {
            linkHeader.split(',').forEach((p) => {
                if (p.includes('rel="webmention"')) {
                    href = p.substring(p.indexOf('<') + 1, p.indexOf('>'));
                    endpoint = new URL(href);
                    return;
                }
            });
        }
        if (endpoint) {
            return endpoint;
        }

        // must be html to find links/tags
        if (!response.headers['content-type'].includes('text/html')) {
            return null;
        }

        const $ = cheerio.load(response.body);

        // must be first <link> OR <a> element with rel=webmention
        href = $('a[rel="webmention"],link[rel="webmention"]').first().attr('href');

        endpoint = href ? new URL(href) : null;
        return endpoint;
    }
};
